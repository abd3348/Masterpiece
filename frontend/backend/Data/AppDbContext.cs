using CampusMate.Data.Configurations;
using CampusMate.Models;
using Microsoft.EntityFrameworkCore;
namespace CampusMate.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        configurationBuilder.Conventions.Remove(typeof(Microsoft.EntityFrameworkCore.Metadata.Conventions.ForeignKeyIndexConvention));
    }
    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<HousingPreference> Preferences => Set<HousingPreference>();
    public DbSet<RoommateProfile> RoommateProfiles => Set<RoommateProfile>();
    public DbSet<MediaFile> Media => Set<MediaFile>();
    public DbSet<PropertyListing> Properties => Set<PropertyListing>();
    public DbSet<PropertyMedia> PropertyMedia => Set<PropertyMedia>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<RoommateFavorite> RoommateFavorites => Set<RoommateFavorite>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<RentalRequest> RentalRequests => Set<RentalRequest>();
    public DbSet<RentNegotiation> RentNegotiations => Set<RentNegotiation>();
    public DbSet<Inspection> Inspections => Set<Inspection>();
    public DbSet<Rental> Rentals => Set<Rental>();
    public DbSet<RentalAmendment> RentalAmendments => Set<RentalAmendment>();
    public DbSet<ConditionReport> ConditionReports => Set<ConditionReport>();
    public DbSet<PartialOffer> PartialOffers => Set<PartialOffer>();
    public DbSet<PartialRequest> PartialRequests => Set<PartialRequest>();
    public DbSet<ListingFee> ListingFees => Set<ListingFee>();
    public DbSet<PaymentEvent> PaymentEvents => Set<PaymentEvent>();
    public DbSet<Meeting> Meetings => Set<Meeting>();
    public DbSet<RoommateContact> RoommateContacts => Set<RoommateContact>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ModerationDecision> ModerationHistory => Set<ModerationDecision>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ActivityEntry> Activity => Set<ActivityEntry>();
    protected override void OnModelCreating(ModelBuilder model)
    {
        model.ConfigureEntities();
        model.ConfigureSchema();
        model.ConfigureWorkflows();
        // SQL defaults belong to the schema; explicit false values must still be saved.
        foreach (var property in model.Model.GetEntityTypes().SelectMany(entity => entity.GetProperties()))
            if (property.ClrType == typeof(bool) && property.GetDefaultValueSql() is not null)
                property.ValueGenerated = Microsoft.EntityFrameworkCore.Metadata.ValueGenerated.Never;
    }
}
