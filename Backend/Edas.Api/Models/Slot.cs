namespace Edas.Api.Models;

public class Slot : IEntity
{
    public int Id { get; set; }
    public int ExamSessionId { get; set; }
    public ExamSession ExamSession { get; set; } = null!;
    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;
    public int Required { get; set; }
}
