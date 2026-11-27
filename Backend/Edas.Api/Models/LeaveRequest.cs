namespace Edas.Api.Models;

public class LeaveRequest
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public Staff Staff { get; set; } = null!;
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Reason { get; set; }
    public LeaveStatus Status { get; set; }
    public string? DecisionNote { get; set; }
    public int? DecidedById { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
}
