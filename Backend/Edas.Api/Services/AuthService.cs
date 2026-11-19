using Edas.Api.Data;
using Edas.Api.Dtos;
using Edas.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Edas.Api.Services;

public sealed class AuthService(AppDbContext db, TokenService tokens, IPasswordHasher<Staff> hasher)
{
    public async Task<TokenPair> Login(LoginRequest request)
    {
        var staff = await db.Staff.SingleOrDefaultAsync(s => s.Email == request.Email);
        if (staff is null || hasher.VerifyHashedPassword(staff, staff.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Invalid email or password.");
        return await Issue(staff);
    }

    public async Task<TokenPair> Refresh(string refreshToken)
    {
        var stored = await FindActive(refreshToken) ?? throw new UnauthorizedAccessException("Invalid refresh token.");
        stored.RevokedAt = DateTime.UtcNow;
        return await Issue(stored.Staff);
    }

    public async Task Logout(string refreshToken)
    {
        var stored = await FindActive(refreshToken);
        if (stored is null) return;
        stored.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    private Task<RefreshToken?> FindActive(string refreshToken)
    {
        var hash = TokenService.Hash(refreshToken);
        return db.RefreshTokens.Include(t => t.Staff)
            .SingleOrDefaultAsync(t => t.TokenHash == hash && t.RevokedAt == null && t.ExpiresAt > DateTime.UtcNow);
    }

    private async Task<TokenPair> Issue(Staff staff)
    {
        var refresh = TokenService.CreateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken { StaffId = staff.Id, TokenHash = TokenService.Hash(refresh), ExpiresAt = DateTime.UtcNow.Add(TokenService.RefreshLifetime) });
        await db.SaveChangesAsync();
        return new TokenPair(tokens.CreateAccessToken(staff), refresh);
    }
}
