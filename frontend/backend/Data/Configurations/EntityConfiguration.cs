using CampusMate.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Data.Configurations;

internal static class EntityConfiguration
{
    public static void ConfigureEntities(this ModelBuilder model)
    {
        model.Entity<UserAccount>(e =>
        {
            e.ToTable("Users");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Role).HasColumnType("varchar(16)").IsRequired();
            e.Property(x => x.FirstName).HasColumnType("nvarchar(100)").IsRequired();
            e.Property(x => x.LastName).HasColumnType("nvarchar(100)").IsRequired();
            e.Property(x => x.Email).HasColumnType("nvarchar(254)").IsRequired();
            e.Property(x => x.NormalizedEmail).HasColumnType("nvarchar(254)").IsRequired();
            e.Property(x => x.PasswordHash).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.SecurityStamp).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Phone).HasColumnType("nvarchar(32)").IsRequired();
            e.Property(x => x.City).HasColumnType("nvarchar(100)").IsRequired();
            e.Property(x => x.Occupation).HasColumnType("nvarchar(150)");
            e.Property(x => x.Destination).HasColumnType("nvarchar(200)");
            e.Property(x => x.Active).HasColumnType("bit").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.Version).HasColumnType("rowversion").IsRequired().IsRowVersion();
        });
        model.Entity<HousingPreference>(e =>
        {
            e.ToTable("Preferences");
            e.Property(x => x.UserId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.MinBudget).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.MaxBudget).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.AreasJson).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Destination).HasColumnType("nvarchar(200)");
            e.Property(x => x.Commute).HasColumnType("int");
            e.Property(x => x.Housing).HasColumnType("nvarchar(50)");
            e.Property(x => x.Furnishing).HasColumnType("nvarchar(50)");
            e.Property(x => x.Billing).HasColumnType("varchar(10)");
            e.Property(x => x.Roommates).HasColumnType("bit").IsRequired();
            e.Property(x => x.RoommatesCount).HasColumnType("varchar(3)").IsRequired();
            e.Property(x => x.Sleep).HasColumnType("nvarchar(50)");
            e.Property(x => x.Schedule).HasColumnType("nvarchar(50)");
            e.Property(x => x.Noise).HasColumnType("tinyint");
            e.Property(x => x.Cleanliness).HasColumnType("tinyint");
            e.Property(x => x.Smoking).HasColumnType("nvarchar(50)");
            e.Property(x => x.HabitsJson).HasColumnType("nvarchar(max)").IsRequired();
        });
        model.Entity<RoommateProfile>(e =>
        {
            e.ToTable("RoommateProfiles");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.UserId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Area).HasColumnType("nvarchar(100)").IsRequired();
            e.Property(x => x.MinBudget).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.MaxBudget).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.Sleep).HasColumnType("nvarchar(50)").IsRequired();
            e.Property(x => x.Schedule).HasColumnType("nvarchar(50)").IsRequired();
            e.Property(x => x.Noise).HasColumnType("tinyint").IsRequired();
            e.Property(x => x.Cleanliness).HasColumnType("tinyint").IsRequired();
            e.Property(x => x.Smoking).HasColumnType("nvarchar(50)").IsRequired();
            e.Property(x => x.HabitsJson).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Available).HasColumnType("bit").IsRequired();
        });
        model.Entity<MediaFile>(e =>
        {
            e.ToTable("Media");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.UploadedBy).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Name).HasColumnType("nvarchar(255)").IsRequired();
            e.Property(x => x.StorageKey).HasColumnType("nvarchar(500)").IsRequired();
            e.Property(x => x.ContentType).HasColumnType("varchar(100)").IsRequired();
            e.Property(x => x.SizeBytes).HasColumnType("bigint").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<PropertyListing>(e =>
        {
            e.ToTable("Properties");
            e.Property(x => x.Id).HasColumnType("int").IsRequired();
            e.Property(x => x.OwnerId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Title).HasColumnType("nvarchar(200)").IsRequired();
            e.Property(x => x.City).HasColumnType("nvarchar(100)").IsRequired();
            e.Property(x => x.Area).HasColumnType("nvarchar(100)").IsRequired();
            e.Property(x => x.Price).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.Period).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.Beds).HasColumnType("int").IsRequired();
            e.Property(x => x.Baths).HasColumnType("int").IsRequired();
            e.Property(x => x.Size).HasColumnType("decimal(10,2)").IsRequired();
            e.Property(x => x.Type).HasColumnType("nvarchar(50)").IsRequired();
            e.Property(x => x.Furnished).HasColumnType("nvarchar(50)").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(20)").IsRequired();
            e.Property(x => x.Description).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.AmenitiesJson).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.AvailableFrom).HasColumnType("date").IsRequired();
            e.Property(x => x.AvailableTo).HasColumnType("date").IsRequired();
            e.Property(x => x.Commute).HasColumnType("int");
            e.Property(x => x.Noise).HasColumnType("tinyint");
            e.Property(x => x.Cleanliness).HasColumnType("tinyint");
            e.Property(x => x.Smoking).HasColumnType("nvarchar(50)");
            e.Property(x => x.Risk).HasColumnType("tinyint");
            e.Property(x => x.RiskReasonsJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.ModerationAnalysisJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.Version).HasColumnType("rowversion").IsRequired().IsRowVersion();
        });
        model.Entity<PropertyMedia>(e =>
        {
            e.ToTable("PropertyMedia");
            e.Property(x => x.PropertyId).HasColumnType("int").IsRequired();
            e.Property(x => x.MediaId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Kind).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.SortOrder).HasColumnType("int").IsRequired();
        });
        model.Entity<Favorite>(e =>
        {
            e.ToTable("Favorites");
            e.Property(x => x.UserId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int").IsRequired();
        });
        model.Entity<Review>(e =>
        {
            e.ToTable("Reviews");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int").IsRequired();
            e.Property(x => x.AuthorId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Rating).HasColumnType("tinyint").IsRequired();
            e.Property(x => x.Text).HasColumnType("nvarchar(2000)").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<RentalRequest>(e =>
        {
            e.ToTable("RentalRequests");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int").IsRequired();
            e.Property(x => x.TenantId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.RoommateId).HasColumnType("nvarchar(64)");
            e.Property(x => x.Message).HasColumnType("nvarchar(2000)");
            e.Property(x => x.StartDate).HasColumnType("date").IsRequired();
            e.Property(x => x.EndDate).HasColumnType("date").IsRequired();
            e.Property(x => x.Duration).HasColumnType("int").IsRequired();
            e.Property(x => x.Period).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(16)").IsRequired();
            e.Property(x => x.PropertySnapshotJson).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.AgreedPrice).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.Deposit).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.Total).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.LandlordAccepted).HasColumnType("bit").IsRequired();
            e.Property(x => x.TenantAccepted).HasColumnType("bit").IsRequired();
            e.Property(x => x.AgreementSnapshotJson).HasColumnType("nvarchar(max)");
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.Version).HasColumnType("rowversion").IsRequired().IsRowVersion();
        });
        model.Entity<RentNegotiation>(e =>
        {
            e.ToTable("RentNegotiations");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.RequestId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Price).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(12)").IsRequired();
            e.Property(x => x.ProposedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.ReviewedAt).HasColumnType("datetimeoffset(0)");
        });
        model.Entity<Inspection>(e =>
        {
            e.ToTable("Inspections");
            e.Property(x => x.RequestId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.ItemsJson).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Notes).HasColumnType("nvarchar(4000)");
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<Rental>(e =>
        {
            e.ToTable("Rentals");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.RequestId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.EndDate).HasColumnType("date").IsRequired();
            e.Property(x => x.PaymentMethod).HasColumnType("varchar(24)").IsRequired();
            e.Property(x => x.MoveInComplete).HasColumnType("bit").IsRequired();
            e.Property(x => x.ArrangementConfirmedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.ClosedAt).HasColumnType("datetimeoffset(0)");
            e.Property(x => x.Version).HasColumnType("rowversion").IsRequired().IsRowVersion();
        });
        model.Entity<ConditionReport>(e =>
        {
            e.ToTable("ConditionReports");
            e.Property(x => x.RentalId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Phase).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.SubmittedBy).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.VideoId).HasColumnType("nvarchar(64)");
            e.Property(x => x.ItemsJson).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.Notes).HasColumnType("nvarchar(4000)");
            e.Property(x => x.RecordedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<PartialOffer>(e =>
        {
            e.ToTable("PartialOffers");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.RentalId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.RoomNumber).HasColumnType("int").IsRequired();
            e.Property(x => x.Occupancy).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.StartDate).HasColumnType("date").IsRequired();
            e.Property(x => x.EndDate).HasColumnType("date").IsRequired();
            e.Property(x => x.Price).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.Notes).HasColumnType("nvarchar(500)");
            e.Property(x => x.Status).HasColumnType("varchar(20)").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.Version).HasColumnType("rowversion").IsRequired().IsRowVersion();
        });
        model.Entity<PartialRequest>(e =>
        {
            e.ToTable("PartialRequests");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.ListingId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.TenantId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.StartDate).HasColumnType("date").IsRequired();
            e.Property(x => x.EndDate).HasColumnType("date").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(12)").IsRequired();
            e.Property(x => x.OfferSnapshotJson).HasColumnType("nvarchar(max)").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.Version).HasColumnType("rowversion").IsRequired().IsRowVersion();
        });
        model.Entity<ListingFee>(e =>
        {
            e.ToTable("ListingFees");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int");
            e.Property(x => x.PartialOfferId).HasColumnType("nvarchar(64)");
            e.Property(x => x.Amount).HasColumnType("decimal(12,3)").IsRequired();
            e.Property(x => x.Currency).HasColumnType("char(3)").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.Provider).HasColumnType("varchar(50)");
            e.Property(x => x.ProviderPaymentId).HasColumnType("nvarchar(200)");
            e.Property(x => x.PaidAt).HasColumnType("datetimeoffset(0)");
            e.Property(x => x.Simulated).HasColumnType("bit").IsRequired();
        });
        model.Entity<PaymentEvent>(e =>
        {
            e.ToTable("PaymentEvents");
            e.Property(x => x.Provider).HasColumnType("varchar(50)").IsRequired();
            e.Property(x => x.EventId).HasColumnType("nvarchar(200)").IsRequired();
            e.Property(x => x.FeeId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.ProcessedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<Meeting>(e =>
        {
            e.ToTable("Meetings");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Kind).HasColumnType("varchar(10)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int");
            e.Property(x => x.RoommateId).HasColumnType("nvarchar(64)");
            e.Property(x => x.PartialRequestId).HasColumnType("nvarchar(64)");
            e.Property(x => x.CreatorId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.RecipientId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Title).HasColumnType("nvarchar(200)").IsRequired();
            e.Property(x => x.StartsAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.Duration).HasColumnType("int").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(12)").IsRequired();
            e.Property(x => x.RoomName).HasColumnType("nvarchar(200)");
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
            e.Property(x => x.Version).HasColumnType("rowversion").IsRequired().IsRowVersion();
        });
        model.Entity<RoommateContact>(e =>
        {
            e.ToTable("RoommateContacts");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.UserId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PersonId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Status).HasColumnType("varchar(12)").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<Report>(e =>
        {
            e.ToTable("Reports");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int").IsRequired();
            e.Property(x => x.ReporterId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Reason).HasColumnType("nvarchar(200)").IsRequired();
            e.Property(x => x.Notes).HasColumnType("nvarchar(4000)");
            e.Property(x => x.Status).HasColumnType("varchar(12)").IsRequired();
            e.Property(x => x.Resolution).HasColumnType("nvarchar(4000)");
            e.Property(x => x.ResolvedBy).HasColumnType("nvarchar(64)");
            e.Property(x => x.ResolvedAt).HasColumnType("datetimeoffset(0)");
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<ModerationDecision>(e =>
        {
            e.ToTable("ModerationHistory");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int").IsRequired();
            e.Property(x => x.ReviewedBy).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.Decision).HasColumnType("nvarchar(50)").IsRequired();
            e.Property(x => x.Reason).HasColumnType("nvarchar(1000)");
            e.Property(x => x.Notes).HasColumnType("nvarchar(4000)");
            e.Property(x => x.ReviewedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<Notification>(e =>
        {
            e.ToTable("Notifications");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.RecipientId).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.PropertyId).HasColumnType("int");
            e.Property(x => x.PropertyTitle).HasColumnType("nvarchar(200)");
            e.Property(x => x.Type).HasColumnType("varchar(50)").IsRequired();
            e.Property(x => x.Text).HasColumnType("nvarchar(2000)").IsRequired();
            e.Property(x => x.IsRead).HasColumnType("bit").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
        model.Entity<ActivityEntry>(e =>
        {
            e.ToTable("Activity");
            e.Property(x => x.Id).HasColumnType("nvarchar(64)").IsRequired();
            e.Property(x => x.ActorId).HasColumnType("nvarchar(64)");
            e.Property(x => x.Text).HasColumnType("nvarchar(2000)").IsRequired();
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)").IsRequired();
        });
    }
}
