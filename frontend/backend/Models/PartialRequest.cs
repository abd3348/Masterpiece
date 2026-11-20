namespace CampusMate.Models;

public sealed class PartialRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string ListingId { get; set; } = "";
    public string TenantId { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string Status { get; set; } = "pending";
    public string OfferSnapshotJson { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] Version { get; set; } = [];
}
