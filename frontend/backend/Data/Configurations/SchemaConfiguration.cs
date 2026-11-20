using CampusMate.Models;
using Microsoft.EntityFrameworkCore;

namespace CampusMate.Data.Configurations;

// Keep legacy SQL constraint names so future migrations target the existing schema.
internal static class SchemaConfiguration
{
    public static void ConfigureSchema(this ModelBuilder model)
    {
        model.Entity<ActivityEntry>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Activity__3214EC07838C8452");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ActorId).HasConstraintName("FK__Activity__ActorI__0F2D40CE").OnDelete(DeleteBehavior.NoAction);
        });
        model.Entity<ConditionReport>(entity =>
        {
            entity.HasKey(x => new { x.RentalId, x.Phase }).HasName("PK__Conditio__42D1B081FFEF8208");
            entity.Property(x => x.RecordedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<Rental>().WithMany().HasForeignKey(x => x.RentalId).HasConstraintName("FK__Condition__Renta__3587F3E0").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.SubmittedBy).HasConstraintName("FK__Condition__Submi__37703C52").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<MediaFile>().WithMany().HasForeignKey(x => x.VideoId).HasConstraintName("FK__Condition__Video__3864608B").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("ConditionReports", table =>
            {
                table.HasCheckConstraint("CK__Condition__Phase__367C1819", "([Phase]='final' OR [Phase]='initial')");
                table.HasCheckConstraint("CK__Condition__Items__395884C4", "(isjson([ItemsJson])=(1))");
            });
        });
        model.Entity<Favorite>(entity =>
        {
            entity.HasKey(x => new { x.UserId, x.PropertyId }).HasName("PK__Favorite__5084563FFB4C6FCD");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.UserId).HasConstraintName("FK__Favorites__UserI__06CD04F7").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__Favorites__Prope__07C12930").OnDelete(DeleteBehavior.NoAction);
        });
        model.Entity<Inspection>(entity =>
        {
            entity.HasKey(x => x.RequestId).HasName("PK__Inspecti__33A8517AD79D29BB");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<RentalRequest>().WithMany().HasForeignKey(x => x.RequestId).HasConstraintName("FK__Inspectio__Reque__2739D489").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Inspections", table =>
            {
                table.HasCheckConstraint("CK__Inspectio__Items__282DF8C2", "(isjson([ItemsJson])=(1))");
            });
        });
        model.Entity<ListingFee>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__ListingF__3214EC074B1B3B79");
            entity.HasIndex(x => x.PropertyId).HasDatabaseName("UX_ListingFees_Property").IsUnique().HasFilter("([PropertyId] IS NOT NULL)");
            entity.HasIndex(x => x.PartialOfferId).HasDatabaseName("UX_ListingFees_Partial").IsUnique().HasFilter("([PartialOfferId] IS NOT NULL)");
            entity.HasIndex(x => new { x.Provider, x.ProviderPaymentId }).HasDatabaseName("UX_ListingFees_ProviderPayment").IsUnique().HasFilter("([ProviderPaymentId] IS NOT NULL)");
            entity.Property(x => x.Currency).HasDefaultValueSql("('JOD')");
            entity.Property(x => x.Status).HasDefaultValueSql("('unpaid')");
            entity.Property(x => x.Simulated).HasDefaultValueSql("((0))");
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__ListingFe__Prope__4F47C5E3").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<PartialOffer>().WithMany().HasForeignKey(x => x.PartialOfferId).HasConstraintName("FK__ListingFe__Parti__503BEA1C").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("ListingFees", table =>
            {
                table.HasCheckConstraint("CK__ListingFe__Curre__5224328E", "([Currency]='JOD')");
                table.HasCheckConstraint("CK__ListingFe__Statu__540C7B00", "([Status]='paid' OR [Status]='unpaid')");
                table.HasCheckConstraint("CK__ListingFees__55F4C372", "([PropertyId] IS NOT NULL AND [PartialOfferId] IS NULL AND [Amount]=(20) OR [PropertyId] IS NULL AND [PartialOfferId] IS NOT NULL AND [Amount]=(5))");
                table.HasCheckConstraint("CK__ListingFees__56E8E7AB", "([Status]='paid' AND [PaidAt] IS NOT NULL OR [Status]='unpaid' AND [PaidAt] IS NULL)");
            });
        });
        model.Entity<MediaFile>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Media__3214EC07606AA2C1");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.UploadedBy).HasConstraintName("FK__Media__UploadedB__68487DD7").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Media", table =>
            {
                table.HasCheckConstraint("CK__Media__SizeBytes__693CA210", "([SizeBytes]>(0))");
            });
        });
        model.Entity<Meeting>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Meetings__3214EC073A5B8DDF");
            entity.HasIndex(x => new { x.CreatorId, x.Status, x.StartsAt }).HasDatabaseName("IX_Meetings_Creator");
            entity.HasIndex(x => new { x.RecipientId, x.Status, x.StartsAt }).HasDatabaseName("IX_Meetings_Recipient");
            entity.Property(x => x.Status).HasDefaultValueSql("('pending')");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__Meetings__Proper__5E8A0973").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<RoommateProfile>().WithMany().HasForeignKey(x => x.RoommateId).HasConstraintName("FK__Meetings__Roomma__5F7E2DAC").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<PartialRequest>().WithMany().HasForeignKey(x => x.PartialRequestId).HasConstraintName("FK__Meetings__Partia__607251E5").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.CreatorId).HasConstraintName("FK__Meetings__Creato__6166761E").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.RecipientId).HasConstraintName("FK__Meetings__Recipi__625A9A57").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Meetings", table =>
            {
                table.HasCheckConstraint("CK__Meetings__Kind__5D95E53A", "([Kind]='sublet' OR [Kind]='roommate' OR [Kind]='property')");
                table.HasCheckConstraint("CK__Meetings__Durati__634EBE90", "([Duration]=(60) OR [Duration]=(30) OR [Duration]=(15))");
                table.HasCheckConstraint("CK__Meetings__Status__65370702", "([Status]='cancelled' OR [Status]='declined' OR [Status]='accepted' OR [Status]='pending')");
                table.HasCheckConstraint("CK__Meetings__671F4F74", "([CreatorId]<>[RecipientId])");
                table.HasCheckConstraint("CK__Meetings__681373AD", "([Kind]='property' AND [PropertyId] IS NOT NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NULL OR [Kind]='roommate' AND [PropertyId] IS NULL AND [RoommateId] IS NOT NULL AND [PartialRequestId] IS NULL OR [Kind]='sublet' AND [PropertyId] IS NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NOT NULL)");
            });
        });
        model.Entity<ModerationDecision>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Moderati__3214EC0799CB4481");
            entity.Property(x => x.ReviewedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__Moderatio__Prope__04AFB25B").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ReviewedBy).HasConstraintName("FK__Moderatio__Revie__05A3D694").OnDelete(DeleteBehavior.NoAction);
        });
        model.Entity<Notification>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Notifica__3214EC07406A9A08");
            entity.HasIndex(x => new { x.RecipientId, x.IsRead, x.CreatedAt }).HasDatabaseName("IX_Notifications_Inbox");
            entity.Property(x => x.IsRead).HasDefaultValueSql("((0))");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.RecipientId).HasConstraintName("FK__Notificat__Recip__09746778").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__Notificat__Prope__0A688BB1").OnDelete(DeleteBehavior.NoAction);
        });
        model.Entity<PartialOffer>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__PartialO__3214EC0788C9D097");
            entity.HasIndex(x => new { x.RentalId, x.RoomNumber, x.Status, x.StartDate, x.EndDate }).HasDatabaseName("IX_PartialOffers_Availability");
            entity.Property(x => x.Status).HasDefaultValueSql("('awaiting-fee')");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<Rental>().WithMany().HasForeignKey(x => x.RentalId).HasConstraintName("FK__PartialOf__Renta__3D2915A8").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("PartialOffers", table =>
            {
                table.HasCheckConstraint("CK__PartialOf__RoomN__3E1D39E1", "([RoomNumber]>(0))");
                table.HasCheckConstraint("CK__PartialOf__Occup__3F115E1A", "([Occupancy]='shared' OR [Occupancy]='private')");
                table.HasCheckConstraint("CK__PartialOf__Price__40058253", "([Price]>(0))");
                table.HasCheckConstraint("CK__PartialOf__Statu__41EDCAC5", "([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='awaiting-fee')");
                table.HasCheckConstraint("CK__PartialOffers__43D61337", "(datediff(day,[StartDate],[EndDate])>=(1) AND datediff(day,[StartDate],[EndDate])<=(30))");
            });
        });
        model.Entity<PartialRequest>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__PartialR__3214EC07D1A8E644");
            entity.HasIndex(x => new { x.ListingId, x.Status, x.StartDate, x.EndDate }).HasDatabaseName("IX_PartialRequests_Availability");
            entity.Property(x => x.Status).HasDefaultValueSql("('pending')");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<PartialOffer>().WithMany().HasForeignKey(x => x.ListingId).HasConstraintName("FK__PartialRe__Listi__46B27FE2").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.TenantId).HasConstraintName("FK__PartialRe__Tenan__47A6A41B").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("PartialRequests", table =>
            {
                table.HasCheckConstraint("CK__PartialRe__Statu__498EEC8D", "([Status]='rejected' OR [Status]='approved' OR [Status]='pending')");
                table.HasCheckConstraint("CK__PartialRe__Offer__4A8310C6", "(isjson([OfferSnapshotJson])=(1))");
                table.HasCheckConstraint("CK__PartialRequests__4C6B5938", "([EndDate]>[StartDate])");
            });
        });
        model.Entity<PaymentEvent>(entity =>
        {
            entity.HasKey(x => new { x.Provider, x.EventId }).HasName("PK__PaymentE__8ED02D8BFB5D3DB4");
            entity.Property(x => x.ProcessedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<ListingFee>().WithMany().HasForeignKey(x => x.FeeId).HasConstraintName("FK__PaymentEv__FeeId__59C55456").OnDelete(DeleteBehavior.NoAction);
        });
        model.Entity<HousingPreference>(entity =>
        {
            entity.HasKey(x => x.UserId).HasName("PK__Preferen__1788CC4C165A8C91");
            entity.Property(x => x.AreasJson).HasDefaultValueSql("(N'[]')");
            entity.Property(x => x.Roommates).HasDefaultValueSql("((0))");
            entity.Property(x => x.HabitsJson).HasDefaultValueSql("(N'[]')");
            entity.Property(x => x.RoommatesCount).HasDefaultValueSql("('0')");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.UserId).HasConstraintName("FK__Preferenc__UserI__5070F446").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Preferences", table =>
            {
                table.HasCheckConstraint("CK_Preferences_RoommatesCount", "([RoommatesCount]='3+' OR [RoommatesCount]='2' OR [RoommatesCount]='1' OR [RoommatesCount]='0')");
                table.HasCheckConstraint("CK__Preferenc__MinBu__5165187F", "([MinBudget]>=(0))");
                table.HasCheckConstraint("CK__Preferenc__Areas__534D60F1", "(isjson([AreasJson])=(1))");
                table.HasCheckConstraint("CK__Preferenc__Commu__5441852A", "([Commute]>=(0))");
                table.HasCheckConstraint("CK__Preferenc__Billi__5535A963", "([Billing]='Daily' OR [Billing]='Monthly')");
                table.HasCheckConstraint("CK__Preferenc__Noise__571DF1D5", "([Noise]>=(1) AND [Noise]<=(5))");
                table.HasCheckConstraint("CK__Preferenc__Clean__5812160E", "([Cleanliness]>=(1) AND [Cleanliness]<=(5))");
                table.HasCheckConstraint("CK__Preferenc__Habit__59FA5E80", "(isjson([HabitsJson])=(1))");
                table.HasCheckConstraint("CK__Preferences__5AEE82B9", "([MaxBudget]>=[MinBudget])");
            });
        });
        model.Entity<PropertyListing>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Properti__3214EC07292E5D39");
            entity.HasIndex(x => new { x.Status, x.City, x.Area, x.Price }).HasDatabaseName("IX_Properties_Search");
            entity.HasIndex(x => x.OwnerId).HasDatabaseName("IX_Properties_Owner");
            entity.Property(x => x.Id).UseIdentityColumn();
            entity.Property(x => x.Status).HasDefaultValueSql("('awaiting-fee')");
            entity.Property(x => x.AmenitiesJson).HasDefaultValueSql("(N'[]')");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.OwnerId).HasConstraintName("FK__Propertie__Owner__6D0D32F4").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Properties", table =>
            {
                table.HasCheckConstraint("CK__Propertie__Price__6E01572D", "([Price]>(0))");
                table.HasCheckConstraint("CK__Propertie__Perio__6EF57B66", "([Period]='Daily' OR [Period]='Monthly')");
                table.HasCheckConstraint("CK__Properties__Beds__6FE99F9F", "([Beds]>(0))");
                table.HasCheckConstraint("CK__Propertie__Baths__70DDC3D8", "([Baths]>=(0))");
                table.HasCheckConstraint("CK__Properties__Size__71D1E811", "([Size]>(0))");
                table.HasCheckConstraint("CK__Propertie__Statu__73BA3083", "([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='pending' OR [Status]='awaiting-fee')");
                table.HasCheckConstraint("CK__Propertie__Ameni__75A278F5", "(isjson([AmenitiesJson])=(1))");
                table.HasCheckConstraint("CK__Propertie__Commu__76969D2E", "([Commute]>=(0))");
                table.HasCheckConstraint("CK__Propertie__Noise__778AC167", "([Noise]>=(1) AND [Noise]<=(5))");
                table.HasCheckConstraint("CK__Propertie__Clean__787EE5A0", "([Cleanliness]>=(1) AND [Cleanliness]<=(5))");
                table.HasCheckConstraint("CK__Properties__Risk__797309D9", "([Risk]>=(0) AND [Risk]<=(100))");
                table.HasCheckConstraint("CK__Propertie__RiskR__7A672E12", "([RiskReasonsJson] IS NULL OR isjson([RiskReasonsJson])=(1))");
                table.HasCheckConstraint("CK__Propertie__Moder__7B5B524B", "([ModerationAnalysisJson] IS NULL OR isjson([ModerationAnalysisJson])=(1))");
                table.HasCheckConstraint("CK__Properties__7D439ABD", "([AvailableTo]>[AvailableFrom])");
            });
        });
        model.Entity<PropertyMedia>(entity =>
        {
            entity.HasKey(x => new { x.PropertyId, x.MediaId }).HasName("PK__Property__9BE58C69C4AA6747");
            entity.HasIndex(x => x.PropertyId).HasDatabaseName("UX_PropertyMedia_Video").IsUnique().HasFilter("([Kind]='video')");
            entity.Property(x => x.SortOrder).HasDefaultValueSql("((0))");
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__PropertyM__Prope__00200768").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<MediaFile>().WithMany().HasForeignKey(x => x.MediaId).HasConstraintName("FK__PropertyM__Media__01142BA1").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("PropertyMedia", table =>
            {
                table.HasCheckConstraint("CK__PropertyMe__Kind__02084FDA", "([Kind]='video' OR [Kind]='photo')");
                table.HasCheckConstraint("CK__PropertyM__SortO__03F0984C", "([SortOrder]>=(0))");
            });
        });
        model.Entity<RentalRequest>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__RentalRe__3214EC07D3D04F4D");
            entity.HasIndex(x => new { x.PropertyId, x.Status, x.StartDate, x.EndDate }).HasDatabaseName("IX_Requests_Availability");
            entity.HasIndex(x => new { x.TenantId, x.CreatedAt }).HasDatabaseName("IX_Requests_Tenant");
            entity.Property(x => x.Status).HasDefaultValueSql("('submitted')");
            entity.Property(x => x.LandlordAccepted).HasDefaultValueSql("((0))");
            entity.Property(x => x.TenantAccepted).HasDefaultValueSql("((0))");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__RentalReq__Prope__10566F31").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.TenantId).HasConstraintName("FK__RentalReq__Tenan__114A936A").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<RoommateProfile>().WithMany().HasForeignKey(x => x.RoommateId).HasConstraintName("FK__RentalReq__Roomm__123EB7A3").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("RentalRequests", table =>
            {
                table.HasCheckConstraint("CK__RentalReq__Durat__1332DBDC", "([Duration]>(0))");
                table.HasCheckConstraint("CK__RentalReq__Perio__14270015", "([Period]='Daily' OR [Period]='Monthly')");
                table.HasCheckConstraint("CK__RentalReq__Statu__160F4887", "([Status]='rejected' OR [Status]='closed' OR [Status]='active' OR [Status]='payment' OR [Status]='inspection' OR [Status]='approved' OR [Status]='submitted')");
                table.HasCheckConstraint("CK__RentalReq__Prope__17036CC0", "(isjson([PropertySnapshotJson])=(1))");
                table.HasCheckConstraint("CK__RentalReq__Agree__17F790F9", "([AgreedPrice]>(0))");
                table.HasCheckConstraint("CK__RentalReq__Depos__18EBB532", "([Deposit]>=(0))");
                table.HasCheckConstraint("CK__RentalReq__Total__19DFD96B", "([Total]>=(0))");
                table.HasCheckConstraint("CK__RentalReq__Agree__1CBC4616", "([AgreementSnapshotJson] IS NULL OR isjson([AgreementSnapshotJson])=(1))");
                table.HasCheckConstraint("CK__RentalRequests__1EA48E88", "([EndDate]>[StartDate])");
            });
        });
        model.Entity<Rental>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Rentals__3214EC07F5B08839");
            entity.HasIndex(x => x.RequestId).HasDatabaseName("UQ__Rentals__33A8517BDD3147A3").IsUnique();
            entity.Property(x => x.Status).HasDefaultValueSql("('active')");
            entity.Property(x => x.PaymentMethod).HasDefaultValueSql("('direct-to-landlord')");
            entity.Property(x => x.MoveInComplete).HasDefaultValueSql("((0))");
            entity.Property(x => x.ArrangementConfirmedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<RentalRequest>().WithMany().HasForeignKey(x => x.RequestId).HasConstraintName("FK__Rentals__Request__2CF2ADDF").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Rentals", table =>
            {
                table.HasCheckConstraint("CK__Rentals__Status__2EDAF651", "([Status]='closed' OR [Status]='active')");
                table.HasCheckConstraint("CK__Rentals__Payment__30C33EC3", "([PaymentMethod]='direct-to-landlord')");
            });
        });
        model.Entity<RentNegotiation>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__RentNego__3214EC070EE2713B");
            entity.HasIndex(x => x.RequestId).HasDatabaseName("UX_RentNegotiations_Pending").IsUnique().HasFilter("([Status]='pending')");
            entity.Property(x => x.ProposedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<RentalRequest>().WithMany().HasForeignKey(x => x.RequestId).HasConstraintName("FK__RentNegot__Reque__2180FB33").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("RentNegotiations", table =>
            {
                table.HasCheckConstraint("CK__RentNegot__Price__22751F6C", "([Price]>(0))");
                table.HasCheckConstraint("CK__RentNegot__Statu__236943A5", "([Status]='declined' OR [Status]='confirmed' OR [Status]='pending')");
            });
        });
        model.Entity<Report>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Reports__3214EC077C35DAB8");
            entity.Property(x => x.Status).HasDefaultValueSql("('open')");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ResolvedBy).HasConstraintName("FK__Reports__Resolve__00DF2177").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__Reports__Propert__7D0E9093").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.ReporterId).HasConstraintName("FK__Reports__Reporte__7E02B4CC").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Reports", table =>
            {
                table.HasCheckConstraint("CK__Reports__Status__7FEAFD3E", "([Status]='resolved' OR [Status]='open')");
            });
        });
        model.Entity<Review>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Reviews__3214EC0722BD8AEC");
            entity.HasIndex(x => x.PropertyId).HasDatabaseName("IX_Reviews_Property");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<PropertyListing>().WithMany().HasForeignKey(x => x.PropertyId).HasConstraintName("FK__Reviews__Propert__0A9D95DB").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.AuthorId).HasConstraintName("FK__Reviews__AuthorI__0B91BA14").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("Reviews", table =>
            {
                table.HasCheckConstraint("CK__Reviews__Rating__0C85DE4D", "([Rating]>=(1) AND [Rating]<=(5))");
            });
        });
        model.Entity<RoommateContact>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Roommate__3214EC07BA937107");
            entity.HasIndex(x => new { x.UserId, x.PersonId }).HasDatabaseName("UQ__Roommate__5D2A33F3603424A6").IsUnique();
            entity.Property(x => x.Status).HasDefaultValueSql("('pending')");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.UserId).HasConstraintName("FK__RoommateC__UserI__6BE40491").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<RoommateProfile>().WithMany().HasForeignKey(x => x.PersonId).HasConstraintName("FK__RoommateC__Perso__6CD828CA").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("RoommateContacts", table =>
            {
                table.HasCheckConstraint("CK__RoommateC__Statu__6EC0713C", "([Status]='rejected' OR [Status]='accepted' OR [Status]='pending')");
            });
        });
        model.Entity<RoommateProfile>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Roommate__3214EC07D313DD77");
            entity.HasIndex(x => x.UserId).HasDatabaseName("UQ__Roommate__1788CC4D41B84DF9").IsUnique();
            entity.Property(x => x.HabitsJson).HasDefaultValueSql("(N'[]')");
            entity.Property(x => x.Available).HasDefaultValueSql("((1))");
            entity.HasOne<UserAccount>().WithMany().HasForeignKey(x => x.UserId).HasConstraintName("FK__RoommateP__UserI__5EBF139D").OnDelete(DeleteBehavior.NoAction);
            entity.ToTable("RoommateProfiles", table =>
            {
                table.HasCheckConstraint("CK__RoommateP__MinBu__5FB337D6", "([MinBudget]>=(0))");
                table.HasCheckConstraint("CK__RoommateP__Noise__60A75C0F", "([Noise]>=(1) AND [Noise]<=(5))");
                table.HasCheckConstraint("CK__RoommateP__Clean__619B8048", "([Cleanliness]>=(1) AND [Cleanliness]<=(5))");
                table.HasCheckConstraint("CK__RoommateP__Habit__6383C8BA", "(isjson([HabitsJson])=(1))");
                table.HasCheckConstraint("CK__RoommateProfiles__656C112C", "([MaxBudget]>=[MinBudget])");
            });
        });
        model.Entity<UserAccount>(entity =>
        {
            entity.HasKey(x => x.Id).HasName("PK__Users__3214EC070524A625");
            entity.HasIndex(x => x.NormalizedEmail).HasDatabaseName("UQ__Users__368B291AC7FE6295").IsUnique();
            entity.Property(x => x.Active).HasDefaultValueSql("((1))");
            entity.Property(x => x.CreatedAt).HasDefaultValueSql("(sysdatetimeoffset())");
            entity.ToTable("Users", table =>
            {
                table.HasCheckConstraint("CK__Users__Role__4BAC3F29", "([Role]='admin' OR [Role]='landlord' OR [Role]='tenant')");
            });
        });
    }
}
