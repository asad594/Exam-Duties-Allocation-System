using System.ComponentModel.DataAnnotations;
using Edas.Api.Models;

namespace Edas.Api.Dtos;

[AttributeUsage(AttributeTargets.Class)]
public sealed class EndNotBeforeStartAttribute() : ValidationAttribute("EndDate must not be before StartDate.")
{
    public override bool IsValid(object? value) => value is LeaveInput l && l.EndDate >= l.StartDate;
}

[EndNotBeforeStart]
public sealed record LeaveInput(DateOnly StartDate, DateOnly EndDate, [StringLength(500)] string? Reason);

public sealed record RejectRequest([StringLength(500)] string? Note);

public sealed record LeaveRequestDto(int Id, int StaffId, string StaffName, DateOnly StartDate, DateOnly EndDate, string? Reason,
    LeaveStatus Status, string? DecisionNote, DateTime CreatedAt, DateTime? DecidedAt);

public sealed record AffectedDutyDto(int RosterVersionId, int VersionNo, RosterStatus VersionStatus, int AssignmentId,
    DateOnly Date, TimeOnly StartTime, TimeOnly EndTime, string CourseCode, string Room);

public sealed record ApproveResult(LeaveRequestDto Request, List<AffectedDutyDto> AffectedDuties);
