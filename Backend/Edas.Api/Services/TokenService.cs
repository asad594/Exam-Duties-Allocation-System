using System.Security.Cryptography;
using System.Text;
using Edas.Api.Models;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Edas.Api.Services;

public sealed class TokenService(JwtOptions jwt)
{
    public static readonly TimeSpan AccessLifetime = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan RefreshLifetime = TimeSpan.FromDays(7);

    public string CreateAccessToken(Staff staff) => new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
    {
        Issuer = jwt.Issuer,
        Audience = jwt.Audience,
        Expires = DateTime.UtcNow.Add(AccessLifetime),
        Claims = new Dictionary<string, object> { ["sub"] = staff.Id.ToString(), ["role"] = staff.Role.ToString() },
        SigningCredentials = new SigningCredentials(jwt.SigningKey, SecurityAlgorithms.HmacSha256)
    });

    public static string CreateRefreshToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
}
