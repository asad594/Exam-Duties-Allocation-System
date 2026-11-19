using System.ComponentModel.DataAnnotations;

namespace Edas.Api.Dtos;

public interface ITimeRange
{
    TimeOnly StartTime { get; }
    TimeOnly EndTime { get; }
}

[AttributeUsage(AttributeTargets.Class)]
public sealed class EndAfterStartAttribute() : ValidationAttribute("EndTime must be after StartTime.")
{
    public override bool IsValid(object? value) => value is ITimeRange r && r.EndTime > r.StartTime;
}
