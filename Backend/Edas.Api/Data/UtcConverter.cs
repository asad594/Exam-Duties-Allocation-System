using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Edas.Api.Data;

// MySQL datetime has no time zone, so values read back are marked as UTC.
public sealed class UtcConverter() : ValueConverter<DateTime, DateTime>(v => v, v => DateTime.SpecifyKind(v, DateTimeKind.Utc));
