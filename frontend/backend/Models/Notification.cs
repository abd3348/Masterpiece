namespace CampusMate.Models;

public sealed class Notification
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string RecipientId { get; set; } = "";
    public int? PropertyId { get; set; }
    public string? PropertyTitle { get; set; }
    public string Type { get; set; } = "";
    public string Text { get; set; } = "";
    public string? Route { get; set; }
    public bool IsRead { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
