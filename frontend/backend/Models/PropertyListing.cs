namespace CampusMate.Models;

public sealed class PropertyListing
{
    public int Id { get; set; }
    public string OwnerId { get; set; } = "";
    public string Title { get; set; } = "";
    public string City { get; set; } = "";
    public string Area { get; set; } = "";
    public decimal Price { get; set; }
    public string Period { get; set; } = "";
    public int Beds { get; set; }
    public int Baths { get; set; }
    public decimal Size { get; set; }
    public string Type { get; set; } = "";
    public string Furnished { get; set; } = "";
    public string Status { get; set; } = "awaiting-fee";
    public string ReviewStatus { get; set; } = "approved";
    public bool OwnerWantsPublished { get; set; } = true;
    public string Description { get; set; } = "";
    public string AmenitiesJson { get; set; } = "[]";
    public DateOnly AvailableFrom { get; set; }
    public DateOnly AvailableTo { get; set; }
    public int? Commute { get; set; }
    public byte? Noise { get; set; }
    public byte? Cleanliness { get; set; }
    public string? Smoking { get; set; }
    public byte? Risk { get; set; }
    public string? RiskReasonsJson { get; set; }
    public string? ModerationAnalysisJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] Version { get; set; } = [];
}
