namespace CampusMate.Models;

public sealed class HousingPreference
{
    public string UserId { get; set; } = "";
    public decimal MinBudget { get; set; }
    public decimal MaxBudget { get; set; }
    public string AreasJson { get; set; } = "[]";
    public string? Destination { get; set; }
    public int? Commute { get; set; }
    public string? Housing { get; set; }
    public string? Furnishing { get; set; }
    public string? Billing { get; set; }
    public bool Roommates { get; set; }
    public string RoommatesCount { get; set; } = "0";
    public string? Sleep { get; set; }
    public string? Schedule { get; set; }
    public byte? Noise { get; set; }
    public byte? Cleanliness { get; set; }
    public string? Smoking { get; set; }
    public string HabitsJson { get; set; } = "[]";
}
