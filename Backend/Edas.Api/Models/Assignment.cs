namespace Edas.Api.Models;

public class Assignment
{
    public int Id { get; set; }
    public int RosterVersionId { get; set; }
    public int SlotId { get; set; }
    public Slot Slot { get; set; } = null!;
    public int StaffId { get; set; }
    public Staff Staff { get; set; } = null!;
}
