namespace Edas.Api.Models;

public class RosterVersion
{
    public int Id { get; set; }
    public int VersionNo { get; set; }
    public RosterStatus Status { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}
