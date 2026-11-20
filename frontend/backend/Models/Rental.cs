namespace CampusMate.Models;

public sealed class Rental
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string RequestId { get; set; } = "";
    public string Status { get; set; } = "active";
    public DateOnly EndDate { get; set; }
    public string PaymentMethod { get; set; } = "direct-to-landlord";
    public bool MoveInComplete { get; set; }
    public DateTimeOffset ArrangementConfirmedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ClosedAt { get; set; }
    public byte[] Version { get; set; } = [];
}
