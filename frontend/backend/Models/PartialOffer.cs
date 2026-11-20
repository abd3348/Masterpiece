namespace CampusMate.Models;

public sealed class PartialOffer
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string RentalId { get; set; } = "";
    public int RoomNumber { get; set; }
    public string Occupancy { get; set; } = "";
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Price { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "awaiting-fee";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] Version { get; set; } = [];
}
