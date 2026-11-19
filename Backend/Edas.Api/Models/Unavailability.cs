namespace Edas.Api.Models;

public class Unavailability : IEntity
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
}
