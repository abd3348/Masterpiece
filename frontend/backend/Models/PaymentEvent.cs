namespace CampusMate.Models;

public sealed class PaymentEvent
{
    public string Provider { get; set; } = "";
    public string EventId { get; set; } = "";
    public string FeeId { get; set; } = "";
    public DateTimeOffset ProcessedAt { get; set; } = DateTimeOffset.UtcNow;
}
