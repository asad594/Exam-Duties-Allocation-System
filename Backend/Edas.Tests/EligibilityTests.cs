using Edas.Api.Services;

namespace Edas.Tests;

public class EligibilityTests
{
    private static readonly DateOnly Day = new(2030, 1, 10);
    private static readonly StaffInfo Staff = new(1, MaxDuties: 2);

    private static TimeBlock At(int start, int end, DateOnly? date = null) => new(date ?? Day, new TimeOnly(start, 0), new TimeOnly(end, 0));

    [Fact]
    public void Clean_case_is_allowed() => Assert.Equal(Block.None, EligibilityService.Check(Staff, At(9, 12), [], []));

    [Fact]
    public void Overlapping_unavailability_is_blocked() =>
        Assert.Equal(Block.Unavailable, EligibilityService.Check(Staff, At(9, 12), [], [At(11, 13)]));

    [Fact]
    public void Partially_overlapping_duty_is_blocked() =>
        Assert.Equal(Block.Overlap, EligibilityService.Check(Staff, At(11, 13), [At(9, 12)], []));

    [Fact]
    public void Back_to_back_duty_is_allowed() =>
        Assert.Equal(Block.None, EligibilityService.Check(Staff, At(12, 14), [At(9, 12)], []));

    [Fact]
    public void Same_time_on_another_day_is_allowed() =>
        Assert.Equal(Block.None, EligibilityService.Check(Staff, At(9, 12), [At(9, 12, Day.AddDays(1))], []));

    [Fact]
    public void Duty_count_equal_to_max_is_blocked() =>
        Assert.Equal(Block.AtLimit, EligibilityService.Check(Staff, At(15, 16), [At(9, 10), At(11, 12)], []));

    [Fact]
    public void Duty_count_one_below_max_is_allowed() =>
        Assert.Equal(Block.None, EligibilityService.Check(Staff, At(15, 16), [At(9, 10)], []));

    [Fact]
    public void Unavailable_is_reported_before_overlap_and_limit() =>
        Assert.Equal(Block.Unavailable, EligibilityService.Check(new StaffInfo(1, 0), At(9, 12), [At(9, 12)], [At(9, 12)]));
}
