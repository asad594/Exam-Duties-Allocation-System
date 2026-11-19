namespace Edas.Api.Models;

public class RefreshToken
{
    public int Id { get; set; }
    public int StaffId { get; set; }
    public Staff Staff { get; set; } = null!;
    public string TokenHash { get; set; } = "";
    public DateTime ExpiresAt { get; set; }
    public DateTime? RevokedAt { get; set; }
}
