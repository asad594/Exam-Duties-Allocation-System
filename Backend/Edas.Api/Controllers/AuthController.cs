using Edas.Api.Dtos;
using Edas.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Edas.Api.Controllers;

[ApiController, Route("api/auth")]
public sealed class AuthController(AuthService auth) : ControllerBase
{
    [HttpPost("login")]
    public Task<TokenPair> Login(LoginRequest request) => auth.Login(request);

    [HttpPost("refresh")]
    public Task<TokenPair> Refresh(RefreshRequest request) => auth.Refresh(request.RefreshToken);

    [HttpPost("logout")]
    public async Task<NoContentResult> Logout(RefreshRequest request)
    {
        await auth.Logout(request.RefreshToken);
        return NoContent();
    }
}
