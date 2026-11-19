namespace Edas.Api.Services;

public enum Block { None, Unavailable, Overlap, AtLimit }

public sealed record TimeBlock(DateOnly Date, TimeOnly Start, TimeOnly End)
{
    public double Hours => (End - Start).TotalHours;
}

public sealed record StaffInfo(int Id, int MaxDuties);

public static class EligibilityService
{
    public static bool Overlap(TimeBlock a, TimeBlock b) => a.Date == b.Date && a.Start < b.End && b.Start < a.End;

    // Pure rule shared by automatic allocation and manual replacement (BR-06).
    public static Block Check(StaffInfo staff, TimeBlock slot, IReadOnlyCollection<TimeBlock> duties, IEnumerable<TimeBlock> unavailabilities) =>
        unavailabilities.Any(u => Overlap(u, slot)) ? Block.Unavailable
        : duties.Any(d => Overlap(d, slot)) ? Block.Overlap
        : duties.Count >= staff.MaxDuties ? Block.AtLimit
        : Block.None;

    public static string Describe(Block block) => block switch
    {
        Block.Unavailable => "The staff member is unavailable at this time.",
        Block.Overlap => "The staff member already has an overlapping duty.",
        Block.AtLimit => "The staff member has reached their maximum number of duties.",
        _ => "The staff member is eligible."
    };
}
