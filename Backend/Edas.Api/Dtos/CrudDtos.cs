using System.ComponentModel.DataAnnotations;
using Edas.Api.Models;

namespace Edas.Api.Dtos;

public sealed record StaffDto(int Id, string Name, string Email, Role Role, int MaxDuties);

public sealed record StaffInput(
    [Required, StringLength(100)] string Name,
    [Required, EmailAddress, StringLength(200)] string Email,
    [StringLength(100, MinimumLength = 6)] string? Password,
    [Required] Role? Role,
    [Range(0, 100)] int MaxDuties);

public sealed record CourseDto(int Id, string Code, string Title);

public sealed record CourseInput([Required, StringLength(20)] string Code, [Required, StringLength(200)] string Title);

public sealed record RoomDto(int Id, string Name);

public sealed record RoomInput([Required, StringLength(100)] string Name);

public sealed record SessionDto(int Id, int CourseId, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime);

[EndAfterStart]
public sealed record SessionInput([Range(1, int.MaxValue)] int CourseId, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime) : ITimeRange;

public sealed record SlotDto(int Id, int ExamSessionId, int RoomId, int Required);

public sealed record SlotInput([Range(1, int.MaxValue)] int ExamSessionId, [Range(1, int.MaxValue)] int RoomId, [Range(1, 100)] int Required);

public sealed record UnavailabilityDto(int Id, int StaffId, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime);

[EndAfterStart]
public sealed record UnavailabilityInput([Range(1, int.MaxValue)] int StaffId, DateOnly Date, TimeOnly StartTime, TimeOnly EndTime) : ITimeRange;
