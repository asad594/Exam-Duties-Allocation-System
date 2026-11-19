using System.ComponentModel.DataAnnotations;

namespace Edas.Api.Dtos;

public sealed record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

public sealed record RefreshRequest([Required] string RefreshToken);

public sealed record TokenPair(string AccessToken, string RefreshToken);
