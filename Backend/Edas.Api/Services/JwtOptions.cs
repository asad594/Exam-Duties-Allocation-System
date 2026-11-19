using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Edas.Api.Services;

public sealed record JwtOptions(string Key, string Issuer, string Audience)
{
    public SymmetricSecurityKey SigningKey => new(Encoding.UTF8.GetBytes(Key));
}
