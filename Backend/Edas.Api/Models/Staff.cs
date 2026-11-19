namespace Edas.Api.Models;

public class Staff : IEntity
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public Role Role { get; set; }
    public int MaxDuties { get; set; }
}
