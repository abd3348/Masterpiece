namespace CampusMate.Models;

public sealed class PropertyMedia
{
    public int PropertyId { get; set; }
    public string MediaId { get; set; } = "";
    public string Kind { get; set; } = "";
    public int SortOrder { get; set; }
}
