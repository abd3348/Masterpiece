namespace CampusMate.Models;

public sealed class ConditionReport
{
    public string RentalId { get; set; } = "";
    public string Phase { get; set; } = "";
    public string SubmittedBy { get; set; } = "";
    public string? VideoId { get; set; }
    public string ItemsJson { get; set; } = "";
    public string? Notes { get; set; }
    public DateTimeOffset RecordedAt { get; set; } = DateTimeOffset.UtcNow;
}
