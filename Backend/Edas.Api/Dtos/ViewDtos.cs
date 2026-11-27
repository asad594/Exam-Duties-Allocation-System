using Edas.Api.Models;

namespace Edas.Api.Dtos;

public sealed record RosterFilter(int? StaffId, DateOnly? Date, int? RoomId);

public sealed record RosterVersionDto(int Id, int VersionNo, RosterStatus Status, DateTime CreatedAt, DateTime? PublishedAt);

public sealed record RosterRowDto(int AssignmentId, int StaffId, string StaffName, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime,
    string CourseCode, string CourseName, string Room);

public sealed record WorkloadDto(int StaffId, string StaffName, int Duties, double TotalHours);

public sealed record VacancyDto(int SlotId, string CourseCode, string Room, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime,
    int Missing, int UnavailableCount, int BusyCount, int AtLimitCount);

public sealed record AuditDto(int Id, AuditAction Action, string Actor, string? OldStaff, string? NewStaff, int? SlotId, DateTime At);
