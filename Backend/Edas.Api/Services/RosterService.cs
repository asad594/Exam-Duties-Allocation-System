using Edas.Api.Data;
using Edas.Api.Dtos;
using Edas.Api.Hubs;
using Edas.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Edas.Api.Services;

public sealed class RosterService(AppDbContext db, IHubContext<NotificationHub> hub)
{
    public async Task<ChangeResult> Replace(int versionId, int assignmentId, int newStaffId, int actorId)
    {
        var version = await FindVersion(versionId);
        var target = await db.Assignments.SingleOrDefaultAsync(a => a.Id == assignmentId && a.RosterVersionId == versionId)
            ?? throw new NotFoundException($"Assignment {assignmentId} was not found in roster {versionId}.");
        await Validate(versionId, target, newStaffId);
        if (version.Status == RosterStatus.Draft) return await ReplaceInDraft(version, target, newStaffId, actorId);
        var copy = await ReplaceInNewVersion(version, target, newStaffId, actorId);
        await hub.Clients.Groups(NotificationHub.Group(target.StaffId), NotificationHub.Group(newStaffId)).SendAsync(
            nameof(DutiesRevised), new DutiesRevised(copy.VersionNo, target.SlotId, $"Published roster v{copy.VersionNo} changed your duties."));
        return new ChangeResult(copy.Id, copy.VersionNo);
    }

    private async Task Validate(int versionId, Assignment target, int newStaffId)
    {
        var staff = await db.Staff.AsNoTracking().Where(s => s.Id == newStaffId && s.Role == Role.Staff)
            .Select(s => new StaffInfo(s.Id, s.MaxDuties)).SingleOrDefaultAsync()
            ?? throw new RuleException("The new staff member must be an existing user with role Staff.");
        if (await db.Assignments.AnyAsync(a => a.RosterVersionId == versionId && a.SlotId == target.SlotId && a.StaffId == newStaffId))
            throw new RuleException("The staff member is already assigned to this slot.");
        var duties = await db.Assignments.AsNoTracking()
            .Where(a => a.RosterVersionId == versionId && a.StaffId == newStaffId && a.Id != target.Id)
            .Select(a => new TimeBlock(a.Slot.ExamSession.Date, a.Slot.ExamSession.StartTime, a.Slot.ExamSession.EndTime)).ToListAsync();
        var unavailable = await db.Unavailabilities.AsNoTracking().Where(u => u.StaffId == newStaffId)
            .Select(u => new TimeBlock(u.Date, u.StartTime, u.EndTime)).ToListAsync();
        var slot = await db.Slots.AsNoTracking().Where(s => s.Id == target.SlotId)
            .Select(s => new TimeBlock(s.ExamSession.Date, s.ExamSession.StartTime, s.ExamSession.EndTime)).SingleAsync();
        var block = EligibilityService.Check(staff, slot, duties, unavailable);
        if (block != Block.None) throw new RuleException(EligibilityService.Describe(block));
    }

    private async Task<ChangeResult> ReplaceInDraft(RosterVersion version, Assignment target, int newStaffId, int actorId)
    {
        EnsureDraft(version);
        db.AuditLogs.Add(ReplaceAudit(version.Id, actorId, target, newStaffId));
        target.StaffId = newStaffId;
        await db.SaveChangesAsync();
        return new ChangeResult(version.Id, version.VersionNo);
    }

    // Published rows are never edited: the swap is applied to a full copy saved as version N+1.
    private async Task<RosterVersion> ReplaceInNewVersion(RosterVersion source, Assignment target, int newStaffId, int actorId)
    {
        if (await db.RosterVersions.AnyAsync(v => v.Status == RosterStatus.Published && v.VersionNo > source.VersionNo))
            throw new RuleException("Only the latest published roster can be changed.");
        await using var tx = await db.Database.BeginTransactionAsync();
        var now = DateTime.UtcNow;
        var copy = new RosterVersion { VersionNo = await NextVersionNo(), Status = RosterStatus.Published, CreatedById = actorId, CreatedAt = now, PublishedAt = now };
        db.RosterVersions.Add(copy);
        await db.SaveChangesAsync();
        db.Assignments.AddRange(await db.Assignments.AsNoTracking().Where(a => a.RosterVersionId == source.Id)
            .Select(a => new Assignment { RosterVersionId = copy.Id, SlotId = a.SlotId, StaffId = a.Id == target.Id ? newStaffId : a.StaffId }).ToListAsync());
        db.Vacancies.AddRange(await db.Vacancies.AsNoTracking().Where(v => v.RosterVersionId == source.Id)
            .Select(v => new Vacancy { RosterVersionId = copy.Id, SlotId = v.SlotId, Missing = v.Missing, UnavailableCount = v.UnavailableCount, BusyCount = v.BusyCount, AtLimitCount = v.AtLimitCount }).ToListAsync());
        db.AuditLogs.Add(ReplaceAudit(copy.Id, actorId, target, newStaffId));
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return copy;
    }

    private static AuditLog ReplaceAudit(int versionId, int actorId, Assignment target, int newStaffId) => new()
    {
        RosterVersionId = versionId, Action = AuditAction.Replace, ActorId = actorId,
        SlotId = target.SlotId, OldStaffId = target.StaffId, NewStaffId = newStaffId, At = DateTime.UtcNow
    };

    public async Task<PublishResult> Publish(int versionId, int actorId)
    {
        var version = EnsureDraft(await FindVersion(versionId));
        var now = DateTime.UtcNow;
        // A replacement may have created a newer published version, so the draft takes the next number when published.
        version.VersionNo = (await db.RosterVersions.Where(v => v.Id != version.Id).MaxAsync(v => (int?)v.VersionNo) ?? 0) + 1;
        (version.Status, version.PublishedAt) = (RosterStatus.Published, now);
        db.AuditLogs.Add(new AuditLog { RosterVersionId = version.Id, Action = AuditAction.Publish, ActorId = actorId, At = now });
        await db.SaveChangesAsync();
        return new PublishResult(version.Id, version.VersionNo, await db.Vacancies.CountAsync(v => v.RosterVersionId == version.Id));
    }

    private async Task<RosterVersion> FindVersion(int versionId) =>
        await db.RosterVersions.FindAsync(versionId) ?? throw new NotFoundException($"Roster {versionId} was not found.");

    public async Task<int> SaveDraft(int actorId, AllocationResult result)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        var draft = await ResetDraft(actorId);
        db.Assignments.AddRange(result.Assignments.Select(a =>
            new Assignment { RosterVersionId = draft.Id, SlotId = a.SlotId, StaffId = a.StaffId }));
        db.Vacancies.AddRange(result.Vacancies.Select(v => new Vacancy
        {
            RosterVersionId = draft.Id, SlotId = v.SlotId, Missing = v.Missing,
            UnavailableCount = v.Unavailable, BusyCount = v.Busy, AtLimitCount = v.AtLimit
        }));
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return draft.Id;
    }

    // Generate reuses the single draft row so audit entries that point at it stay valid.
    private async Task<RosterVersion> ResetDraft(int actorId)
    {
        var draft = await db.RosterVersions.SingleOrDefaultAsync(v => v.Status == RosterStatus.Draft);
        if (draft is null)
            db.RosterVersions.Add(draft = new RosterVersion { VersionNo = await NextVersionNo(), Status = RosterStatus.Draft });
        else
            await ClearRows(EnsureDraft(draft).Id);
        (draft.CreatedById, draft.CreatedAt) = (actorId, DateTime.UtcNow);
        await db.SaveChangesAsync();
        return draft;
    }

    private async Task ClearRows(int versionId)
    {
        await db.Assignments.Where(a => a.RosterVersionId == versionId).ExecuteDeleteAsync();
        await db.Vacancies.Where(v => v.RosterVersionId == versionId).ExecuteDeleteAsync();
    }

    private static RosterVersion EnsureDraft(RosterVersion version) =>
        version.Status == RosterStatus.Draft ? version : throw new RuleException("Only a draft roster can be changed.");

    private async Task<int> NextVersionNo() => (await db.RosterVersions.MaxAsync(v => (int?)v.VersionNo) ?? 0) + 1;
}
