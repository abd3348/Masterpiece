namespace CampusMate.Models;

public sealed class Report
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int PropertyId { get; set; }
    public string ReporterId { get; set; } = "";
    public string Reason { get; set; } = "";
    public string? Notes { get; set; }
    public string Status { get; set; } = "open";
    public string? Resolution { get; set; }
    public string? ResolutionNotes { get; set; }
    public DateTimeOffset? ActionTakenAt { get; set; }
    public string? ResolvedBy { get; set; }
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
