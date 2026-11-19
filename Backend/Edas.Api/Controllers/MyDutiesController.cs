using Edas.Api.Dtos;
using Edas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Edas.Api.Controllers;

[ApiController, Route("api/my-duties"), Authorize]
public sealed class MyDutiesController(RosterQueryService queries) : ControllerBase
{
    [HttpGet]
    public Task<List<RosterRowDto>> Get() => queries.MyDuties(User.StaffId());
}
