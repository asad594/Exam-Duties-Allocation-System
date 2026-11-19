using Edas.Api.Data;
using Edas.Api.Dtos;
using Edas.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Edas.Api.Services;

public sealed class RosterQueryService(AppDbContext db)
{
    public Task<List<RosterVersionDto>> List() =>
        db.RosterVersions.AsNoTracking().OrderBy(v => v.VersionNo)
            .Select(v => new RosterVersionDto(v.Id, v.VersionNo, v.Status, v.CreatedAt, v.PublishedAt)).ToListAsync();

    public async Task<List<RosterRowDto>> View(int versionId, RosterFilter filter)
    {
        await EnsureExists(versionId);
        return await Rows(versionId, filter);
    }

    public async Task<List<RosterRowDto>> MyDuties(int staffId)
    {
        var latest = await db.RosterVersions.AsNoTracking().Where(v => v.Status == RosterStatus.Published)
            .OrderByDescending(v => v.VersionNo).Select(v => (int?)v.Id).FirstOrDefaultAsync();
        return latest is null ? [] : await Rows(latest.Value, new RosterFilter(staffId, null, null));
    }

    public async Task<List<WorkloadDto>> Workload(int versionId)
    {
        await EnsureExists(versionId);
        // One LEFT JOIN query; staff with no duties get an empty list.
        var staff = await db.Staff.AsNoTracking().Where(s => s.Role == Role.Staff).OrderBy(s => s.Name)
            .Select(s => new
            {
                s.Id, s.Name,
                Duties = db.Assignments.Where(a => a.RosterVersionId == versionId && a.StaffId == s.Id)
                    .Select(a => new { a.Slot.ExamSession.StartTime, a.Slot.ExamSession.EndTime }).ToList()
            }).ToListAsync();
        return staff.Select(s => new WorkloadDto(s.Id, s.Name, s.Duties.Count,
            Math.Round(s.Duties.Sum(d => (d.EndTime - d.StartTime).TotalHours), 2))).ToList();
    }

    public async Task<List<VacancyDto>> Vacancies(int versionId)
    {
        await EnsureExists(versionId);
        return await db.Vacancies.AsNoTracking().Where(v => v.RosterVersionId == versionId)
            .OrderBy(v => v.Slot.ExamSession.Date).ThenBy(v => v.Slot.ExamSession.StartTime).ThenBy(v => v.Slot.Room.Name)
            .Select(v => new VacancyDto(v.SlotId, v.Slot.ExamSession.Course.Code, v.Slot.Room.Name, v.Slot.ExamSession.Date,
                v.Slot.ExamSession.StartTime, v.Slot.ExamSession.EndTime, v.Missing, v.UnavailableCount, v.BusyCount, v.AtLimitCount))
            .ToListAsync();
    }

    public async Task<List<AuditDto>> Audit(int versionId)
    {
        await EnsureExists(versionId);
        return await db.AuditLogs.AsNoTracking().Where(l => l.RosterVersionId == versionId).OrderBy(l => l.At).ThenBy(l => l.Id)
            .Select(l => new AuditDto(l.Id, l.Action, l.Actor.Name, l.OldStaff!.Name, l.NewStaff!.Name, l.SlotId, l.At)).ToListAsync();
    }

    public async Task<string> Csv(int versionId, RosterFilter filter)
    {
        var lines = (await View(versionId, filter)).Select(r => string.Join(',', r.Date.ToString("yyyy-MM-dd"),
            r.StartTime.ToString("HH:mm"), r.EndTime.ToString("HH:mm"), Quote(r.CourseCode), Quote(r.Room), Quote(r.StaffName)));
        return string.Join('\n', lines.Prepend("Date,Start,End,Course,Room,Staff"));
    }

    private static string Quote(string value) => $"\"{value.Replace("\"", "\"\"")}\"";

    private Task<List<RosterRowDto>> Rows(int versionId, RosterFilter f) =>
        db.Assignments.AsNoTracking()
            .Where(a => a.RosterVersionId == versionId && (f.StaffId == null || a.StaffId == f.StaffId)
                && (f.Date == null || a.Slot.ExamSession.Date == f.Date) && (f.RoomId == null || a.Slot.RoomId == f.RoomId))
            .OrderBy(a => a.Slot.ExamSession.Date).ThenBy(a => a.Slot.ExamSession.StartTime).ThenBy(a => a.Slot.Room.Name).ThenBy(a => a.Staff.Name)
            .Select(a => new RosterRowDto(a.Id, a.StaffId, a.Staff.Name, a.Slot.ExamSession.Date, a.Slot.ExamSession.StartTime,
                a.Slot.ExamSession.EndTime, a.Slot.ExamSession.Course.Code, a.Slot.Room.Name))
            .ToListAsync();

    private async Task EnsureExists(int versionId)
    {
        if (!await db.RosterVersions.AnyAsync(v => v.Id == versionId)) throw new NotFoundException($"Roster {versionId} was not found.");
    }
}
