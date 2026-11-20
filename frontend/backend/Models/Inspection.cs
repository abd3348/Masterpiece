namespace CampusMate.Models;

public sealed class Inspection
{
    public string RequestId { get; set; } = "";
    public string ItemsJson { get; set; } = "";
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
