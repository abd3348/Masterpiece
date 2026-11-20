-- نسخة دراسية كاملة لقاعدة MasterDB، بدون جداول المحادثات النصية.
-- سكربت إنشاء: يُنفذ مرة واحدة عندما لا تكون الجداول موجودة.
-- لا يحذف الجداول القديمة من قاعدة موجودة، ولم يُنفذ على السيرفر هنا.
-- PRIMARY KEY: معرّف فريد للسجل. REFERENCES: ربط بجدول آخر.
-- UNIQUE: منع التكرار. CHECK: شرط على القيم. DEFAULT: قيمة افتراضية.
-- NULL: قيمة اختيارية. NOT NULL: قيمة مطلوبة.
-- CREATE INDEX: فهرس لتسريع الاستعلام؛ UNIQUE INDEX يمنع التكرار أيضًا.
-- GO: فاصل دفعات يفهمه SSMS، وليس أمر DML.

IF DB_ID(N'MasterDB') IS NULL
    EXEC(N'CREATE DATABASE [MasterDB]');
GO

USE [MasterDB];
GO

-- 1. حسابات المستأجرين والملاك والإدارة
CREATE TABLE dbo.Users (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    Role varchar(16) NOT NULL CHECK (Role IN ('tenant','landlord','admin')),
    FirstName nvarchar(100) NOT NULL,
    LastName nvarchar(100) NOT NULL,
    Email nvarchar(254) NOT NULL,
    NormalizedEmail nvarchar(254) NOT NULL UNIQUE,
    -- ناتج تجزئة كلمة المرور، وليس كلمة المرور الأصلية.
    PasswordHash nvarchar(max) NOT NULL,
    SecurityStamp nvarchar(64) NOT NULL,
    Phone nvarchar(32) NOT NULL,
    City nvarchar(100) NOT NULL,
    Occupation nvarchar(150) NULL,
    Destination nvarchar(200) NULL,
    Active bit NOT NULL DEFAULT 1,
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    -- قيمة ثنائية يغيّرها SQL Server عند التعديل؛ ليست تاريخًا.
    Version rowversion NOT NULL
);

-- 2. تفضيلات السكن؛ سجل واحد كحد أقصى لكل مستخدم
CREATE TABLE dbo.Preferences (
    UserId nvarchar(64) NOT NULL PRIMARY KEY REFERENCES dbo.Users(Id),
    MinBudget decimal(12,3) NOT NULL CHECK (MinBudget >= 0),
    MaxBudget decimal(12,3) NOT NULL,
    AreasJson nvarchar(max) NOT NULL DEFAULT N'[]' CHECK (ISJSON(AreasJson) = 1),
    Destination nvarchar(200) NULL,
    Commute int NULL CHECK (Commute >= 0),
    Housing nvarchar(50) NULL,
    Furnishing nvarchar(50) NULL,
    Billing varchar(10) NULL CHECK (Billing IN ('Monthly','Daily')),
    Roommates bit NOT NULL DEFAULT 0,
    -- عدد زملاء السكن المفضل كما يظهر في الواجهة.
    RoommatesCount varchar(3) NOT NULL DEFAULT '0' CHECK (RoommatesCount IN ('0','1','2','3+')),
    Sleep nvarchar(50) NULL,
    Schedule nvarchar(50) NULL,
    Noise tinyint NULL CHECK (Noise BETWEEN 1 AND 5),
    Cleanliness tinyint NULL CHECK (Cleanliness BETWEEN 1 AND 5),
    Smoking nvarchar(50) NULL,
    HabitsJson nvarchar(max) NOT NULL DEFAULT N'[]' CHECK (ISJSON(HabitsJson) = 1),
    CHECK (MaxBudget >= MinBudget)
);

-- 3. ملف زميل السكن المرتبط بحساب مستخدم فعلي
CREATE TABLE dbo.RoommateProfiles (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    UserId nvarchar(64) NOT NULL UNIQUE REFERENCES dbo.Users(Id),
    Area nvarchar(100) NOT NULL,
    MinBudget decimal(12,3) NOT NULL CHECK (MinBudget >= 0),
    MaxBudget decimal(12,3) NOT NULL,
    Sleep nvarchar(50) NOT NULL,
    Schedule nvarchar(50) NOT NULL,
    Noise tinyint NOT NULL CHECK (Noise BETWEEN 1 AND 5),
    Cleanliness tinyint NOT NULL CHECK (Cleanliness BETWEEN 1 AND 5),
    Smoking nvarchar(50) NOT NULL,
    HabitsJson nvarchar(max) NOT NULL DEFAULT N'[]' CHECK (ISJSON(HabitsJson) = 1),
    Available bit NOT NULL DEFAULT 1,
    CHECK (MaxBudget >= MinBudget)
);

-- 4. بيانات الصور والفيديو؛ الملفات نفسها محفوظة خارج قاعدة البيانات
CREATE TABLE dbo.Media (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    UploadedBy nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    Name nvarchar(255) NOT NULL,
    StorageKey nvarchar(500) NOT NULL,
    ContentType varchar(100) NOT NULL,
    SizeBytes bigint NOT NULL CHECK (SizeBytes > 0),
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- 5. إعلانات العقارات؛ كل عقار مرتبط بمالكه
CREATE TABLE dbo.Properties (
    Id int IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OwnerId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    Title nvarchar(200) NOT NULL,
    City nvarchar(100) NOT NULL,
    Area nvarchar(100) NOT NULL,
    Price decimal(12,3) NOT NULL CHECK (Price > 0),
    Period varchar(10) NOT NULL CHECK (Period IN ('Monthly','Daily')),
    Beds int NOT NULL CHECK (Beds > 0),
    Baths int NOT NULL CHECK (Baths >= 0),
    Size decimal(10,2) NOT NULL CHECK (Size > 0),
    Type nvarchar(50) NOT NULL,
    Furnished nvarchar(50) NOT NULL,
    Status varchar(20) NOT NULL DEFAULT 'awaiting-fee'
        CHECK (Status IN ('awaiting-fee','pending','published','archived','deleted')),
    Description nvarchar(max) NOT NULL,
    AmenitiesJson nvarchar(max) NOT NULL DEFAULT N'[]' CHECK (ISJSON(AmenitiesJson) = 1),
    AvailableFrom date NOT NULL,
    AvailableTo date NOT NULL,
    Commute int NULL CHECK (Commute >= 0),
    Noise tinyint NULL CHECK (Noise BETWEEN 1 AND 5),
    Cleanliness tinyint NULL CHECK (Cleanliness BETWEEN 1 AND 5),
    Smoking nvarchar(50) NULL,
    Risk tinyint NULL CHECK (Risk BETWEEN 0 AND 100),
    RiskReasonsJson nvarchar(max) NULL CHECK (RiskReasonsJson IS NULL OR ISJSON(RiskReasonsJson) = 1),
    ModerationAnalysisJson nvarchar(max) NULL CHECK (ModerationAnalysisJson IS NULL OR ISJSON(ModerationAnalysisJson) = 1),
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    -- قيمة ثنائية يغيّرها SQL Server عند التعديل؛ ليست تاريخًا.
    Version rowversion NOT NULL,
    CHECK (AvailableTo > AvailableFrom)
);
CREATE INDEX IX_Properties_Search ON dbo.Properties(Status, City, Area, Price);
CREATE INDEX IX_Properties_Owner ON dbo.Properties(OwnerId);

-- 6. ربط العقارات بالصور والفيديو
CREATE TABLE dbo.PropertyMedia (
    PropertyId int NOT NULL REFERENCES dbo.Properties(Id),
    MediaId nvarchar(64) NOT NULL REFERENCES dbo.Media(Id),
    Kind varchar(10) NOT NULL CHECK (Kind IN ('photo','video')),
    SortOrder int NOT NULL DEFAULT 0 CHECK (SortOrder >= 0),
    PRIMARY KEY (PropertyId, MediaId)
);
CREATE UNIQUE INDEX UX_PropertyMedia_Video ON dbo.PropertyMedia(PropertyId) WHERE Kind = 'video';

-- 7. العقارات المفضلة لكل مستخدم؛ منع تكرار العقار لنفس المستخدم
CREATE TABLE dbo.Favorites (
    UserId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    PropertyId int NOT NULL REFERENCES dbo.Properties(Id),
    PRIMARY KEY (UserId, PropertyId)
);

-- 8. تقييمات المستخدمين للعقارات
CREATE TABLE dbo.Reviews (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    PropertyId int NOT NULL REFERENCES dbo.Properties(Id),
    AuthorId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    Rating tinyint NOT NULL CHECK (Rating BETWEEN 1 AND 5),
    Text nvarchar(2000) NOT NULL,
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
CREATE INDEX IX_Reviews_Property ON dbo.Reviews(PropertyId);

-- 9. طلبات الإيجار وشروطها وقت إرسال الطلب
CREATE TABLE dbo.RentalRequests (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    PropertyId int NOT NULL REFERENCES dbo.Properties(Id),
    TenantId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    RoommateId nvarchar(64) NULL REFERENCES dbo.RoommateProfiles(Id),
    -- ملاحظة مرفقة بطلب الإيجار، وليست رسالة شات.
    Message nvarchar(2000) NULL,
    StartDate date NOT NULL,
    EndDate date NOT NULL,
    Duration int NOT NULL CHECK (Duration > 0),
    Period varchar(10) NOT NULL CHECK (Period IN ('Monthly','Daily')),
    Status varchar(16) NOT NULL DEFAULT 'submitted'
        CHECK (Status IN ('submitted','approved','inspection','payment','active','closed','rejected')),
    PropertySnapshotJson nvarchar(max) NOT NULL CHECK (ISJSON(PropertySnapshotJson) = 1),
    AgreedPrice decimal(12,3) NOT NULL CHECK (AgreedPrice > 0),
    Deposit decimal(12,3) NOT NULL CHECK (Deposit >= 0),
    Total decimal(12,3) NOT NULL CHECK (Total >= 0),
    LandlordAccepted bit NOT NULL DEFAULT 0,
    TenantAccepted bit NOT NULL DEFAULT 0,
    AgreementSnapshotJson nvarchar(max) NULL CHECK (AgreementSnapshotJson IS NULL OR ISJSON(AgreementSnapshotJson) = 1),
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    -- قيمة ثنائية يغيّرها SQL Server عند التعديل؛ ليست تاريخًا.
    Version rowversion NOT NULL,
    CHECK (EndDate > StartDate)
);
CREATE INDEX IX_Requests_Availability ON dbo.RentalRequests(PropertyId, Status, StartDate, EndDate);
CREATE INDEX IX_Requests_Tenant ON dbo.RentalRequests(TenantId, CreatedAt);

-- 10. عروض التفاوض على سعر الإيجار
CREATE TABLE dbo.RentNegotiations (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    RequestId nvarchar(64) NOT NULL REFERENCES dbo.RentalRequests(Id),
    Price decimal(12,3) NOT NULL CHECK (Price > 0),
    Status varchar(12) NOT NULL CHECK (Status IN ('pending','confirmed','declined')),
    ProposedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ReviewedAt datetimeoffset(0) NULL
);
CREATE UNIQUE INDEX UX_RentNegotiations_Pending ON dbo.RentNegotiations(RequestId) WHERE Status = 'pending';

-- 11. فحص العقار قبل تأكيد الاتفاق؛ فحص واحد لكل طلب
CREATE TABLE dbo.Inspections (
    RequestId nvarchar(64) NOT NULL PRIMARY KEY REFERENCES dbo.RentalRequests(Id),
    ItemsJson nvarchar(max) NOT NULL CHECK (ISJSON(ItemsJson) = 1),
    Notes nvarchar(4000) NULL,
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);

-- 12. الإيجار الناتج عن تأكيد الاتفاق؛ إيجار واحد لكل طلب
CREATE TABLE dbo.Rentals (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    RequestId nvarchar(64) NOT NULL UNIQUE REFERENCES dbo.RentalRequests(Id),
    Status varchar(10) NOT NULL DEFAULT 'active' CHECK (Status IN ('active','closed')),
    EndDate date NOT NULL,
    PaymentMethod varchar(24) NOT NULL DEFAULT 'direct-to-landlord'
        CHECK (PaymentMethod = 'direct-to-landlord'),
    MoveInComplete bit NOT NULL DEFAULT 0,
    ArrangementConfirmedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    ClosedAt datetimeoffset(0) NULL,
    -- قيمة ثنائية يغيّرها SQL Server عند التعديل؛ ليست تاريخًا.
    Version rowversion NOT NULL
);

-- 13. تقرير حالة العقار عند الاستلام وعند التسليم
CREATE TABLE dbo.ConditionReports (
    RentalId nvarchar(64) NOT NULL REFERENCES dbo.Rentals(Id),
    Phase varchar(10) NOT NULL CHECK (Phase IN ('initial','final')),
    SubmittedBy nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    VideoId nvarchar(64) NULL REFERENCES dbo.Media(Id),
    ItemsJson nvarchar(max) NOT NULL CHECK (ISJSON(ItemsJson) = 1),
    Notes nvarchar(4000) NULL,
    RecordedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    PRIMARY KEY (RentalId, Phase)
);

-- 14. عرض المستأجر غرفة من إيجاره لمدة قصيرة
CREATE TABLE dbo.PartialOffers (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    RentalId nvarchar(64) NOT NULL REFERENCES dbo.Rentals(Id),
    RoomNumber int NOT NULL CHECK (RoomNumber > 0),
    Occupancy varchar(10) NOT NULL CHECK (Occupancy IN ('private','shared')),
    StartDate date NOT NULL,
    EndDate date NOT NULL,
    Price decimal(12,3) NOT NULL CHECK (Price > 0),
    Notes nvarchar(500) NULL,
    Status varchar(20) NOT NULL DEFAULT 'awaiting-fee'
        CHECK (Status IN ('awaiting-fee','published','archived','deleted')),
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    -- قيمة ثنائية يغيّرها SQL Server عند التعديل؛ ليست تاريخًا.
    Version rowversion NOT NULL,
    CHECK (DATEDIFF(day, StartDate, EndDate) BETWEEN 1 AND 30)
);
CREATE INDEX IX_PartialOffers_Availability ON dbo.PartialOffers(RentalId, RoomNumber, Status, StartDate, EndDate);

-- 15. طلبات المستخدمين على عروض الغرف
CREATE TABLE dbo.PartialRequests (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    ListingId nvarchar(64) NOT NULL REFERENCES dbo.PartialOffers(Id),
    TenantId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    StartDate date NOT NULL,
    EndDate date NOT NULL,
    Status varchar(12) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending','approved','rejected')),
    OfferSnapshotJson nvarchar(max) NOT NULL CHECK (ISJSON(OfferSnapshotJson) = 1),
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    -- قيمة ثنائية يغيّرها SQL Server عند التعديل؛ ليست تاريخًا.
    Version rowversion NOT NULL,
    CHECK (EndDate > StartDate)
);
CREATE INDEX IX_PartialRequests_Availability ON dbo.PartialRequests(ListingId, Status, StartDate, EndDate);

-- رسم نشر واحد لكل إعلان، وأحداث الدفع محفوظة لمنع تكرار معالجتها.
-- 16. رسوم نشر إعلان العقار أو عرض الغرفة؛ ليست دفعات إيجار
CREATE TABLE dbo.ListingFees (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    PropertyId int NULL REFERENCES dbo.Properties(Id),
    PartialOfferId nvarchar(64) NULL REFERENCES dbo.PartialOffers(Id),
    Amount decimal(12,3) NOT NULL,
    Currency char(3) NOT NULL DEFAULT 'JOD' CHECK (Currency = 'JOD'),
    Status varchar(10) NOT NULL DEFAULT 'unpaid' CHECK (Status IN ('unpaid','paid')),
    Provider varchar(50) NULL,
    ProviderPaymentId nvarchar(200) NULL,
    PaidAt datetimeoffset(0) NULL,
    Simulated bit NOT NULL DEFAULT 0,
    CHECK ((PropertyId IS NOT NULL AND PartialOfferId IS NULL AND Amount = 20)
        OR (PropertyId IS NULL AND PartialOfferId IS NOT NULL AND Amount = 5)),
    CHECK ((Status = 'paid' AND PaidAt IS NOT NULL) OR (Status = 'unpaid' AND PaidAt IS NULL))
);
CREATE UNIQUE INDEX UX_ListingFees_Property ON dbo.ListingFees(PropertyId) WHERE PropertyId IS NOT NULL;
CREATE UNIQUE INDEX UX_ListingFees_Partial ON dbo.ListingFees(PartialOfferId) WHERE PartialOfferId IS NOT NULL;
CREATE UNIQUE INDEX UX_ListingFees_ProviderPayment ON dbo.ListingFees(Provider, ProviderPaymentId) WHERE ProviderPaymentId IS NOT NULL;

-- 17. أحداث مزود الدفع؛ منع معالجة الحدث نفسه أكثر من مرة
CREATE TABLE dbo.PaymentEvents (
    Provider varchar(50) NOT NULL,
    EventId nvarchar(200) NOT NULL,
    FeeId nvarchar(64) NOT NULL REFERENCES dbo.ListingFees(Id),
    ProcessedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    PRIMARY KEY (Provider, EventId)
);

-- 18. دعوات لقاءات الفيديو بين مستخدمين
CREATE TABLE dbo.Meetings (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    Kind varchar(10) NOT NULL CHECK (Kind IN ('property','roommate','sublet')),
    PropertyId int NULL REFERENCES dbo.Properties(Id),
    RoommateId nvarchar(64) NULL REFERENCES dbo.RoommateProfiles(Id),
    PartialRequestId nvarchar(64) NULL REFERENCES dbo.PartialRequests(Id),
    CreatorId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    RecipientId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    Title nvarchar(200) NOT NULL,
    StartsAt datetimeoffset(0) NOT NULL,
    Duration int NOT NULL CHECK (Duration IN (15,30,60)),
    Status varchar(12) NOT NULL DEFAULT 'pending'
        CHECK (Status IN ('pending','accepted','declined','cancelled')),
    RoomName nvarchar(200) NULL,
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    -- قيمة ثنائية يغيّرها SQL Server عند التعديل؛ ليست تاريخًا.
    Version rowversion NOT NULL,
    CHECK (CreatorId <> RecipientId),
    CHECK ((Kind = 'property' AND PropertyId IS NOT NULL AND RoommateId IS NULL AND PartialRequestId IS NULL)
        OR (Kind = 'roommate' AND PropertyId IS NULL AND RoommateId IS NOT NULL AND PartialRequestId IS NULL)
        OR (Kind = 'sublet' AND PropertyId IS NULL AND RoommateId IS NULL AND PartialRequestId IS NOT NULL))
);
CREATE INDEX IX_Meetings_Creator ON dbo.Meetings(CreatorId, Status, StartsAt);
CREATE INDEX IX_Meetings_Recipient ON dbo.Meetings(RecipientId, Status, StartsAt);

-- 19. طلبات التواصل مع زملاء السكن؛ دون محادثات نصية
CREATE TABLE dbo.RoommateContacts (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    UserId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    PersonId nvarchar(64) NOT NULL REFERENCES dbo.RoommateProfiles(Id),
    Status varchar(12) NOT NULL DEFAULT 'pending' CHECK (Status IN ('pending','accepted','rejected')),
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UNIQUE (UserId, PersonId)
);

-- 20. بلاغات المستخدمين عن العقارات
CREATE TABLE dbo.Reports (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    PropertyId int NOT NULL REFERENCES dbo.Properties(Id),
    ReporterId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    Reason nvarchar(200) NOT NULL,
    Notes nvarchar(4000) NULL,
    Status varchar(12) NOT NULL DEFAULT 'open' CHECK (Status IN ('open','resolved')),
    Resolution nvarchar(4000) NULL,
    ResolvedBy nvarchar(64) NULL REFERENCES dbo.Users(Id),
    ResolvedAt datetimeoffset(0) NULL,
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
-- 21. تاريخ قرارات الإدارة على العقارات
CREATE TABLE dbo.ModerationHistory (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    PropertyId int NOT NULL REFERENCES dbo.Properties(Id),
    ReviewedBy nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    Decision nvarchar(50) NOT NULL,
    Reason nvarchar(1000) NULL,
    Notes nvarchar(4000) NULL,
    ReviewedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
-- 22. إشعارات المستخدمين وحالة قراءتها
CREATE TABLE dbo.Notifications (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    RecipientId nvarchar(64) NOT NULL REFERENCES dbo.Users(Id),
    PropertyId int NULL REFERENCES dbo.Properties(Id),
    PropertyTitle nvarchar(200) NULL,
    Type varchar(50) NOT NULL,
    Text nvarchar(2000) NOT NULL,
    IsRead bit NOT NULL DEFAULT 0,
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
CREATE INDEX IX_Notifications_Inbox ON dbo.Notifications(RecipientId, IsRead, CreatedAt);
-- 23. سجل الأنشطة في المنصة
CREATE TABLE dbo.Activity (
    Id nvarchar(64) NOT NULL PRIMARY KEY,
    ActorId nvarchar(64) NULL REFERENCES dbo.Users(Id),
    Text nvarchar(2000) NOT NULL,
    CreatedAt datetimeoffset(0) NOT NULL DEFAULT SYSDATETIMEOFFSET()
);
