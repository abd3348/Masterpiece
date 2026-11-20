namespace CampusMate.Models;

public sealed class Review
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int PropertyId { get; set; }
    public string AuthorId { get; set; } = "";
    public byte Rating { get; set; }
    public string Text { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
