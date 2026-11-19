namespace Edas.Api.Models;

public class Vacancy
{
    public int Id { get; set; }
    public int RosterVersionId { get; set; }
    public int SlotId { get; set; }
    public Slot Slot { get; set; } = null!;
    public int Missing { get; set; }
    public int UnavailableCount { get; set; }
    public int BusyCount { get; set; }
    public int AtLimitCount { get; set; }
}
