namespace CampusMate.Models;

public sealed class Meeting
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string Kind { get; set; } = "";
    public int? PropertyId { get; set; }
    public string? RoommateId { get; set; }
    public string? PartialRequestId { get; set; }
    public string CreatorId { get; set; } = "";
    public string RecipientId { get; set; } = "";
    public string Title { get; set; } = "";
    public DateTimeOffset StartsAt { get; set; } = DateTimeOffset.UtcNow;
    public int Duration { get; set; }
    public string Status { get; set; } = "pending";
    public string? RoomName { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] Version { get; set; } = [];
}
