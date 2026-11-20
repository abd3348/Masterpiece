namespace CampusMate.Models;

public sealed class MediaFile
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string UploadedBy { get; set; } = "";
    public string Name { get; set; } = "";
    public string StorageKey { get; set; } = "";
    public string ContentType { get; set; } = "";
    public long SizeBytes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
