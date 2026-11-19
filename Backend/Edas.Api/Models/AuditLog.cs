namespace Edas.Api.Models;

public class AuditLog
{
    public int Id { get; set; }
    public int RosterVersionId { get; set; }
    public AuditAction Action { get; set; }
    public int ActorId { get; set; }
    public Staff Actor { get; set; } = null!;
    public int? SlotId { get; set; }
    public int? OldStaffId { get; set; }
    public Staff? OldStaff { get; set; }
    public int? NewStaffId { get; set; }
    public Staff? NewStaff { get; set; }
    public DateTime At { get; set; }
}
