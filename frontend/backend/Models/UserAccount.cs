namespace CampusMate.Models;

public sealed class UserAccount
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Role { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string NormalizedEmail { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string SecurityStamp { get; set; } = "";
    public string Phone { get; set; } = "";
    public string City { get; set; } = "";
    public string? Occupation { get; set; }
    public string? Destination { get; set; }
    public bool Active { get; set; } = true;
    public string? SuspensionReason { get; set; }
    public DateTimeOffset? SuspendedUntil { get; set; }
    public string? SuspendedBy { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] Version { get; set; } = [];
}
