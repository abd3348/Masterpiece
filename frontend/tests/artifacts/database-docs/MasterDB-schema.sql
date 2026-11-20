-- Campus Mate | MasterDB | SQL Server
-- Generated from database-data.js. Run once in an empty database.
-- This script does not drop tables or modify existing records.
USE [MasterDB];
GO

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
    [Active] bit NOT NULL DEFAULT 1,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id]),
    CONSTRAINT [UQ_Users_1] UNIQUE ([NormalizedEmail]),
    CONSTRAINT [CK_Users_Role] CHECK ([Role] IN (N'tenant', N'landlord', N'admin'))
);
GO

-- Housing budgets, locations and lifestyle preferences.
CREATE TABLE [dbo].[Preferences] (
    [UserId] nvarchar(64) NOT NULL,
    [MinBudget] decimal(12,3) NOT NULL,
    [MaxBudget] decimal(12,3) NOT NULL,
    [AreasJson] nvarchar(max) NOT NULL DEFAULT N'[]',
    [Destination] nvarchar(200) NULL,
    [Commute] int NULL,
    [Housing] nvarchar(50) NULL,
    [Furnishing] nvarchar(50) NULL,
    [Billing] varchar(10) NULL,
    [Roommates] bit NOT NULL DEFAULT 0,
    [RoommatesCount] varchar(3) NOT NULL DEFAULT '0',
    [Sleep] nvarchar(50) NULL,
    [Schedule] nvarchar(50) NULL,
    [Noise] tinyint NULL,
    [Cleanliness] tinyint NULL,
    [Smoking] nvarchar(50) NULL,
    [HabitsJson] nvarchar(max) NOT NULL DEFAULT N'[]',
    CONSTRAINT [PK_Preferences] PRIMARY KEY ([UserId]),
    CONSTRAINT [CK_Preferences_Billing] CHECK ([Billing] IN (N'Monthly', N'Daily')),
    CONSTRAINT [CK_Preferences_RoommatesCount] CHECK ([RoommatesCount] IN (N'0', N'1', N'2', N'3+')),
    CONSTRAINT [CK_Preferences_1] CHECK (MinBudget >= 0),
    CONSTRAINT [CK_Preferences_2] CHECK (ISJSON(AreasJson) = 1),
    CONSTRAINT [CK_Preferences_3] CHECK (Commute >= 0),
    CONSTRAINT [CK_Preferences_4] CHECK (Noise BETWEEN 1 AND 5),
    CONSTRAINT [CK_Preferences_5] CHECK (Cleanliness BETWEEN 1 AND 5),
    CONSTRAINT [CK_Preferences_6] CHECK (ISJSON(HabitsJson) = 1),
    CONSTRAINT [CK_Preferences_7] CHECK (MaxBudget >= MinBudget),
    CONSTRAINT [FK_Preferences_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id])
);
GO

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
    [HabitsJson] nvarchar(max) NOT NULL DEFAULT N'[]',
    [Available] bit NOT NULL DEFAULT 1,
    CONSTRAINT [PK_RoommateProfiles] PRIMARY KEY ([Id]),
    CONSTRAINT [UQ_RoommateProfiles_1] UNIQUE ([UserId]),
    CONSTRAINT [CK_RoommateProfiles_1] CHECK (MinBudget >= 0),
    CONSTRAINT [CK_RoommateProfiles_2] CHECK (Noise BETWEEN 1 AND 5),
    CONSTRAINT [CK_RoommateProfiles_3] CHECK (Cleanliness BETWEEN 1 AND 5),
    CONSTRAINT [CK_RoommateProfiles_4] CHECK (ISJSON(HabitsJson) = 1),
    CONSTRAINT [CK_RoommateProfiles_5] CHECK (MaxBudget >= MinBudget),
    CONSTRAINT [FK_RoommateProfiles_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id])
);
GO

-- Uploaded image and video metadata and storage keys.
CREATE TABLE [dbo].[Media] (
    [Id] nvarchar(64) NOT NULL,
    [UploadedBy] nvarchar(64) NOT NULL,
    [Name] nvarchar(255) NOT NULL,
    [StorageKey] nvarchar(500) NOT NULL,
    [ContentType] varchar(100) NOT NULL,
    [SizeBytes] bigint NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_Media] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Media_1] CHECK (SizeBytes > 0),
    CONSTRAINT [FK_Media_UploadedBy] FOREIGN KEY ([UploadedBy]) REFERENCES [dbo].[Users] ([Id])
);
GO

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
    [Status] varchar(20) NOT NULL DEFAULT 'awaiting-fee',
    [Description] nvarchar(max) NOT NULL,
    [AmenitiesJson] nvarchar(max) NOT NULL DEFAULT N'[]',
    [AvailableFrom] date NOT NULL,
    [AvailableTo] date NOT NULL,
    [Commute] int NULL,
    [Noise] tinyint NULL,
    [Cleanliness] tinyint NULL,
    [Smoking] nvarchar(50) NULL,
    [Risk] tinyint NULL,
    [RiskReasonsJson] nvarchar(max) NULL,
    [ModerationAnalysisJson] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Properties] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Properties_Period] CHECK ([Period] IN (N'Monthly', N'Daily')),
    CONSTRAINT [CK_Properties_Status] CHECK ([Status] IN (N'awaiting-fee', N'pending', N'published', N'archived', N'deleted')),
    CONSTRAINT [CK_Properties_1] CHECK (Price > 0),
    CONSTRAINT [CK_Properties_2] CHECK (Beds > 0),
    CONSTRAINT [CK_Properties_3] CHECK (Baths >= 0),
    CONSTRAINT [CK_Properties_4] CHECK (Size > 0),
    CONSTRAINT [CK_Properties_5] CHECK (ISJSON(AmenitiesJson) = 1),
    CONSTRAINT [CK_Properties_6] CHECK (Commute >= 0),
    CONSTRAINT [CK_Properties_7] CHECK (Noise BETWEEN 1 AND 5),
    CONSTRAINT [CK_Properties_8] CHECK (Cleanliness BETWEEN 1 AND 5),
    CONSTRAINT [CK_Properties_9] CHECK (Risk BETWEEN 0 AND 100),
    CONSTRAINT [CK_Properties_10] CHECK (RiskReasonsJson IS NULL OR ISJSON(RiskReasonsJson) = 1),
    CONSTRAINT [CK_Properties_11] CHECK (ModerationAnalysisJson IS NULL OR ISJSON(ModerationAnalysisJson) = 1),
    CONSTRAINT [CK_Properties_12] CHECK (AvailableTo > AvailableFrom),
    CONSTRAINT [FK_Properties_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE INDEX [IX_Properties_Search] ON [dbo].[Properties] ([Status], [City], [Area], [Price]);
CREATE INDEX [IX_Properties_Owner] ON [dbo].[Properties] ([OwnerId]);
GO

-- Photos and the optional video attached to a property.
CREATE TABLE [dbo].[PropertyMedia] (
    [PropertyId] int NOT NULL,
    [MediaId] nvarchar(64) NOT NULL,
    [Kind] varchar(10) NOT NULL,
    [SortOrder] int NOT NULL DEFAULT 0,
    CONSTRAINT [PK_PropertyMedia] PRIMARY KEY ([PropertyId], [MediaId]),
    CONSTRAINT [CK_PropertyMedia_Kind] CHECK ([Kind] IN (N'photo', N'video')),
    CONSTRAINT [CK_PropertyMedia_1] CHECK (SortOrder >= 0),
    CONSTRAINT [FK_PropertyMedia_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]),
    CONSTRAINT [FK_PropertyMedia_MediaId] FOREIGN KEY ([MediaId]) REFERENCES [dbo].[Media] ([Id])
);
GO

CREATE UNIQUE INDEX [UX_PropertyMedia_Video] ON [dbo].[PropertyMedia] ([PropertyId]) WHERE Kind = 'video';
GO

-- Properties saved by each tenant.
CREATE TABLE [dbo].[Favorites] (
    [UserId] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    CONSTRAINT [PK_Favorites] PRIMARY KEY ([UserId], [PropertyId]),
    CONSTRAINT [FK_Favorites_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_Favorites_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id])
);
GO

-- User ratings and written property reviews.
CREATE TABLE [dbo].[Reviews] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    [AuthorId] nvarchar(64) NOT NULL,
    [Rating] tinyint NOT NULL,
    [Text] nvarchar(2000) NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_Reviews] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Reviews_1] CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT [FK_Reviews_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]),
    CONSTRAINT [FK_Reviews_AuthorId] FOREIGN KEY ([AuthorId]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE INDEX [IX_Reviews_Property] ON [dbo].[Reviews] ([PropertyId]);
GO

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
    [Status] varchar(16) NOT NULL DEFAULT 'submitted',
    [PropertySnapshotJson] nvarchar(max) NOT NULL,
    [AgreedPrice] decimal(12,3) NOT NULL,
    [Deposit] decimal(12,3) NOT NULL,
    [Total] decimal(12,3) NOT NULL,
    [LandlordAccepted] bit NOT NULL DEFAULT 0,
    [TenantAccepted] bit NOT NULL DEFAULT 0,
    [AgreementSnapshotJson] nvarchar(max) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_RentalRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_RentalRequests_Period] CHECK ([Period] IN (N'Monthly', N'Daily')),
    CONSTRAINT [CK_RentalRequests_Status] CHECK ([Status] IN (N'submitted', N'approved', N'inspection', N'payment', N'active', N'closed', N'rejected')),
    CONSTRAINT [CK_RentalRequests_1] CHECK (Duration > 0),
    CONSTRAINT [CK_RentalRequests_2] CHECK (ISJSON(PropertySnapshotJson) = 1),
    CONSTRAINT [CK_RentalRequests_3] CHECK (AgreedPrice > 0),
    CONSTRAINT [CK_RentalRequests_4] CHECK (Deposit >= 0),
    CONSTRAINT [CK_RentalRequests_5] CHECK (Total >= 0),
    CONSTRAINT [CK_RentalRequests_6] CHECK (AgreementSnapshotJson IS NULL OR ISJSON(AgreementSnapshotJson) = 1),
    CONSTRAINT [CK_RentalRequests_7] CHECK (EndDate > StartDate),
    CONSTRAINT [FK_RentalRequests_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]),
    CONSTRAINT [FK_RentalRequests_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_RentalRequests_RoommateId] FOREIGN KEY ([RoommateId]) REFERENCES [dbo].[RoommateProfiles] ([Id])
);
GO

CREATE INDEX [IX_Requests_Availability] ON [dbo].[RentalRequests] ([PropertyId], [Status], [StartDate], [EndDate]);
CREATE INDEX [IX_Requests_Tenant] ON [dbo].[RentalRequests] ([TenantId], [CreatedAt]);
GO

-- Proposed rent prices and the landlord’s response.
CREATE TABLE [dbo].[RentNegotiations] (
    [Id] nvarchar(64) NOT NULL,
    [RequestId] nvarchar(64) NOT NULL,
    [Price] decimal(12,3) NOT NULL,
    [Status] varchar(12) NOT NULL,
    [ProposedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [ReviewedAt] datetimeoffset(0) NULL,
    CONSTRAINT [PK_RentNegotiations] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_RentNegotiations_Status] CHECK ([Status] IN (N'pending', N'confirmed', N'declined')),
    CONSTRAINT [CK_RentNegotiations_1] CHECK (Price > 0),
    CONSTRAINT [FK_RentNegotiations_RequestId] FOREIGN KEY ([RequestId]) REFERENCES [dbo].[RentalRequests] ([Id])
);
GO

CREATE UNIQUE INDEX [UX_RentNegotiations_Pending] ON [dbo].[RentNegotiations] ([RequestId]) WHERE Status = 'pending';
GO

-- The pre-arrangement property inspection checklist.
CREATE TABLE [dbo].[Inspections] (
    [RequestId] nvarchar(64) NOT NULL,
    [ItemsJson] nvarchar(max) NOT NULL,
    [Notes] nvarchar(4000) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_Inspections] PRIMARY KEY ([RequestId]),
    CONSTRAINT [CK_Inspections_1] CHECK (ISJSON(ItemsJson) = 1),
    CONSTRAINT [FK_Inspections_RequestId] FOREIGN KEY ([RequestId]) REFERENCES [dbo].[RentalRequests] ([Id])
);
GO

-- Confirmed direct rental arrangements and move-in state.
CREATE TABLE [dbo].[Rentals] (
    [Id] nvarchar(64) NOT NULL,
    [RequestId] nvarchar(64) NOT NULL,
    [Status] varchar(10) NOT NULL DEFAULT 'active',
    [EndDate] date NOT NULL,
    [PaymentMethod] varchar(24) NOT NULL DEFAULT 'direct-to-landlord',
    [MoveInComplete] bit NOT NULL DEFAULT 0,
    [ArrangementConfirmedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [ClosedAt] datetimeoffset(0) NULL,
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Rentals] PRIMARY KEY ([Id]),
    CONSTRAINT [UQ_Rentals_1] UNIQUE ([RequestId]),
    CONSTRAINT [CK_Rentals_Status] CHECK ([Status] IN (N'active', N'closed')),
    CONSTRAINT [CK_Rentals_PaymentMethod] CHECK ([PaymentMethod] IN (N'direct-to-landlord')),
    CONSTRAINT [FK_Rentals_RequestId] FOREIGN KEY ([RequestId]) REFERENCES [dbo].[RentalRequests] ([Id])
);
GO

-- Initial and final condition records for a rental.
CREATE TABLE [dbo].[ConditionReports] (
    [RentalId] nvarchar(64) NOT NULL,
    [Phase] varchar(10) NOT NULL,
    [SubmittedBy] nvarchar(64) NOT NULL,
    [VideoId] nvarchar(64) NULL,
    [ItemsJson] nvarchar(max) NOT NULL,
    [Notes] nvarchar(4000) NULL,
    [RecordedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_ConditionReports] PRIMARY KEY ([RentalId], [Phase]),
    CONSTRAINT [CK_ConditionReports_Phase] CHECK ([Phase] IN (N'initial', N'final')),
    CONSTRAINT [CK_ConditionReports_1] CHECK (ISJSON(ItemsJson) = 1),
    CONSTRAINT [FK_ConditionReports_RentalId] FOREIGN KEY ([RentalId]) REFERENCES [dbo].[Rentals] ([Id]),
    CONSTRAINT [FK_ConditionReports_SubmittedBy] FOREIGN KEY ([SubmittedBy]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_ConditionReports_VideoId] FOREIGN KEY ([VideoId]) REFERENCES [dbo].[Media] ([Id])
);
GO

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
    [Status] varchar(20) NOT NULL DEFAULT 'awaiting-fee',
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_PartialOffers] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_PartialOffers_Occupancy] CHECK ([Occupancy] IN (N'private', N'shared')),
    CONSTRAINT [CK_PartialOffers_Status] CHECK ([Status] IN (N'awaiting-fee', N'published', N'archived', N'deleted')),
    CONSTRAINT [CK_PartialOffers_1] CHECK (RoomNumber > 0),
    CONSTRAINT [CK_PartialOffers_2] CHECK (Price > 0),
    CONSTRAINT [CK_PartialOffers_3] CHECK (DATEDIFF(day, StartDate, EndDate) BETWEEN 1 AND 30),
    CONSTRAINT [FK_PartialOffers_RentalId] FOREIGN KEY ([RentalId]) REFERENCES [dbo].[Rentals] ([Id])
);
GO

CREATE INDEX [IX_PartialOffers_Availability] ON [dbo].[PartialOffers] ([RentalId], [RoomNumber], [Status], [StartDate], [EndDate]);
GO

-- Applications to rent a room from the current tenant.
CREATE TABLE [dbo].[PartialRequests] (
    [Id] nvarchar(64) NOT NULL,
    [ListingId] nvarchar(64) NOT NULL,
    [TenantId] nvarchar(64) NOT NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NOT NULL,
    [Status] varchar(12) NOT NULL DEFAULT 'pending',
    [OfferSnapshotJson] nvarchar(max) NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_PartialRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_PartialRequests_Status] CHECK ([Status] IN (N'pending', N'approved', N'rejected')),
    CONSTRAINT [CK_PartialRequests_1] CHECK (ISJSON(OfferSnapshotJson) = 1),
    CONSTRAINT [CK_PartialRequests_2] CHECK (EndDate > StartDate),
    CONSTRAINT [FK_PartialRequests_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [dbo].[PartialOffers] ([Id]),
    CONSTRAINT [FK_PartialRequests_TenantId] FOREIGN KEY ([TenantId]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE INDEX [IX_PartialRequests_Availability] ON [dbo].[PartialRequests] ([ListingId], [Status], [StartDate], [EndDate]);
GO

-- Property or room publishing fees, never tenant rent payments.
CREATE TABLE [dbo].[ListingFees] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NULL,
    [PartialOfferId] nvarchar(64) NULL,
    [Amount] decimal(12,3) NOT NULL,
    [Currency] char(3) NOT NULL DEFAULT 'JOD',
    [Status] varchar(10) NOT NULL DEFAULT 'unpaid',
    [Provider] varchar(50) NULL,
    [ProviderPaymentId] nvarchar(200) NULL,
    [PaidAt] datetimeoffset(0) NULL,
    [Simulated] bit NOT NULL DEFAULT 0,
    CONSTRAINT [PK_ListingFees] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_ListingFees_Currency] CHECK ([Currency] IN (N'JOD')),
    CONSTRAINT [CK_ListingFees_Status] CHECK ([Status] IN (N'unpaid', N'paid')),
    CONSTRAINT [CK_ListingFees_1] CHECK ((PropertyId IS NOT NULL AND PartialOfferId IS NULL AND Amount = 20) OR (PropertyId IS NULL AND PartialOfferId IS NOT NULL AND Amount = 5)),
    CONSTRAINT [CK_ListingFees_2] CHECK ((Status = 'paid' AND PaidAt IS NOT NULL) OR (Status = 'unpaid' AND PaidAt IS NULL)),
    CONSTRAINT [FK_ListingFees_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]),
    CONSTRAINT [FK_ListingFees_PartialOfferId] FOREIGN KEY ([PartialOfferId]) REFERENCES [dbo].[PartialOffers] ([Id])
);
GO

CREATE UNIQUE INDEX [UX_ListingFees_Property] ON [dbo].[ListingFees] ([PropertyId]) WHERE PropertyId IS NOT NULL;
CREATE UNIQUE INDEX [UX_ListingFees_Partial] ON [dbo].[ListingFees] ([PartialOfferId]) WHERE PartialOfferId IS NOT NULL;
CREATE UNIQUE INDEX [UX_ListingFees_ProviderPayment] ON [dbo].[ListingFees] ([Provider], [ProviderPaymentId]) WHERE ProviderPaymentId IS NOT NULL;
GO

-- Provider events recorded once to prevent repeated processing.
CREATE TABLE [dbo].[PaymentEvents] (
    [Provider] varchar(50) NOT NULL,
    [EventId] nvarchar(200) NOT NULL,
    [FeeId] nvarchar(64) NOT NULL,
    [ProcessedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_PaymentEvents] PRIMARY KEY ([Provider], [EventId]),
    CONSTRAINT [FK_PaymentEvents_FeeId] FOREIGN KEY ([FeeId]) REFERENCES [dbo].[ListingFees] ([Id])
);
GO

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
    [Status] varchar(12) NOT NULL DEFAULT 'pending',
    [RoomName] nvarchar(200) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    [Version] rowversion NOT NULL,
    CONSTRAINT [PK_Meetings] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Meetings_Kind] CHECK ([Kind] IN (N'property', N'roommate', N'sublet')),
    CONSTRAINT [CK_Meetings_Duration] CHECK ([Duration] IN (15, 30, 60)),
    CONSTRAINT [CK_Meetings_Status] CHECK ([Status] IN (N'pending', N'accepted', N'declined', N'cancelled')),
    CONSTRAINT [CK_Meetings_1] CHECK (CreatorId <> RecipientId),
    CONSTRAINT [CK_Meetings_2] CHECK ((Kind = 'property' AND PropertyId IS NOT NULL AND RoommateId IS NULL AND PartialRequestId IS NULL) OR (Kind = 'roommate' AND PropertyId IS NULL AND RoommateId IS NOT NULL AND PartialRequestId IS NULL) OR (Kind = 'sublet' AND PropertyId IS NULL AND RoommateId IS NULL AND PartialRequestId IS NOT NULL)),
    CONSTRAINT [FK_Meetings_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]),
    CONSTRAINT [FK_Meetings_RoommateId] FOREIGN KEY ([RoommateId]) REFERENCES [dbo].[RoommateProfiles] ([Id]),
    CONSTRAINT [FK_Meetings_PartialRequestId] FOREIGN KEY ([PartialRequestId]) REFERENCES [dbo].[PartialRequests] ([Id]),
    CONSTRAINT [FK_Meetings_CreatorId] FOREIGN KEY ([CreatorId]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_Meetings_RecipientId] FOREIGN KEY ([RecipientId]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE INDEX [IX_Meetings_Creator] ON [dbo].[Meetings] ([CreatorId], [Status], [StartsAt]);
CREATE INDEX [IX_Meetings_Recipient] ON [dbo].[Meetings] ([RecipientId], [Status], [StartsAt]);
GO

-- Requests to connect with a potential roommate.
CREATE TABLE [dbo].[RoommateContacts] (
    [Id] nvarchar(64) NOT NULL,
    [UserId] nvarchar(64) NOT NULL,
    [PersonId] nvarchar(64) NOT NULL,
    [Status] varchar(12) NOT NULL DEFAULT 'pending',
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_RoommateContacts] PRIMARY KEY ([Id]),
    CONSTRAINT [UQ_RoommateContacts_1] UNIQUE ([UserId], [PersonId]),
    CONSTRAINT [CK_RoommateContacts_Status] CHECK ([Status] IN (N'pending', N'accepted', N'rejected')),
    CONSTRAINT [FK_RoommateContacts_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_RoommateContacts_PersonId] FOREIGN KEY ([PersonId]) REFERENCES [dbo].[RoommateProfiles] ([Id])
);
GO

-- Property concerns filed by users and their resolution.
CREATE TABLE [dbo].[Reports] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    [ReporterId] nvarchar(64) NOT NULL,
    [Reason] nvarchar(200) NOT NULL,
    [Notes] nvarchar(4000) NULL,
    [Status] varchar(12) NOT NULL DEFAULT 'open',
    [Resolution] nvarchar(4000) NULL,
    [ResolvedBy] nvarchar(64) NULL,
    [ResolvedAt] datetimeoffset(0) NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_Reports] PRIMARY KEY ([Id]),
    CONSTRAINT [CK_Reports_Status] CHECK ([Status] IN (N'open', N'resolved')),
    CONSTRAINT [FK_Reports_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]),
    CONSTRAINT [FK_Reports_ReporterId] FOREIGN KEY ([ReporterId]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_Reports_ResolvedBy] FOREIGN KEY ([ResolvedBy]) REFERENCES [dbo].[Users] ([Id])
);
GO

-- Administrative decisions and correction instructions.
CREATE TABLE [dbo].[ModerationHistory] (
    [Id] nvarchar(64) NOT NULL,
    [PropertyId] int NOT NULL,
    [ReviewedBy] nvarchar(64) NOT NULL,
    [Decision] nvarchar(50) NOT NULL,
    [Reason] nvarchar(1000) NULL,
    [Notes] nvarchar(4000) NULL,
    [ReviewedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_ModerationHistory] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ModerationHistory_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id]),
    CONSTRAINT [FK_ModerationHistory_ReviewedBy] FOREIGN KEY ([ReviewedBy]) REFERENCES [dbo].[Users] ([Id])
);
GO

-- User notifications and whether they have been read.
CREATE TABLE [dbo].[Notifications] (
    [Id] nvarchar(64) NOT NULL,
    [RecipientId] nvarchar(64) NOT NULL,
    [PropertyId] int NULL,
    [PropertyTitle] nvarchar(200) NULL,
    [Type] varchar(50) NOT NULL,
    [Text] nvarchar(2000) NOT NULL,
    [IsRead] bit NOT NULL DEFAULT 0,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_Notifications] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Notifications_RecipientId] FOREIGN KEY ([RecipientId]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_Notifications_PropertyId] FOREIGN KEY ([PropertyId]) REFERENCES [dbo].[Properties] ([Id])
);
GO

CREATE INDEX [IX_Notifications_Inbox] ON [dbo].[Notifications] ([RecipientId], [IsRead], [CreatedAt]);
GO

-- Audit activity and administrator-visible support requests.
CREATE TABLE [dbo].[Activity] (
    [Id] nvarchar(64) NOT NULL,
    [ActorId] nvarchar(64) NULL,
    [Text] nvarchar(2000) NOT NULL,
    [CreatedAt] datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    CONSTRAINT [PK_Activity] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Activity_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [dbo].[Users] ([Id])
);
GO
