namespace CampusMate.Models;

public sealed class RoommateProfile
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string UserId { get; set; } = "";
    public string Area { get; set; } = "";
    public decimal MinBudget { get; set; }
    public decimal MaxBudget { get; set; }
    public string Sleep { get; set; } = "";
    public string Schedule { get; set; } = "";
    public byte Noise { get; set; }
    public byte Cleanliness { get; set; }
    public string Smoking { get; set; } = "";
    public string HabitsJson { get; set; } = "[]";
    public bool Available { get; set; } = true;
}
