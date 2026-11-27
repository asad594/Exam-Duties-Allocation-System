using Edas.Api.Dtos;
using Edas.Api.Models;
using Edas.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Edas.Api.Controllers;

[ApiController, Route("api/leave-requests")]
public sealed class LeaveRequestsController(LeaveService leave) : ControllerBase
{
    [HttpGet("mine"), Authorize(Roles = nameof(Role.Faculty))]
    public Task<List<LeaveRequestDto>> Mine() => leave.Mine(User.StaffId());

    [HttpPost, Authorize(Roles = nameof(Role.Faculty))]
    public async Task<ObjectResult> Create(LeaveInput input) => StatusCode(StatusCodes.Status201Created, await leave.Create(User.StaffId(), input));

    [HttpDelete("{id:int}"), Authorize(Roles = nameof(Role.Faculty))]
    public async Task<NoContentResult> Cancel(int id)
    {
        await leave.Cancel(User.StaffId(), id);
        return NoContent();
    }

    [HttpGet, Authorize(Roles = nameof(Role.Admin))]
    public Task<List<LeaveRequestDto>> List([FromQuery] LeaveStatus? status) => leave.ByStatus(status);

    [HttpPost("{id:int}/approve"), Authorize(Roles = nameof(Role.Admin))]
    public Task<ApproveResult> Approve(int id) => leave.Approve(id, User.StaffId());

    [HttpPost("{id:int}/reject"), Authorize(Roles = nameof(Role.Admin))]
    public Task<LeaveRequestDto> Reject(int id, RejectRequest request) => leave.Reject(id, User.StaffId(), request.Note);
}
