using System.Security.Claims;
using Edas.Api.Dtos;
using Edas.Api.Models;
using Edas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Edas.Api.Controllers;

[ApiController, Route("api/rosters"), Authorize(Roles = nameof(Role.Coordinator))]
public sealed class RostersController(AllocationService allocation, RosterService rosters, RosterQueryService queries) : ControllerBase
{
    [HttpPost("generate")]
    public Task<GenerateResult> Generate() => allocation.Generate(User.StaffId());

    [HttpGet]
    public Task<List<RosterVersionDto>> List() => queries.List();

    [HttpGet("{id:int}")]
    public Task<List<RosterRowDto>> View(int id, [FromQuery] RosterFilter filter) => queries.View(id, filter);

    [HttpGet("{id:int}/workload")]
    public Task<List<WorkloadDto>> Workload(int id) => queries.Workload(id);

    [HttpGet("{id:int}/vacancies")]
    public Task<List<VacancyDto>> Vacancies(int id) => queries.Vacancies(id);

    [HttpGet("{id:int}/audit")]
    public Task<List<AuditDto>> Audit(int id) => queries.Audit(id);

    [HttpGet("{id:int}/export")]
    public async Task<FileContentResult> Export(int id, [FromQuery] RosterFilter filter) =>
        File(System.Text.Encoding.UTF8.GetBytes(await queries.Csv(id, filter)), "text/csv", $"roster-{id}.csv");

    [HttpPut("{id:int}/assignments/{assignmentId:int}")]
    public Task<ChangeResult> Replace(int id, int assignmentId, ReplaceRequest request) =>
        rosters.Replace(id, assignmentId, request.NewStaffId, User.StaffId());

    [HttpPost("{id:int}/publish")]
    public Task<PublishResult> Publish(int id) => rosters.Publish(id, User.StaffId());
}

public static class ClaimsExtensions
{
    // JwtBearer maps the "sub" claim to NameIdentifier.
    public static int StaffId(this ClaimsPrincipal user) => int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
