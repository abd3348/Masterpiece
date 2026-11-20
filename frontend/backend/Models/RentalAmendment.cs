namespace CampusMate.Models;

public sealed class RentalAmendment
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string RentalId { get; set; } = "";
    public string ProposedBy { get; set; } = "";
    public int BaseTermsVersion { get; set; }
    public string OriginalTermsJson { get; set; } = "";
    public string ProposedTermsJson { get; set; } = "";
    public string RequiredApproversJson { get; set; } = "[]";
    public string ApprovedByJson { get; set; } = "[]";
    public string Status { get; set; } = "pending";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
