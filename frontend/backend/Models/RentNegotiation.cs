namespace CampusMate.Models;

public sealed class RentNegotiation
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string RequestId { get; set; } = "";
    public decimal Price { get; set; }
    public string Status { get; set; } = "";
    public DateTimeOffset ProposedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReviewedAt { get; set; }
}
