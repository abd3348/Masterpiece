namespace CampusMate.Models;

public sealed class ListingFee
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int? PropertyId { get; set; }
    public string? PartialOfferId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "JOD";
    public string Status { get; set; } = "unpaid";
    public string? Provider { get; set; }
    public string? ProviderPaymentId { get; set; }
    public DateTimeOffset? PaidAt { get; set; }
    public bool Simulated { get; set; }
}
