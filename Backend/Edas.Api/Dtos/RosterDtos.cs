using System.ComponentModel.DataAnnotations;

namespace Edas.Api.Dtos;

public sealed record GenerateResult(int DraftId, int AssignedCount, int VacancyCount, long ElapsedMs);

public sealed record ReplaceRequest([Range(1, int.MaxValue)] int NewStaffId);

public sealed record ChangeResult(int RosterVersionId, int VersionNo);

public sealed record PublishResult(int RosterVersionId, int VersionNo, int VacancyWarning);
