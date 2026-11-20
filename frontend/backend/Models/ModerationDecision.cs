namespace CampusMate.Models;

public sealed class ModerationDecision
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int PropertyId { get; set; }
    public string ReviewedBy { get; set; } = "";
    public string Decision { get; set; } = "";
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public DateTimeOffset ReviewedAt { get; set; } = DateTimeOffset.UtcNow;
}
