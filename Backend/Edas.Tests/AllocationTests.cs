using Edas.Api.Services;

namespace Edas.Tests;

public class AllocationTests
{
    private static readonly DateOnly Day = new(2030, 1, 10);
    private static readonly ILookup<int, TimeBlock> NoUnavailability = Array.Empty<(int, TimeBlock)>().ToLookup(x => x.Item1, x => x.Item2);

    private static TimeBlock At(int start, int end) => new(Day, new TimeOnly(start, 0), new TimeOnly(end, 0));
    private static SlotInfo Slot(int id, int start, int end, int required = 1) => new(id, At(start, end), required);
    private static StaffInfo[] Staff(params int[] maxDuties) => maxDuties.Select((max, i) => new StaffInfo(i + 1, max)).ToArray();

    [Fact]
    public void Fills_every_slot_when_enough_staff()
    {
        var result = AllocationService.Allocate(Staff(2, 2), [Slot(1, 9, 12, 2), Slot(2, 13, 15, 2)], NoUnavailability);
        Assert.Equal(4, result.Assignments.Count);
        Assert.Empty(result.Vacancies);
    }

    [Fact]
    public void Never_double_books_overlapping_slots()
    {
        var result = AllocationService.Allocate(Staff(5), [Slot(1, 9, 12), Slot(2, 11, 13)], NoUnavailability);
        Assert.Single(result.Assignments);
        Assert.Equal(1, result.Vacancies.Single().Busy);
    }

    [Fact]
    public void Never_exceeds_max_duties()
    {
        var result = AllocationService.Allocate(Staff(1), [Slot(1, 9, 10), Slot(2, 11, 12), Slot(3, 13, 14)], NoUnavailability);
        Assert.Single(result.Assignments);
        Assert.All(result.Vacancies, v => Assert.Equal(1, v.AtLimit));
    }

    [Fact]
    public void Reports_vacancy_with_reason_counts()
    {
        var unavailable = new[] { (1, At(8, 18)) }.ToLookup(x => x.Item1, x => x.Item2);
        var staff = Staff(5, 5, 0, 5);
        var result = AllocationService.Allocate(staff, [Slot(1, 9, 11), Slot(2, 10, 12, 3)], unavailable);
        var vacancy = result.Vacancies.Single(v => v.SlotId == 2);
        Assert.Equal((2, 1, 1, 1), (vacancy.Missing, vacancy.Unavailable, vacancy.Busy, vacancy.AtLimit));
    }

    [Fact]
    public void Picks_staff_with_fewest_hours_first()
    {
        var result = AllocationService.Allocate(Staff(3, 3), [Slot(1, 9, 12), Slot(2, 13, 14), Slot(3, 15, 16)], NoUnavailability);
        Assert.Equal([1, 2, 2], result.Assignments.OrderBy(a => a.SlotId).Select(a => a.StaffId));
    }

    [Fact]
    public void Breaks_ties_by_lowest_staff_id()
    {
        var first = AllocationService.Allocate(Staff(1, 1, 1), [Slot(1, 9, 12)], NoUnavailability);
        var second = AllocationService.Allocate(Staff(1, 1, 1), [Slot(1, 9, 12)], NoUnavailability);
        Assert.Equal(1, first.Assignments.Single().StaffId);
        Assert.Equal(first.Assignments, second.Assignments);
    }
}
