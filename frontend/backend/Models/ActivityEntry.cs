namespace CampusMate.Models;

public sealed class ActivityEntry
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string? ActorId { get; set; }
    public string Text { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
