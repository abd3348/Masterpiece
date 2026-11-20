namespace CampusMate.Models;

public sealed class RentalRequest
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public int PropertyId { get; set; }
    public string TenantId { get; set; } = "";
    public string? RoommateId { get; set; }
    public string? RoommateUserId { get; set; }
    public int WorkflowVersion { get; set; } = 2;
    public int TermsVersion { get; set; } = 1;
    public string? InvitationStatus { get; set; }
    public DateTimeOffset? InvitationExpiresAt { get; set; }
    public bool RoommateAccepted { get; set; }
    public string? Message { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public int Duration { get; set; }
    public string Period { get; set; } = "";
    public string Status { get; set; } = "submitted";
    public string PropertySnapshotJson { get; set; } = "";
    public decimal AgreedPrice { get; set; }
    public decimal Deposit { get; set; }
    public decimal Total { get; set; }
    public bool LandlordAccepted { get; set; }
    public bool TenantAccepted { get; set; }
    public string? AgreementSnapshotJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public byte[] Version { get; set; } = [];
}
