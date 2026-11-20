-- Campus Mate | MasterDB | SQL Server
-- Current application schema captured 2026-11-06; generated from database-data.js.
-- Presentation / initial-schema script. No database is created and no existing records are changed.
-- Internal SQL Server diagrams and EF migration history are excluded.
-- Existing application tables cause an error before any DDL is executed.
USE [MasterDB];
GO
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;

BEGIN TRY
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM sys.tables WHERE SCHEMA_NAME(schema_id) = N'dbo' AND name IN (N'Activity', N'ConditionReports', N'Favorites', N'Inspections', N'ListingFees', N'Media', N'Meetings', N'ModerationHistory', N'Notifications', N'PartialOffers', N'PartialRequests', N'PaymentEvents', N'Preferences', N'Properties', N'PropertyMedia', N'RentalAmendments', N'RentalRequests', N'Rentals', N'RentNegotiations', N'Reports', N'Reviews', N'RoommateContacts', N'RoommateFavorites', N'RoommateProfiles', N'Users'))
    THROW 51000, 'Application tables already exist. This documentation DDL is not an upgrade script.', 1;

-- Tenant, landlord and administrator accounts.
CREATE TABLE [dbo].[Users] (
    [Id] nvarchar(64) NOT NULL,
    [Role] varchar(16) NOT NULL,
    [FirstName] nvarchar(100) NOT NULL,
    [LastName] nvarchar(100) NOT NULL,
    [Email] nvarchar(254) NOT NULL,
    [NormalizedEmail] nvarchar(254) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [SecurityStamp] nvarchar(64) NOT NULL,
    [Phone] nvarchar(32) NOT NULL,
    [City] nvarchar(100) NOT NULL,
    [Occupation] nvarchar(150) NULL,
    [Destination] nvarchar(200) NULL,
    [Active] bit NOT NULL CONSTRAINT [DF__Users__Active__4CA06362] DEFAULT ((1)),
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Users__CreatedAt__4D94879B] DEFAULT (sysdatetimeoffset()),
    [Version] rowversion NOT NULL,
    [SuspendedBy] nvarchar(64) NULL,
    [SuspendedUntil] datetimeoffset(0) NULL,
    [SuspensionReason] nvarchar(1000) NULL,
    CONSTRAINT [PK__Users__3214EC070524A625] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [UQ__Users__368B291AC7FE6295] UNIQUE NONCLUSTERED ([NormalizedEmail] ASC),
    CONSTRAINT [CK__Users__Role__4BAC3F29] CHECK (([Role]='admin' OR [Role]='landlord' OR [Role]='tenant'))
);

-- Audit activity and administrator-visible support requests.
CREATE TABLE [dbo].[Activity] (
    [Id] nvarchar(64) NOT NULL,
    [ActorId] nvarchar(64) NULL,
    [Text] nvarchar(2000) NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Activity__Create__10216507] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__Activity__3214EC07838C8452] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK__Activity__ActorI__0F2D40CE] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Landlord property advertisements and asking prices.
CREATE TABLE [dbo].[Properties] (
    [Id] int IDENTITY(1,1) NOT NULL,
    [OwnerId] nvarchar(64) NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [City] nvarchar(100) NOT NULL,
    [Area] nvarchar(100) NOT NULL,
    [Price] decimal(12,3) NOT NULL,
    [Period] varchar(10) NOT NULL,
    [Beds] int NOT NULL,
    [Baths] int NOT NULL,
    [Size] decimal(10,2) NOT NULL,
    [Type] nvarchar(50) NOT NULL,
    [Furnished] nvarchar(50) NOT NULL,
    [Status] varchar(20) NOT NULL CONSTRAINT [DF__Propertie__Statu__72C60C4A] DEFAULT ('awaiting-fee'),
    [Description] nvarchar(max) NOT NULL,
    [AmenitiesJson] nvarchar(max) NOT NULL CONSTRAINT [DF__Propertie__Ameni__74AE54BC] DEFAULT (N'[]'),
    [AvailableFrom] date NOT NULL,
    [AvailableTo] date NOT NULL,
    [Commute] int NULL,
    [Noise] tinyint NULL,
    [Cleanliness] tinyint NULL,
    [Smoking] nvarchar(50) NULL,
    [Risk] tinyint NULL,
    [RiskReasonsJson] nvarchar(max) NULL,
    [ModerationAnalysisJson] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Propertie__Creat__7C4F7684] DEFAULT (sysdatetimeoffset()),
    [Version] rowversion NOT NULL,
    [OwnerWantsPublished] bit NOT NULL CONSTRAINT [DF__Propertie__Owner__22401542] DEFAULT (CONVERT([bit],(1))),
    [ReviewStatus] varchar(20) NOT NULL CONSTRAINT [DF__Propertie__Revie__2334397B] DEFAULT ('approved'),
    CONSTRAINT [PK__Properti__3214EC07292E5D39] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__Propertie__Ameni__75A278F5] CHECK ((isjson([AmenitiesJson])=(1))),
    CONSTRAINT [CK__Propertie__Baths__70DDC3D8] CHECK (([Baths]>=(0))),
    CONSTRAINT [CK__Propertie__Clean__787EE5A0] CHECK (([Cleanliness]>=(1) AND [Cleanliness]<=(5))),
    CONSTRAINT [CK__Propertie__Commu__76969D2E] CHECK (([Commute]>=(0))),
    CONSTRAINT [CK__Propertie__Moder__7B5B524B] CHECK (([ModerationAnalysisJson] IS NULL OR isjson([ModerationAnalysisJson])=(1))),
    CONSTRAINT [CK__Propertie__Noise__778AC167] CHECK (([Noise]>=(1) AND [Noise]<=(5))),
    CONSTRAINT [CK__Propertie__Perio__6EF57B66] CHECK (([Period]='Daily' OR [Period]='Monthly')),
    CONSTRAINT [CK__Propertie__Price__6E01572D] CHECK (([Price]>(0))),
    CONSTRAINT [CK__Propertie__RiskR__7A672E12] CHECK (([RiskReasonsJson] IS NULL OR isjson([RiskReasonsJson])=(1))),
    CONSTRAINT [CK__Propertie__Statu__73BA3083] CHECK (([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='pending' OR [Status]='awaiting-fee')),
    CONSTRAINT [CK__Properties__7D439ABD] CHECK (([AvailableTo]>[AvailableFrom])),
    CONSTRAINT [CK__Properties__Beds__6FE99F9F] CHECK (([Beds]>(0))),
    CONSTRAINT [CK__Properties__Risk__797309D9] CHECK (([Risk]>=(0) AND [Risk]<=(100))),
    CONSTRAINT [CK__Properties__Size__71D1E811] CHECK (([Size]>(0))),
    CONSTRAINT [CK_Properties_ReviewStatus] CHECK (([ReviewStatus]='suspended' OR [ReviewStatus]='changes-requested' OR [ReviewStatus]='pending' OR [ReviewStatus]='approved')),
    CONSTRAINT [FK__Propertie__Owner__6D0D32F4] FOREIGN KEY ([OwnerId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_Properties_Search] ON [dbo].[Properties] ([Status] ASC, [City] ASC, [Area] ASC, [Price] ASC);
CREATE NONCLUSTERED INDEX [IX_Properties_Owner] ON [dbo].[Properties] ([OwnerId] ASC);

-- Public roommate profiles linked to real user accounts.
CREATE TABLE [dbo].[RoommateProfiles] (
    [Id] nvarchar(64) NOT NULL,
    [UserId] nvarchar(64) NOT NULL,
    [Area] nvarchar(100) NOT NULL,
    [MinBudget] decimal(12,3) NOT NULL,
    [MaxBudget] decimal(12,3) NOT NULL,
    [Sleep] nvarchar(50) NOT NULL,
    [Schedule] nvarchar(50) NOT NULL,
    [Noise] tinyint NOT NULL,
    [Cleanliness] tinyint NOT NULL,
    [Smoking] nvarchar(50) NOT NULL,
    [HabitsJson] nvarchar(max) NOT NULL CONSTRAINT [DF__RoommateP__Habit__628FA481] DEFAULT (N'[]'),
    [Available] bit NOT NULL CONSTRAINT [DF__RoommateP__Avail__6477ECF3] DEFAULT ((1)),
    CONSTRAINT [PK__Roommate__3214EC07D313DD77] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [UQ__Roommate__1788CC4D41B84DF9] UNIQUE NONCLUSTERED ([UserId] ASC),
    CONSTRAINT [CK__RoommateP__Clean__619B8048] CHECK (([Cleanliness]>=(1) AND [Cleanliness]<=(5))),
    CONSTRAINT [CK__RoommateP__Habit__6383C8BA] CHECK ((isjson([HabitsJson])=(1))),
    CONSTRAINT [CK__RoommateP__MinBu__5FB337D6] CHECK (([MinBudget]>=(0))),
    CONSTRAINT [CK__RoommateP__Noise__60A75C0F] CHECK (([Noise]>=(1) AND [Noise]<=(5))),
    CONSTRAINT [CK__RoommateProfiles__656C112C] CHECK (([MaxBudget]>=[MinBudget])),
    CONSTRAINT [FK__RoommateP__UserI__5EBF139D] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Rental applications, negotiated prices and snapshots of agreed terms.
CREATE TABLE [dbo].[RentalRequests] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    [TenantId] nvarchar(64) NOT NULL,
    [RoommateId] nvarchar(64) NULL,
    [Message] nvarchar(2000) NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NOT NULL,
    [Duration] int NOT NULL,
    [Period] varchar(10) NOT NULL,
    [Status] varchar(16) NOT NULL CONSTRAINT [DF__RentalReq__Statu__151B244E] DEFAULT ('submitted'),
    [PropertySnapshotJson] nvarchar(max) NOT NULL,
    [AgreedPrice] decimal(12,3) NOT NULL,
    [Deposit] decimal(12,3) NOT NULL,
    [Total] decimal(12,3) NOT NULL,
    [LandlordAccepted] bit NOT NULL CONSTRAINT [DF__RentalReq__Landl__1AD3FDA4] DEFAULT ((0)),
    [TenantAccepted] bit NOT NULL CONSTRAINT [DF__RentalReq__Tenan__1BC821DD] DEFAULT ((0)),
    [AgreementSnapshotJson] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__RentalReq__Creat__1DB06A4F] DEFAULT (sysdatetimeoffset()),
    [Version] rowversion NOT NULL,
    [InvitationExpiresAt] datetimeoffset(0) NULL,
    [InvitationStatus] varchar(16) NULL,
    [RoommateAccepted] bit NOT NULL CONSTRAINT [DF__RentalReq__Roomm__1F63A897] DEFAULT (CONVERT([bit],(0))),
    [RoommateUserId] nvarchar(64) NULL,
    [TermsVersion] int NOT NULL CONSTRAINT [DF__RentalReq__Terms__2057CCD0] DEFAULT ((1)),
    [WorkflowVersion] int NOT NULL CONSTRAINT [DF__RentalReq__Workf__214BF109] DEFAULT ((1)),
    CONSTRAINT [PK__RentalRe__3214EC07D3D04F4D] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__RentalReq__Agree__17F790F9] CHECK (([AgreedPrice]>(0))),
    CONSTRAINT [CK__RentalReq__Agree__1CBC4616] CHECK (([AgreementSnapshotJson] IS NULL OR isjson([AgreementSnapshotJson])=(1))),
    CONSTRAINT [CK__RentalReq__Depos__18EBB532] CHECK (([Deposit]>=(0))),
    CONSTRAINT [CK__RentalReq__Durat__1332DBDC] CHECK (([Duration]>(0))),
    CONSTRAINT [CK__RentalReq__Perio__14270015] CHECK (([Period]='Daily' OR [Period]='Monthly')),
    CONSTRAINT [CK__RentalReq__Prope__17036CC0] CHECK ((isjson([PropertySnapshotJson])=(1))),
    CONSTRAINT [CK__RentalReq__Statu__160F4887] CHECK (([Status]='cancelled' OR [Status]='rejected' OR [Status]='closed' OR [Status]='active' OR [Status]='confirmed' OR [Status]='payment' OR [Status]='agreement' OR [Status]='inspection' OR [Status]='approved' OR [Status]='submitted' OR [Status]='waiting-roommate' OR [Status]='draft')),
    CONSTRAINT [CK__RentalReq__Total__19DFD96B] CHECK (([Total]>=(0))),
    CONSTRAINT [CK__RentalRequests__1EA48E88] CHECK (([EndDate]>[StartDate])),
    CONSTRAINT [CK_RentalRequests_Invitation] CHECK (([InvitationStatus] IS NULL OR ([InvitationStatus]='expired' OR [InvitationStatus]='cancelled' OR [InvitationStatus]='declined' OR [InvitationStatus]='accepted' OR [InvitationStatus]='pending'))),
    CONSTRAINT [FK__RentalReq__Prope__10566F31] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__RentalReq__Roomm__123EB7A3] FOREIGN KEY ([RoommateId]) REFERENCES [dbo].[RoommateProfiles] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__RentalReq__Tenan__114A936A] FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK_RentalRequests_Users_RoommateUserId] FOREIGN KEY ([RoommateUserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_Requests_Availability] ON [dbo].[RentalRequests] ([PropertyId] ASC, [Status] ASC, [StartDate] ASC, [EndDate] ASC);
CREATE NONCLUSTERED INDEX [IX_Requests_Tenant] ON [dbo].[RentalRequests] ([TenantId] ASC, [CreatedAt] ASC);

-- Confirmed direct rental arrangements and move-in state.
CREATE TABLE [dbo].[Rentals] (
    [Id] nvarchar(64) NOT NULL,
    [RequestId] nvarchar(64) NOT NULL,
    [Status] varchar(10) NOT NULL CONSTRAINT [DF__Rentals__Status__2DE6D218] DEFAULT ('active'),
    [EndDate] date NOT NULL,
    [PaymentMethod] varchar(24) NOT NULL CONSTRAINT [DF__Rentals__Payment__2FCF1A8A] DEFAULT ('direct-to-landlord'),
    [MoveInComplete] bit NOT NULL CONSTRAINT [DF__Rentals__MoveInC__31B762FC] DEFAULT ((0)),
    [ArrangementConfirmedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Rentals__Arrange__32AB8735] DEFAULT (sysdatetimeoffset()),
    [ClosedAt] datetimeoffset(0) NULL,
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK__Rentals__3214EC07F5B08839] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [UQ__Rentals__33A8517BDD3147A3] UNIQUE NONCLUSTERED ([RequestId] ASC),
    CONSTRAINT [CK__Rentals__Payment__30C33EC3] CHECK (([PaymentMethod]='direct-to-landlord')),
    CONSTRAINT [CK__Rentals__Status__2EDAF651] CHECK (([Status]='closed' OR [Status]='active' OR [Status]='upcoming')),
    CONSTRAINT [FK__Rentals__Request__2CF2ADDF] FOREIGN KEY ([RequestId]) REFERENCES [dbo].[RentalRequests] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Uploaded image and video metadata and storage keys.
CREATE TABLE [dbo].[Media] (
    [Id] nvarchar(64) NOT NULL,
    [UploadedBy] nvarchar(64) NOT NULL,
    [Name] nvarchar(255) NOT NULL,
    [StorageKey] nvarchar(500) NOT NULL,
    [ContentType] varchar(100) NOT NULL,
    [SizeBytes] bigint NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Media__CreatedAt__6A30C649] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__Media__3214EC07606AA2C1] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__Media__SizeBytes__693CA210] CHECK (([SizeBytes]>(0))),
    CONSTRAINT [FK__Media__UploadedB__68487DD7] FOREIGN KEY ([UploadedBy]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Initial and final condition records for a rental.
CREATE TABLE [dbo].[ConditionReports] (
    [RentalId] nvarchar(64) NOT NULL,
    [Phase] varchar(10) NOT NULL,
    [SubmittedBy] nvarchar(64) NOT NULL,
    [VideoId] nvarchar(64) NULL,
    [ItemsJson] nvarchar(max) NOT NULL,
    [Notes] nvarchar(4000) NULL,
    [RecordedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Condition__Recor__3A4CA8FD] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__Conditio__42D1B081FFEF8208] PRIMARY KEY CLUSTERED ([RentalId] ASC, [Phase] ASC),
    CONSTRAINT [CK__Condition__Items__395884C4] CHECK ((isjson([ItemsJson])=(1))),
    CONSTRAINT [CK__Condition__Phase__367C1819] CHECK (([Phase]='final' OR [Phase]='initial')),
    CONSTRAINT [FK__Condition__Renta__3587F3E0] FOREIGN KEY ([RentalId]) REFERENCES [dbo].[Rentals] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Condition__Submi__37703C52] FOREIGN KEY ([SubmittedBy]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Condition__Video__3864608B] FOREIGN KEY ([VideoId]) REFERENCES [dbo].[Media] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Properties saved by each tenant.
CREATE TABLE [dbo].[Favorites] (
    [UserId] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    CONSTRAINT [PK__Favorite__5084563FFB4C6FCD] PRIMARY KEY CLUSTERED ([UserId] ASC, [PropertyId] ASC),
    CONSTRAINT [FK__Favorites__Prope__07C12930] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Favorites__UserI__06CD04F7] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- The pre-arrangement property inspection checklist.
CREATE TABLE [dbo].[Inspections] (
    [RequestId] nvarchar(64) NOT NULL,
    [ItemsJson] nvarchar(max) NOT NULL,
    [Notes] nvarchar(4000) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Inspectio__Creat__29221CFB] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__Inspecti__33A8517AD79D29BB] PRIMARY KEY CLUSTERED ([RequestId] ASC),
    CONSTRAINT [CK__Inspectio__Items__282DF8C2] CHECK ((isjson([ItemsJson])=(1))),
    CONSTRAINT [FK__Inspectio__Reque__2739D489] FOREIGN KEY ([RequestId]) REFERENCES [dbo].[RentalRequests] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Short-term room offers inside an existing rental.
CREATE TABLE [dbo].[PartialOffers] (
    [Id] nvarchar(64) NOT NULL,
    [RentalId] nvarchar(64) NOT NULL,
    [RoomNumber] int NOT NULL,
    [Occupancy] varchar(10) NOT NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NOT NULL,
    [Price] decimal(12,3) NOT NULL,
    [Notes] nvarchar(500) NULL,
    [Status] varchar(20) NOT NULL CONSTRAINT [DF__PartialOf__Statu__40F9A68C] DEFAULT ('awaiting-fee'),
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__PartialOf__Creat__42E1EEFE] DEFAULT (sysdatetimeoffset()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK__PartialO__3214EC0788C9D097] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__PartialOf__Occup__3F115E1A] CHECK (([Occupancy]='shared' OR [Occupancy]='private')),
    CONSTRAINT [CK__PartialOf__Price__40058253] CHECK (([Price]>(0))),
    CONSTRAINT [CK__PartialOf__RoomN__3E1D39E1] CHECK (([RoomNumber]>(0))),
    CONSTRAINT [CK__PartialOf__Statu__41EDCAC5] CHECK (([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='awaiting-fee')),
    CONSTRAINT [CK__PartialOffers__43D61337] CHECK ((datediff(day,[StartDate],[EndDate])>=(1) AND datediff(day,[StartDate],[EndDate])<=(30))),
    CONSTRAINT [FK__PartialOf__Renta__3D2915A8] FOREIGN KEY ([RentalId]) REFERENCES [dbo].[Rentals] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_PartialOffers_Availability] ON [dbo].[PartialOffers] ([RentalId] ASC, [RoomNumber] ASC, [Status] ASC, [StartDate] ASC, [EndDate] ASC);

-- Property or room publishing fees, never tenant rent payments.
CREATE TABLE [dbo].[ListingFees] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NULL,
    [PartialOfferId] nvarchar(64) NULL,
    [Amount] decimal(12,3) NOT NULL,
    [Currency] char(3) NOT NULL CONSTRAINT [DF__ListingFe__Curre__51300E55] DEFAULT ('JOD'),
    [Status] varchar(10) NOT NULL CONSTRAINT [DF__ListingFe__Statu__531856C7] DEFAULT ('unpaid'),
    [Provider] varchar(50) NULL,
    [ProviderPaymentId] nvarchar(200) NULL,
    [PaidAt] datetimeoffset(0) NULL,
    [Simulated] bit NOT NULL CONSTRAINT [DF__ListingFe__Simul__55009F39] DEFAULT ((0)),
    CONSTRAINT [PK__ListingF__3214EC074B1B3B79] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__ListingFe__Curre__5224328E] CHECK (([Currency]='JOD')),
    CONSTRAINT [CK__ListingFe__Statu__540C7B00] CHECK (([Status]='paid' OR [Status]='unpaid')),
    CONSTRAINT [CK__ListingFees__55F4C372] CHECK (([PropertyId] IS NOT NULL AND [PartialOfferId] IS NULL AND [Amount]=(20) OR [PropertyId] IS NULL AND [PartialOfferId] IS NOT NULL AND [Amount]=(5))),
    CONSTRAINT [CK__ListingFees__56E8E7AB] CHECK (([Status]='paid' AND [PaidAt] IS NOT NULL OR [Status]='unpaid' AND [PaidAt] IS NULL)),
    CONSTRAINT [FK__ListingFe__Parti__503BEA1C] FOREIGN KEY ([PartialOfferId]) REFERENCES [dbo].[PartialOffers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__ListingFe__Prope__4F47C5E3] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE NONCLUSTERED INDEX [UX_ListingFees_Property] ON [dbo].[ListingFees] ([PropertyId] ASC) WHERE ([PropertyId] IS NOT NULL);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ListingFees_Partial] ON [dbo].[ListingFees] ([PartialOfferId] ASC) WHERE ([PartialOfferId] IS NOT NULL);
CREATE UNIQUE NONCLUSTERED INDEX [UX_ListingFees_ProviderPayment] ON [dbo].[ListingFees] ([Provider] ASC, [ProviderPaymentId] ASC) WHERE ([ProviderPaymentId] IS NOT NULL);

-- Applications to rent a room from the current tenant.
CREATE TABLE [dbo].[PartialRequests] (
    [Id] nvarchar(64) NOT NULL,
    [ListingId] nvarchar(64) NOT NULL,
    [TenantId] nvarchar(64) NOT NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NOT NULL,
    [Status] varchar(12) NOT NULL CONSTRAINT [DF__PartialRe__Statu__489AC854] DEFAULT ('pending'),
    [OfferSnapshotJson] nvarchar(max) NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__PartialRe__Creat__4B7734FF] DEFAULT (sysdatetimeoffset()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK__PartialR__3214EC07D1A8E644] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__PartialRe__Offer__4A8310C6] CHECK ((isjson([OfferSnapshotJson])=(1))),
    CONSTRAINT [CK__PartialRe__Statu__498EEC8D] CHECK (([Status]='rejected' OR [Status]='approved' OR [Status]='pending')),
    CONSTRAINT [CK__PartialRequests__4C6B5938] CHECK (([EndDate]>[StartDate])),
    CONSTRAINT [FK__PartialRe__Listi__46B27FE2] FOREIGN KEY ([ListingId]) REFERENCES [dbo].[PartialOffers] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__PartialRe__Tenan__47A6A41B] FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_PartialRequests_Availability] ON [dbo].[PartialRequests] ([ListingId] ASC, [Status] ASC, [StartDate] ASC, [EndDate] ASC);

-- Video invitations between two users with scheduled times.
CREATE TABLE [dbo].[Meetings] (
    [Id] nvarchar(64) NOT NULL,
    [Kind] varchar(10) NOT NULL,
    [PropertyId] int NULL,
    [RoommateId] nvarchar(64) NULL,
    [PartialRequestId] nvarchar(64) NULL,
    [CreatorId] nvarchar(64) NOT NULL,
    [RecipientId] nvarchar(64) NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [StartsAt] datetimeoffset(0) NOT NULL,
    [Duration] int NOT NULL,
    [Status] varchar(12) NOT NULL CONSTRAINT [DF__Meetings__Status__6442E2C9] DEFAULT ('pending'),
    [RoomName] nvarchar(200) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Meetings__Create__662B2B3B] DEFAULT (sysdatetimeoffset()),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK__Meetings__3214EC073A5B8DDF] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__Meetings__671F4F74] CHECK (([CreatorId]<>[RecipientId])),
    CONSTRAINT [CK__Meetings__681373AD] CHECK (([Kind]='property' AND [PropertyId] IS NOT NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NULL OR [Kind]='roommate' AND [PropertyId] IS NULL AND [RoommateId] IS NOT NULL AND [PartialRequestId] IS NULL OR [Kind]='sublet' AND [PropertyId] IS NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NOT NULL)),
    CONSTRAINT [CK__Meetings__Durati__634EBE90] CHECK (([Duration]=(60) OR [Duration]=(30) OR [Duration]=(15))),
    CONSTRAINT [CK__Meetings__Kind__5D95E53A] CHECK (([Kind]='sublet' OR [Kind]='roommate' OR [Kind]='property')),
    CONSTRAINT [CK__Meetings__Status__65370702] CHECK (([Status]='cancelled' OR [Status]='declined' OR [Status]='accepted' OR [Status]='pending')),
    CONSTRAINT [FK__Meetings__Creato__6166761E] FOREIGN KEY ([CreatorId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Meetings__Partia__607251E5] FOREIGN KEY ([PartialRequestId]) REFERENCES [dbo].[PartialRequests] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Meetings__Proper__5E8A0973] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Meetings__Recipi__625A9A57] FOREIGN KEY ([RecipientId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Meetings__Roomma__5F7E2DAC] FOREIGN KEY ([RoommateId]) REFERENCES [dbo].[RoommateProfiles] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_Meetings_Creator] ON [dbo].[Meetings] ([CreatorId] ASC, [Status] ASC, [StartsAt] ASC);
CREATE NONCLUSTERED INDEX [IX_Meetings_Recipient] ON [dbo].[Meetings] ([RecipientId] ASC, [Status] ASC, [StartsAt] ASC);

-- Administrative decisions and correction instructions.
CREATE TABLE [dbo].[ModerationHistory] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    [ReviewedBy] nvarchar(64) NOT NULL,
    [Decision] nvarchar(50) NOT NULL,
    [Reason] nvarchar(1000) NULL,
    [Notes] nvarchar(4000) NULL,
    [ReviewedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Moderatio__Revie__0697FACD] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__Moderati__3214EC0799CB4481] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK__Moderatio__Prope__04AFB25B] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Moderatio__Revie__05A3D694] FOREIGN KEY ([ReviewedBy]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- User notifications and whether they have been read.
CREATE TABLE [dbo].[Notifications] (
    [Id] nvarchar(64) NOT NULL,
    [RecipientId] nvarchar(64) NOT NULL,
    [PropertyId] int NULL,
    [PropertyTitle] nvarchar(200) NULL,
    [Type] varchar(50) NOT NULL,
    [Text] nvarchar(2000) NOT NULL,
    [IsRead] bit NOT NULL CONSTRAINT [DF__Notificat__IsRea__0B5CAFEA] DEFAULT ((0)),
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Notificat__Creat__0C50D423] DEFAULT (sysdatetimeoffset()),
    [Route] nvarchar(300) NULL,
    CONSTRAINT [PK__Notifica__3214EC07406A9A08] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK__Notificat__Prope__0A688BB1] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Notificat__Recip__09746778] FOREIGN KEY ([RecipientId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_Notifications_Inbox] ON [dbo].[Notifications] ([RecipientId] ASC, [IsRead] ASC, [CreatedAt] ASC);

-- Provider events recorded once to prevent repeated processing.
CREATE TABLE [dbo].[PaymentEvents] (
    [Provider] varchar(50) NOT NULL,
    [EventId] nvarchar(200) NOT NULL,
    [FeeId] nvarchar(64) NOT NULL,
    [ProcessedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__PaymentEv__Proce__5AB9788F] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__PaymentE__8ED02D8BFB5D3DB4] PRIMARY KEY CLUSTERED ([Provider] ASC, [EventId] ASC),
    CONSTRAINT [FK__PaymentEv__FeeId__59C55456] FOREIGN KEY ([FeeId]) REFERENCES [dbo].[ListingFees] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Housing budgets, locations and lifestyle preferences.
CREATE TABLE [dbo].[Preferences] (
    [UserId] nvarchar(64) NOT NULL,
    [MinBudget] decimal(12,3) NOT NULL,
    [MaxBudget] decimal(12,3) NOT NULL,
    [AreasJson] nvarchar(max) NOT NULL CONSTRAINT [DF__Preferenc__Areas__52593CB8] DEFAULT (N'[]'),
    [Destination] nvarchar(200) NULL,
    [Commute] int NULL,
    [Housing] nvarchar(50) NULL,
    [Furnishing] nvarchar(50) NULL,
    [Billing] varchar(10) NULL,
    [Roommates] bit NOT NULL CONSTRAINT [DF__Preferenc__Roomm__5629CD9C] DEFAULT ((0)),
    [Sleep] nvarchar(50) NULL,
    [Schedule] nvarchar(50) NULL,
    [Noise] tinyint NULL,
    [Cleanliness] tinyint NULL,
    [Smoking] nvarchar(50) NULL,
    [HabitsJson] nvarchar(max) NOT NULL CONSTRAINT [DF__Preferenc__Habit__59063A47] DEFAULT (N'[]'),
    [RoommatesCount] varchar(3) NOT NULL CONSTRAINT [DF_Preferences_RoommatesCount] DEFAULT ('0'),
    CONSTRAINT [PK__Preferen__1788CC4C165A8C91] PRIMARY KEY CLUSTERED ([UserId] ASC),
    CONSTRAINT [CK__Preferenc__Areas__534D60F1] CHECK ((isjson([AreasJson])=(1))),
    CONSTRAINT [CK__Preferenc__Billi__5535A963] CHECK (([Billing]='Daily' OR [Billing]='Monthly')),
    CONSTRAINT [CK__Preferenc__Clean__5812160E] CHECK (([Cleanliness]>=(1) AND [Cleanliness]<=(5))),
    CONSTRAINT [CK__Preferenc__Commu__5441852A] CHECK (([Commute]>=(0))),
    CONSTRAINT [CK__Preferenc__Habit__59FA5E80] CHECK ((isjson([HabitsJson])=(1))),
    CONSTRAINT [CK__Preferenc__MinBu__5165187F] CHECK (([MinBudget]>=(0))),
    CONSTRAINT [CK__Preferenc__Noise__571DF1D5] CHECK (([Noise]>=(1) AND [Noise]<=(5))),
    CONSTRAINT [CK__Preferences__5AEE82B9] CHECK (([MaxBudget]>=[MinBudget])),
    CONSTRAINT [CK_Preferences_RoommatesCount] CHECK (([RoommatesCount]='3+' OR [RoommatesCount]='2' OR [RoommatesCount]='1' OR [RoommatesCount]='0')),
    CONSTRAINT [FK__Preferenc__UserI__5070F446] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Photos and the optional video attached to a property.
CREATE TABLE [dbo].[PropertyMedia] (
    [PropertyId] int NOT NULL,
    [MediaId] nvarchar(64) NOT NULL,
    [Kind] varchar(10) NOT NULL,
    [SortOrder] int NOT NULL CONSTRAINT [DF__PropertyM__SortO__02FC7413] DEFAULT ((0)),
    CONSTRAINT [PK__Property__9BE58C69C4AA6747] PRIMARY KEY CLUSTERED ([PropertyId] ASC, [MediaId] ASC),
    CONSTRAINT [CK__PropertyM__SortO__03F0984C] CHECK (([SortOrder]>=(0))),
    CONSTRAINT [CK__PropertyMe__Kind__02084FDA] CHECK (([Kind]='video' OR [Kind]='photo')),
    CONSTRAINT [FK__PropertyM__Media__01142BA1] FOREIGN KEY ([MediaId]) REFERENCES [dbo].[Media] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__PropertyM__Prope__00200768] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE NONCLUSTERED INDEX [UX_PropertyMedia_Video] ON [dbo].[PropertyMedia] ([PropertyId] ASC) WHERE ([Kind]='video');

-- Immutable proposed changes to confirmed rentals, with original terms and individual approval records.
CREATE TABLE [dbo].[RentalAmendments] (
    [Id] nvarchar(64) NOT NULL,
    [RentalId] nvarchar(64) NOT NULL,
    [ProposedBy] nvarchar(64) NOT NULL,
    [BaseTermsVersion] int NOT NULL,
    [OriginalTermsJson] nvarchar(max) NOT NULL,
    [ProposedTermsJson] nvarchar(max) NOT NULL,
    [RequiredApproversJson] nvarchar(max) NOT NULL,
    [ApprovedByJson] nvarchar(max) NOT NULL,
    [Status] varchar(16) NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL,
    CONSTRAINT [PK_RentalAmendments] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK_RentalAmendments_Status] CHECK (([Status]='cancelled' OR [Status]='rejected' OR [Status]='approved' OR [Status]='pending')),
    CONSTRAINT [FK_RentalAmendments_Rentals_RentalId] FOREIGN KEY ([RentalId]) REFERENCES [dbo].[Rentals] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK_RentalAmendments_Users_ProposedBy] FOREIGN KEY ([ProposedBy]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Proposed rent prices and the landlord’s response.
CREATE TABLE [dbo].[RentNegotiations] (
    [Id] nvarchar(64) NOT NULL,
    [RequestId] nvarchar(64) NOT NULL,
    [Price] decimal(12,3) NOT NULL,
    [Status] varchar(12) NOT NULL,
    [ProposedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__RentNegot__Propo__245D67DE] DEFAULT (sysdatetimeoffset()),
    [ReviewedAt] datetimeoffset(0) NULL,
    CONSTRAINT [PK__RentNego__3214EC070EE2713B] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__RentNegot__Price__22751F6C] CHECK (([Price]>(0))),
    CONSTRAINT [CK__RentNegot__Statu__236943A5] CHECK (([Status]='declined' OR [Status]='confirmed' OR [Status]='pending')),
    CONSTRAINT [FK__RentNegot__Reque__2180FB33] FOREIGN KEY ([RequestId]) REFERENCES [dbo].[RentalRequests] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE UNIQUE NONCLUSTERED INDEX [UX_RentNegotiations_Pending] ON [dbo].[RentNegotiations] ([RequestId] ASC) WHERE ([Status]='pending');

-- Property concerns filed by users and their resolution.
CREATE TABLE [dbo].[Reports] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    [ReporterId] nvarchar(64) NOT NULL,
    [Reason] nvarchar(200) NOT NULL,
    [Notes] nvarchar(4000) NULL,
    [Status] varchar(12) NOT NULL CONSTRAINT [DF__Reports__Status__7EF6D905] DEFAULT ('open'),
    [Resolution] nvarchar(4000) NULL,
    [ResolvedBy] nvarchar(64) NULL,
    [ResolvedAt] datetimeoffset(0) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Reports__Created__01D345B0] DEFAULT (sysdatetimeoffset()),
    [ActionTakenAt] datetimeoffset(7) NULL,
    [ResolutionNotes] nvarchar(1000) NULL,
    CONSTRAINT [PK__Reports__3214EC077C35DAB8] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__Reports__Status__7FEAFD3E] CHECK (([Status]='resolved' OR [Status]='open')),
    CONSTRAINT [FK__Reports__Propert__7D0E9093] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Reports__Reporte__7E02B4CC] FOREIGN KEY ([ReporterId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Reports__Resolve__00DF2177] FOREIGN KEY ([ResolvedBy]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- User ratings and written property reviews.
CREATE TABLE [dbo].[Reviews] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    [AuthorId] nvarchar(64) NOT NULL,
    [Rating] tinyint NOT NULL,
    [Text] nvarchar(2000) NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__Reviews__Created__0D7A0286] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__Reviews__3214EC0722BD8AEC] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK__Reviews__Rating__0C85DE4D] CHECK (([Rating]>=(1) AND [Rating]<=(5))),
    CONSTRAINT [FK__Reviews__AuthorI__0B91BA14] FOREIGN KEY ([AuthorId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__Reviews__Propert__0A9D95DB] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

CREATE NONCLUSTERED INDEX [IX_Reviews_Property] ON [dbo].[Reviews] ([PropertyId] ASC);

-- Requests to connect with a potential roommate.
CREATE TABLE [dbo].[RoommateContacts] (
    [Id] nvarchar(64) NOT NULL,
    [UserId] nvarchar(64) NOT NULL,
    [PersonId] nvarchar(64) NOT NULL,
    [Status] varchar(12) NOT NULL CONSTRAINT [DF__RoommateC__Statu__6DCC4D03] DEFAULT ('pending'),
    [CreatedAt] datetimeoffset(0) NOT NULL CONSTRAINT [DF__RoommateC__Creat__6FB49575] DEFAULT (sysdatetimeoffset()),
    CONSTRAINT [PK__Roommate__3214EC07BA937107] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [UQ__Roommate__5D2A33F3603424A6] UNIQUE NONCLUSTERED ([UserId] ASC, [PersonId] ASC),
    CONSTRAINT [CK__RoommateC__Statu__6EC0713C] CHECK (([Status]='rejected' OR [Status]='accepted' OR [Status]='pending')),
    CONSTRAINT [FK__RoommateC__Perso__6CD828CA] FOREIGN KEY ([PersonId]) REFERENCES [dbo].[RoommateProfiles] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK__RoommateC__UserI__6BE40491] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- Saved roommate profiles per account; saving does not imply rental consent.
CREATE TABLE [dbo].[RoommateFavorites] (
    [UserId] nvarchar(64) NOT NULL,
    [RoommateId] nvarchar(64) NOT NULL,
    CONSTRAINT [PK_RoommateFavorites] PRIMARY KEY CLUSTERED ([UserId] ASC, [RoommateId] ASC),
    CONSTRAINT [FK_RoommateFavorites_RoommateProfiles_RoommateId] FOREIGN KEY ([RoommateId]) REFERENCES [dbo].[RoommateProfiles] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT [FK_RoommateFavorites_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE NO ACTION ON UPDATE NO ACTION
);

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
