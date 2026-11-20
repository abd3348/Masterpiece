using CampusMate.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Data.Configurations;

internal static class WorkflowConfiguration
{
    public static void ConfigureWorkflows(this ModelBuilder model)
    {
        model.Entity<RentalAmendment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(64);
            e.Property(x => x.RentalId).HasMaxLength(64);
            e.Property(x => x.ProposedBy).HasMaxLength(64);
            e.Property(x => x.Status).HasColumnType("varchar(16)");
            e.Property(x => x.CreatedAt).HasColumnType("datetimeoffset(0)");
            e.HasOne<Rental>().WithMany().HasForeignKey(x => x.RentalId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ProposedBy).OnDelete(DeleteBehavior.NoAction);
            e.ToTable("RentalAmendments",t=>t.HasCheckConstraint("CK_RentalAmendments_Status","[Status] IN ('pending','approved','rejected','cancelled')"));
        });
        model.Entity<RoommateFavorite>(e =>
        {
            e.HasKey(x => new { x.UserId, x.RoommateId });
            e.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.NoAction);
            e.HasOne<RoommateProfile>().WithMany().HasForeignKey(x => x.RoommateId).OnDelete(DeleteBehavior.NoAction);
            e.ToTable("RoommateFavorites");
        });
        model.Entity<RentalRequest>(e =>
        {
            e.Property(x => x.WorkflowVersion).HasDefaultValue(1).ValueGeneratedNever();
            e.Property(x => x.TermsVersion).HasDefaultValue(1).ValueGeneratedNever();
            e.Property(x => x.RoommateUserId).HasColumnType("nvarchar(64)");
            e.Property(x => x.InvitationStatus).HasColumnType("varchar(16)");
            e.Property(x => x.InvitationExpiresAt).HasColumnType("datetimeoffset(0)");
            e.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.RoommateUserId).OnDelete(DeleteBehavior.NoAction);
            e.ToTable("RentalRequests", t =>
            {
                t.HasCheckConstraint("CK__RentalReq__Statu__160F4887", "[Status] IN ('draft','waiting-roommate','submitted','approved','inspection','agreement','payment','confirmed','active','closed','rejected','cancelled')");
                t.HasCheckConstraint("CK_RentalRequests_Invitation", "[InvitationStatus] IS NULL OR [InvitationStatus] IN ('pending','accepted','declined','cancelled','expired')");
            });
        });
        model.Entity<Rental>(e => e.ToTable("Rentals", t => t.HasCheckConstraint("CK__Rentals__Status__2EDAF651", "[Status] IN ('upcoming','active','closed')")));
        model.Entity<PropertyListing>(e =>
        {
            e.Property(x => x.ReviewStatus).HasColumnType("varchar(20)").HasDefaultValue("approved").ValueGeneratedNever();
            e.Property(x => x.OwnerWantsPublished).HasDefaultValue(true).ValueGeneratedNever();
            e.ToTable("Properties", t => t.HasCheckConstraint("CK_Properties_ReviewStatus", "[ReviewStatus] IN ('approved','pending','changes-requested','suspended')"));
        });
        model.Entity<UserAccount>(e =>
        {
            e.Property(x => x.SuspensionReason).HasMaxLength(1000);
            e.Property(x => x.SuspendedUntil).HasColumnType("datetimeoffset(0)");
            e.Property(x => x.SuspendedBy).HasMaxLength(64);
        });
        model.Entity<Report>(e => e.Property(x => x.ResolutionNotes).HasMaxLength(1000));
        model.Entity<Notification>(e => e.Property(x => x.Route).HasMaxLength(300));
    }
}
