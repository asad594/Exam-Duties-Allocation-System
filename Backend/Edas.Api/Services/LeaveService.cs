using System.Linq.Expressions;
using Edas.Api.Data;
using Edas.Api.Dtos;
using Edas.Api.Hubs;
using Edas.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Edas.Api.Services;

public sealed record LeaveRequested(int Id, string StaffName, DateOnly StartDate, DateOnly EndDate);

public sealed record LeaveDecided(int Id, LeaveStatus Status, DateOnly StartDate, DateOnly EndDate, string? DecisionNote);

public sealed class LeaveService(AppDbContext db, IHubContext<NotificationHub> hub)
{
    private static readonly Expression<Func<LeaveRequest, LeaveRequestDto>> ToDto = l => new LeaveRequestDto(
        l.Id, l.StaffId, l.Staff.Name, l.StartDate, l.EndDate, l.Reason, l.Status, l.DecisionNote, l.CreatedAt, l.DecidedAt);

    public Task<List<LeaveRequestDto>> Mine(int staffId) => List(l => l.StaffId == staffId);

    public Task<List<LeaveRequestDto>> ByStatus(LeaveStatus? status) => List(l => status == null || l.Status == status);

    public async Task<LeaveRequestDto> Create(int staffId, LeaveInput input)
    {
        if (input.StartDate < DateOnly.FromDateTime(DateTime.Now)) throw new RuleException("Leave cannot start in the past.");
        if (await db.LeaveRequests.AnyAsync(l => l.StaffId == staffId && l.Status != LeaveStatus.Rejected
                && l.StartDate <= input.EndDate && input.StartDate <= l.EndDate))
            throw new RuleException("You already have a pending or approved leave request for these dates.");
        var leave = new LeaveRequest { StaffId = staffId, StartDate = input.StartDate, EndDate = input.EndDate, Reason = input.Reason, Status = LeaveStatus.Pending, CreatedAt = DateTime.UtcNow };
        db.LeaveRequests.Add(leave);
        await db.SaveChangesAsync();
        var dto = await Get(leave.Id);
        await hub.Clients.Group(NotificationHub.AdminsGroup).SendAsync(nameof(LeaveRequested), new LeaveRequested(dto.Id, dto.StaffName, dto.StartDate, dto.EndDate));
        return dto;
    }

    public async Task Cancel(int staffId, int id)
    {
        var leave = await db.LeaveRequests.SingleOrDefaultAsync(l => l.Id == id && l.StaffId == staffId) ?? throw Missing(id);
        db.LeaveRequests.Remove(EnsurePending(leave));
        await db.SaveChangesAsync();
    }

    // Approving marks every leave day as unavailable, so allocation and replacement both respect it.
    public async Task<ApproveResult> Approve(int id, int adminId)
    {
        var leave = EnsurePending(await Find(id));
        Decide(leave, LeaveStatus.Approved, null, adminId);
        db.Unavailabilities.AddRange(await MissingLeaveDays(leave));
        await db.SaveChangesAsync();
        await Notify(leave);
        return new ApproveResult(await Get(id), await AffectedDuties(leave));
    }

    public async Task<LeaveRequestDto> Reject(int id, int adminId, string? note)
    {
        var leave = EnsurePending(await Find(id));
        Decide(leave, LeaveStatus.Rejected, note, adminId);
        await db.SaveChangesAsync();
        await Notify(leave);
        return await Get(id);
    }

    private Task<List<LeaveRequestDto>> List(Expression<Func<LeaveRequest, bool>> filter) =>
        db.LeaveRequests.AsNoTracking().Where(filter).OrderByDescending(l => l.CreatedAt).ThenByDescending(l => l.Id).Select(ToDto).ToListAsync();

    private async Task<LeaveRequestDto> Get(int id) => await db.LeaveRequests.AsNoTracking().Where(l => l.Id == id).Select(ToDto).SingleAsync();

    private async Task<LeaveRequest> Find(int id) => await db.LeaveRequests.FindAsync(id) ?? throw Missing(id);

    private static NotFoundException Missing(int id) => new($"Leave request {id} was not found.");

    private static LeaveRequest EnsurePending(LeaveRequest leave) =>
        leave.Status == LeaveStatus.Pending ? leave : throw new RuleException("Only a pending leave request can be changed.");

    private static void Decide(LeaveRequest leave, LeaveStatus status, string? note, int adminId) =>
        (leave.Status, leave.DecisionNote, leave.DecidedById, leave.DecidedAt) = (status, note, adminId, DateTime.UtcNow);

    private async Task<List<Unavailability>> MissingLeaveDays(LeaveRequest leave)
    {
        var start = new TimeOnly(0, 0);
        var taken = await db.Unavailabilities.Where(u => u.StaffId == leave.StaffId && u.StartTime == start
            && u.Date >= leave.StartDate && u.Date <= leave.EndDate).Select(u => u.Date).ToListAsync();
        return Enumerable.Range(0, leave.EndDate.DayNumber - leave.StartDate.DayNumber + 1)
            .Select(leave.StartDate.AddDays).Except(taken)
            .Select(d => new Unavailability { StaffId = leave.StaffId, Date = d, StartTime = start, EndTime = new TimeOnly(23, 59, 59) }).ToList();
    }

    // Duties of the staff member inside the leave dates, in the draft and the latest published roster.
    private async Task<List<AffectedDutyDto>> AffectedDuties(LeaveRequest leave)
    {
        var latestPublished = await db.RosterVersions.Where(v => v.Status == RosterStatus.Published)
            .OrderByDescending(v => v.VersionNo).Select(v => (int?)v.Id).FirstOrDefaultAsync();
        return await (from a in db.Assignments.AsNoTracking()
                      join v in db.RosterVersions on a.RosterVersionId equals v.Id
                      where a.StaffId == leave.StaffId && (v.Status == RosterStatus.Draft || v.Id == latestPublished)
                          && a.Slot.ExamSession.Date >= leave.StartDate && a.Slot.ExamSession.Date <= leave.EndDate
                      orderby a.Slot.ExamSession.Date, a.Slot.ExamSession.StartTime, v.VersionNo
                      select new AffectedDutyDto(v.Id, v.VersionNo, v.Status, a.Id, a.Slot.ExamSession.Date,
                          a.Slot.ExamSession.StartTime, a.Slot.ExamSession.EndTime, a.Slot.ExamSession.Course.Code, a.Slot.Room.Name))
            .ToListAsync();
    }

    private Task Notify(LeaveRequest leave) => hub.Clients.Group(NotificationHub.Group(leave.StaffId)).SendAsync(nameof(LeaveDecided),
        new LeaveDecided(leave.Id, leave.Status, leave.StartDate, leave.EndDate, leave.DecisionNote));
}
