using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusMate.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Role = table.Column<string>(type: "varchar(16)", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(254)", nullable: false),
                    NormalizedEmail = table.Column<string>(type: "nvarchar(254)", nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SecurityStamp = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(32)", nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    Occupation = table.Column<string>(type: "nvarchar(150)", nullable: true),
                    Destination = table.Column<string>(type: "nvarchar(200)", nullable: true),
                    Active = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((1))"),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    Version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Users__3214EC070524A625", x => x.Id);
                    table.CheckConstraint("CK__Users__Role__4BAC3F29", "([Role]='admin' OR [Role]='landlord' OR [Role]='tenant')");
                });

            migrationBuilder.CreateTable(
                name: "Activity",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    ActorId = table.Column<string>(type: "nvarchar(64)", nullable: true),
                    Text = table.Column<string>(type: "nvarchar(2000)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Activity__3214EC07838C8452", x => x.Id);
                    table.ForeignKey(
                        name: "FK__Activity__ActorI__0F2D40CE",
                        column: x => x.ActorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Media",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    UploadedBy = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(255)", nullable: false),
                    StorageKey = table.Column<string>(type: "nvarchar(500)", nullable: false),
                    ContentType = table.Column<string>(type: "varchar(100)", nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Media__3214EC07606AA2C1", x => x.Id);
                    table.CheckConstraint("CK__Media__SizeBytes__693CA210", "([SizeBytes]>(0))");
                    table.ForeignKey(
                        name: "FK__Media__UploadedB__68487DD7",
                        column: x => x.UploadedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Preferences",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    MinBudget = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    MaxBudget = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    AreasJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValueSql: "(N'[]')"),
                    Destination = table.Column<string>(type: "nvarchar(200)", nullable: true),
                    Commute = table.Column<int>(type: "int", nullable: true),
                    Housing = table.Column<string>(type: "nvarchar(50)", nullable: true),
                    Furnishing = table.Column<string>(type: "nvarchar(50)", nullable: true),
                    Billing = table.Column<string>(type: "varchar(10)", nullable: true),
                    Roommates = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((0))"),
                    RoommatesCount = table.Column<string>(type: "varchar(3)", nullable: false, defaultValueSql: "('0')"),
                    Sleep = table.Column<string>(type: "nvarchar(50)", nullable: true),
                    Schedule = table.Column<string>(type: "nvarchar(50)", nullable: true),
                    Noise = table.Column<byte>(type: "tinyint", nullable: true),
                    Cleanliness = table.Column<byte>(type: "tinyint", nullable: true),
                    Smoking = table.Column<string>(type: "nvarchar(50)", nullable: true),
                    HabitsJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValueSql: "(N'[]')")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Preferen__1788CC4C165A8C91", x => x.UserId);
                    table.CheckConstraint("CK__Preferenc__Areas__534D60F1", "(isjson([AreasJson])=(1))");
                    table.CheckConstraint("CK__Preferenc__Billi__5535A963", "([Billing]='Daily' OR [Billing]='Monthly')");
                    table.CheckConstraint("CK__Preferenc__Clean__5812160E", "([Cleanliness]>=(1) AND [Cleanliness]<=(5))");
                    table.CheckConstraint("CK__Preferenc__Commu__5441852A", "([Commute]>=(0))");
                    table.CheckConstraint("CK__Preferenc__Habit__59FA5E80", "(isjson([HabitsJson])=(1))");
                    table.CheckConstraint("CK__Preferenc__MinBu__5165187F", "([MinBudget]>=(0))");
                    table.CheckConstraint("CK__Preferenc__Noise__571DF1D5", "([Noise]>=(1) AND [Noise]<=(5))");
                    table.CheckConstraint("CK__Preferences__5AEE82B9", "([MaxBudget]>=[MinBudget])");
                    table.CheckConstraint("CK_Preferences_RoommatesCount", "([RoommatesCount]='3+' OR [RoommatesCount]='2' OR [RoommatesCount]='1' OR [RoommatesCount]='0')");
                    table.ForeignKey(
                        name: "FK__Preferenc__UserI__5070F446",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Properties",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    OwnerId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", nullable: false),
                    City = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    Area = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    Period = table.Column<string>(type: "varchar(10)", nullable: false),
                    Beds = table.Column<int>(type: "int", nullable: false),
                    Baths = table.Column<int>(type: "int", nullable: false),
                    Size = table.Column<decimal>(type: "decimal(10,2)", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    Furnished = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    Status = table.Column<string>(type: "varchar(20)", nullable: false, defaultValueSql: "('awaiting-fee')"),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AmenitiesJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValueSql: "(N'[]')"),
                    AvailableFrom = table.Column<DateOnly>(type: "date", nullable: false),
                    AvailableTo = table.Column<DateOnly>(type: "date", nullable: false),
                    Commute = table.Column<int>(type: "int", nullable: true),
                    Noise = table.Column<byte>(type: "tinyint", nullable: true),
                    Cleanliness = table.Column<byte>(type: "tinyint", nullable: true),
                    Smoking = table.Column<string>(type: "nvarchar(50)", nullable: true),
                    Risk = table.Column<byte>(type: "tinyint", nullable: true),
                    RiskReasonsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ModerationAnalysisJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    Version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Properti__3214EC07292E5D39", x => x.Id);
                    table.CheckConstraint("CK__Propertie__Ameni__75A278F5", "(isjson([AmenitiesJson])=(1))");
                    table.CheckConstraint("CK__Propertie__Baths__70DDC3D8", "([Baths]>=(0))");
                    table.CheckConstraint("CK__Propertie__Clean__787EE5A0", "([Cleanliness]>=(1) AND [Cleanliness]<=(5))");
                    table.CheckConstraint("CK__Propertie__Commu__76969D2E", "([Commute]>=(0))");
                    table.CheckConstraint("CK__Propertie__Moder__7B5B524B", "([ModerationAnalysisJson] IS NULL OR isjson([ModerationAnalysisJson])=(1))");
                    table.CheckConstraint("CK__Propertie__Noise__778AC167", "([Noise]>=(1) AND [Noise]<=(5))");
                    table.CheckConstraint("CK__Propertie__Perio__6EF57B66", "([Period]='Daily' OR [Period]='Monthly')");
                    table.CheckConstraint("CK__Propertie__Price__6E01572D", "([Price]>(0))");
                    table.CheckConstraint("CK__Propertie__RiskR__7A672E12", "([RiskReasonsJson] IS NULL OR isjson([RiskReasonsJson])=(1))");
                    table.CheckConstraint("CK__Propertie__Statu__73BA3083", "([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='pending' OR [Status]='awaiting-fee')");
                    table.CheckConstraint("CK__Properties__7D439ABD", "([AvailableTo]>[AvailableFrom])");
                    table.CheckConstraint("CK__Properties__Beds__6FE99F9F", "([Beds]>(0))");
                    table.CheckConstraint("CK__Properties__Risk__797309D9", "([Risk]>=(0) AND [Risk]<=(100))");
                    table.CheckConstraint("CK__Properties__Size__71D1E811", "([Size]>(0))");
                    table.ForeignKey(
                        name: "FK__Propertie__Owner__6D0D32F4",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RoommateProfiles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Area = table.Column<string>(type: "nvarchar(100)", nullable: false),
                    MinBudget = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    MaxBudget = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    Sleep = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    Schedule = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    Noise = table.Column<byte>(type: "tinyint", nullable: false),
                    Cleanliness = table.Column<byte>(type: "tinyint", nullable: false),
                    Smoking = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    HabitsJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValueSql: "(N'[]')"),
                    Available = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((1))")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Roommate__3214EC07D313DD77", x => x.Id);
                    table.CheckConstraint("CK__RoommateP__Clean__619B8048", "([Cleanliness]>=(1) AND [Cleanliness]<=(5))");
                    table.CheckConstraint("CK__RoommateP__Habit__6383C8BA", "(isjson([HabitsJson])=(1))");
                    table.CheckConstraint("CK__RoommateP__MinBu__5FB337D6", "([MinBudget]>=(0))");
                    table.CheckConstraint("CK__RoommateP__Noise__60A75C0F", "([Noise]>=(1) AND [Noise]<=(5))");
                    table.CheckConstraint("CK__RoommateProfiles__656C112C", "([MaxBudget]>=[MinBudget])");
                    table.ForeignKey(
                        name: "FK__RoommateP__UserI__5EBF139D",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Favorites",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Favorite__5084563FFB4C6FCD", x => new { x.UserId, x.PropertyId });
                    table.ForeignKey(
                        name: "FK__Favorites__Prope__07C12930",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Favorites__UserI__06CD04F7",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ModerationHistory",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    ReviewedBy = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Decision = table.Column<string>(type: "nvarchar(50)", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(1000)", nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(4000)", nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Moderati__3214EC0799CB4481", x => x.Id);
                    table.ForeignKey(
                        name: "FK__Moderatio__Prope__04AFB25B",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Moderatio__Revie__05A3D694",
                        column: x => x.ReviewedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RecipientId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: true),
                    PropertyTitle = table.Column<string>(type: "nvarchar(200)", nullable: true),
                    Type = table.Column<string>(type: "varchar(50)", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(2000)", nullable: false),
                    IsRead = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((0))"),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Notifica__3214EC07406A9A08", x => x.Id);
                    table.ForeignKey(
                        name: "FK__Notificat__Prope__0A688BB1",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Notificat__Recip__09746778",
                        column: x => x.RecipientId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PropertyMedia",
                columns: table => new
                {
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    MediaId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Kind = table.Column<string>(type: "varchar(10)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false, defaultValueSql: "((0))")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Property__9BE58C69C4AA6747", x => new { x.PropertyId, x.MediaId });
                    table.CheckConstraint("CK__PropertyM__SortO__03F0984C", "([SortOrder]>=(0))");
                    table.CheckConstraint("CK__PropertyMe__Kind__02084FDA", "([Kind]='video' OR [Kind]='photo')");
                    table.ForeignKey(
                        name: "FK__PropertyM__Media__01142BA1",
                        column: x => x.MediaId,
                        principalTable: "Media",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__PropertyM__Prope__00200768",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    ReporterId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(200)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(4000)", nullable: true),
                    Status = table.Column<string>(type: "varchar(12)", nullable: false, defaultValueSql: "('open')"),
                    Resolution = table.Column<string>(type: "nvarchar(4000)", nullable: true),
                    ResolvedBy = table.Column<string>(type: "nvarchar(64)", nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Reports__3214EC077C35DAB8", x => x.Id);
                    table.CheckConstraint("CK__Reports__Status__7FEAFD3E", "([Status]='resolved' OR [Status]='open')");
                    table.ForeignKey(
                        name: "FK__Reports__Propert__7D0E9093",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Reports__Reporte__7E02B4CC",
                        column: x => x.ReporterId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Reports__Resolve__00DF2177",
                        column: x => x.ResolvedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Reviews",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    AuthorId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Rating = table.Column<byte>(type: "tinyint", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(2000)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Reviews__3214EC0722BD8AEC", x => x.Id);
                    table.CheckConstraint("CK__Reviews__Rating__0C85DE4D", "([Rating]>=(1) AND [Rating]<=(5))");
                    table.ForeignKey(
                        name: "FK__Reviews__AuthorI__0B91BA14",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Reviews__Propert__0A9D95DB",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RentalRequests",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: false),
                    TenantId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RoommateId = table.Column<string>(type: "nvarchar(64)", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(2000)", nullable: true),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Duration = table.Column<int>(type: "int", nullable: false),
                    Period = table.Column<string>(type: "varchar(10)", nullable: false),
                    Status = table.Column<string>(type: "varchar(16)", nullable: false, defaultValueSql: "('submitted')"),
                    PropertySnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    AgreedPrice = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    Deposit = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    Total = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    LandlordAccepted = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((0))"),
                    TenantAccepted = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((0))"),
                    AgreementSnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    Version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__RentalRe__3214EC07D3D04F4D", x => x.Id);
                    table.CheckConstraint("CK__RentalReq__Agree__17F790F9", "([AgreedPrice]>(0))");
                    table.CheckConstraint("CK__RentalReq__Agree__1CBC4616", "([AgreementSnapshotJson] IS NULL OR isjson([AgreementSnapshotJson])=(1))");
                    table.CheckConstraint("CK__RentalReq__Depos__18EBB532", "([Deposit]>=(0))");
                    table.CheckConstraint("CK__RentalReq__Durat__1332DBDC", "([Duration]>(0))");
                    table.CheckConstraint("CK__RentalReq__Perio__14270015", "([Period]='Daily' OR [Period]='Monthly')");
                    table.CheckConstraint("CK__RentalReq__Prope__17036CC0", "(isjson([PropertySnapshotJson])=(1))");
                    table.CheckConstraint("CK__RentalReq__Statu__160F4887", "([Status]='rejected' OR [Status]='closed' OR [Status]='active' OR [Status]='payment' OR [Status]='inspection' OR [Status]='approved' OR [Status]='submitted')");
                    table.CheckConstraint("CK__RentalReq__Total__19DFD96B", "([Total]>=(0))");
                    table.CheckConstraint("CK__RentalRequests__1EA48E88", "([EndDate]>[StartDate])");
                    table.ForeignKey(
                        name: "FK__RentalReq__Prope__10566F31",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__RentalReq__Roomm__123EB7A3",
                        column: x => x.RoommateId,
                        principalTable: "RoommateProfiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__RentalReq__Tenan__114A936A",
                        column: x => x.TenantId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RoommateContacts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PersonId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Status = table.Column<string>(type: "varchar(12)", nullable: false, defaultValueSql: "('pending')"),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Roommate__3214EC07BA937107", x => x.Id);
                    table.CheckConstraint("CK__RoommateC__Statu__6EC0713C", "([Status]='rejected' OR [Status]='accepted' OR [Status]='pending')");
                    table.ForeignKey(
                        name: "FK__RoommateC__Perso__6CD828CA",
                        column: x => x.PersonId,
                        principalTable: "RoommateProfiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__RoommateC__UserI__6BE40491",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Inspections",
                columns: table => new
                {
                    RequestId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    ItemsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(4000)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Inspecti__33A8517AD79D29BB", x => x.RequestId);
                    table.CheckConstraint("CK__Inspectio__Items__282DF8C2", "(isjson([ItemsJson])=(1))");
                    table.ForeignKey(
                        name: "FK__Inspectio__Reque__2739D489",
                        column: x => x.RequestId,
                        principalTable: "RentalRequests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Rentals",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RequestId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Status = table.Column<string>(type: "varchar(10)", nullable: false, defaultValueSql: "('active')"),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    PaymentMethod = table.Column<string>(type: "varchar(24)", nullable: false, defaultValueSql: "('direct-to-landlord')"),
                    MoveInComplete = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((0))"),
                    ArrangementConfirmedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    ClosedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: true),
                    Version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Rentals__3214EC07F5B08839", x => x.Id);
                    table.CheckConstraint("CK__Rentals__Payment__30C33EC3", "([PaymentMethod]='direct-to-landlord')");
                    table.CheckConstraint("CK__Rentals__Status__2EDAF651", "([Status]='closed' OR [Status]='active')");
                    table.ForeignKey(
                        name: "FK__Rentals__Request__2CF2ADDF",
                        column: x => x.RequestId,
                        principalTable: "RentalRequests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "RentNegotiations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RequestId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    Status = table.Column<string>(type: "varchar(12)", nullable: false),
                    ProposedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__RentNego__3214EC070EE2713B", x => x.Id);
                    table.CheckConstraint("CK__RentNegot__Price__22751F6C", "([Price]>(0))");
                    table.CheckConstraint("CK__RentNegot__Statu__236943A5", "([Status]='declined' OR [Status]='confirmed' OR [Status]='pending')");
                    table.ForeignKey(
                        name: "FK__RentNegot__Reque__2180FB33",
                        column: x => x.RequestId,
                        principalTable: "RentalRequests",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ConditionReports",
                columns: table => new
                {
                    RentalId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Phase = table.Column<string>(type: "varchar(10)", nullable: false),
                    SubmittedBy = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    VideoId = table.Column<string>(type: "nvarchar(64)", nullable: true),
                    ItemsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(4000)", nullable: true),
                    RecordedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Conditio__42D1B081FFEF8208", x => new { x.RentalId, x.Phase });
                    table.CheckConstraint("CK__Condition__Items__395884C4", "(isjson([ItemsJson])=(1))");
                    table.CheckConstraint("CK__Condition__Phase__367C1819", "([Phase]='final' OR [Phase]='initial')");
                    table.ForeignKey(
                        name: "FK__Condition__Renta__3587F3E0",
                        column: x => x.RentalId,
                        principalTable: "Rentals",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Condition__Submi__37703C52",
                        column: x => x.SubmittedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Condition__Video__3864608B",
                        column: x => x.VideoId,
                        principalTable: "Media",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PartialOffers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RentalId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RoomNumber = table.Column<int>(type: "int", nullable: false),
                    Occupancy = table.Column<string>(type: "varchar(10)", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(500)", nullable: true),
                    Status = table.Column<string>(type: "varchar(20)", nullable: false, defaultValueSql: "('awaiting-fee')"),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    Version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__PartialO__3214EC0788C9D097", x => x.Id);
                    table.CheckConstraint("CK__PartialOf__Occup__3F115E1A", "([Occupancy]='shared' OR [Occupancy]='private')");
                    table.CheckConstraint("CK__PartialOf__Price__40058253", "([Price]>(0))");
                    table.CheckConstraint("CK__PartialOf__RoomN__3E1D39E1", "([RoomNumber]>(0))");
                    table.CheckConstraint("CK__PartialOf__Statu__41EDCAC5", "([Status]='deleted' OR [Status]='archived' OR [Status]='published' OR [Status]='awaiting-fee')");
                    table.CheckConstraint("CK__PartialOffers__43D61337", "(datediff(day,[StartDate],[EndDate])>=(1) AND datediff(day,[StartDate],[EndDate])<=(30))");
                    table.ForeignKey(
                        name: "FK__PartialOf__Renta__3D2915A8",
                        column: x => x.RentalId,
                        principalTable: "Rentals",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ListingFees",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: true),
                    PartialOfferId = table.Column<string>(type: "nvarchar(64)", nullable: true),
                    Amount = table.Column<decimal>(type: "decimal(12,3)", nullable: false),
                    Currency = table.Column<string>(type: "char(3)", nullable: false, defaultValueSql: "('JOD')"),
                    Status = table.Column<string>(type: "varchar(10)", nullable: false, defaultValueSql: "('unpaid')"),
                    Provider = table.Column<string>(type: "varchar(50)", nullable: true),
                    ProviderPaymentId = table.Column<string>(type: "nvarchar(200)", nullable: true),
                    PaidAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: true),
                    Simulated = table.Column<bool>(type: "bit", nullable: false, defaultValueSql: "((0))")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__ListingF__3214EC074B1B3B79", x => x.Id);
                    table.CheckConstraint("CK__ListingFe__Curre__5224328E", "([Currency]='JOD')");
                    table.CheckConstraint("CK__ListingFe__Statu__540C7B00", "([Status]='paid' OR [Status]='unpaid')");
                    table.CheckConstraint("CK__ListingFees__55F4C372", "([PropertyId] IS NOT NULL AND [PartialOfferId] IS NULL AND [Amount]=(20) OR [PropertyId] IS NULL AND [PartialOfferId] IS NOT NULL AND [Amount]=(5))");
                    table.CheckConstraint("CK__ListingFees__56E8E7AB", "([Status]='paid' AND [PaidAt] IS NOT NULL OR [Status]='unpaid' AND [PaidAt] IS NULL)");
                    table.ForeignKey(
                        name: "FK__ListingFe__Parti__503BEA1C",
                        column: x => x.PartialOfferId,
                        principalTable: "PartialOffers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__ListingFe__Prope__4F47C5E3",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PartialRequests",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    ListingId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    TenantId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    StartDate = table.Column<DateOnly>(type: "date", nullable: false),
                    EndDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "varchar(12)", nullable: false, defaultValueSql: "('pending')"),
                    OfferSnapshotJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    Version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__PartialR__3214EC07D1A8E644", x => x.Id);
                    table.CheckConstraint("CK__PartialRe__Offer__4A8310C6", "(isjson([OfferSnapshotJson])=(1))");
                    table.CheckConstraint("CK__PartialRe__Statu__498EEC8D", "([Status]='rejected' OR [Status]='approved' OR [Status]='pending')");
                    table.CheckConstraint("CK__PartialRequests__4C6B5938", "([EndDate]>[StartDate])");
                    table.ForeignKey(
                        name: "FK__PartialRe__Listi__46B27FE2",
                        column: x => x.ListingId,
                        principalTable: "PartialOffers",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__PartialRe__Tenan__47A6A41B",
                        column: x => x.TenantId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "PaymentEvents",
                columns: table => new
                {
                    Provider = table.Column<string>(type: "varchar(50)", nullable: false),
                    EventId = table.Column<string>(type: "nvarchar(200)", nullable: false),
                    FeeId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__PaymentE__8ED02D8BFB5D3DB4", x => new { x.Provider, x.EventId });
                    table.ForeignKey(
                        name: "FK__PaymentEv__FeeId__59C55456",
                        column: x => x.FeeId,
                        principalTable: "ListingFees",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Meetings",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Kind = table.Column<string>(type: "varchar(10)", nullable: false),
                    PropertyId = table.Column<int>(type: "int", nullable: true),
                    RoommateId = table.Column<string>(type: "nvarchar(64)", nullable: true),
                    PartialRequestId = table.Column<string>(type: "nvarchar(64)", nullable: true),
                    CreatorId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RecipientId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", nullable: false),
                    StartsAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false),
                    Duration = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "varchar(12)", nullable: false, defaultValueSql: "('pending')"),
                    RoomName = table.Column<string>(type: "nvarchar(200)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false, defaultValueSql: "(sysdatetimeoffset())"),
                    Version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Meetings__3214EC073A5B8DDF", x => x.Id);
                    table.CheckConstraint("CK__Meetings__671F4F74", "([CreatorId]<>[RecipientId])");
                    table.CheckConstraint("CK__Meetings__681373AD", "([Kind]='property' AND [PropertyId] IS NOT NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NULL OR [Kind]='roommate' AND [PropertyId] IS NULL AND [RoommateId] IS NOT NULL AND [PartialRequestId] IS NULL OR [Kind]='sublet' AND [PropertyId] IS NULL AND [RoommateId] IS NULL AND [PartialRequestId] IS NOT NULL)");
                    table.CheckConstraint("CK__Meetings__Durati__634EBE90", "([Duration]=(60) OR [Duration]=(30) OR [Duration]=(15))");
                    table.CheckConstraint("CK__Meetings__Kind__5D95E53A", "([Kind]='sublet' OR [Kind]='roommate' OR [Kind]='property')");
                    table.CheckConstraint("CK__Meetings__Status__65370702", "([Status]='cancelled' OR [Status]='declined' OR [Status]='accepted' OR [Status]='pending')");
                    table.ForeignKey(
                        name: "FK__Meetings__Creato__6166761E",
                        column: x => x.CreatorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Meetings__Partia__607251E5",
                        column: x => x.PartialRequestId,
                        principalTable: "PartialRequests",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Meetings__Proper__5E8A0973",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Meetings__Recipi__625A9A57",
                        column: x => x.RecipientId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK__Meetings__Roomma__5F7E2DAC",
                        column: x => x.RoommateId,
                        principalTable: "RoommateProfiles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "UX_ListingFees_Partial",
                table: "ListingFees",
                column: "PartialOfferId",
                unique: true,
                filter: "([PartialOfferId] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "UX_ListingFees_Property",
                table: "ListingFees",
                column: "PropertyId",
                unique: true,
                filter: "([PropertyId] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "UX_ListingFees_ProviderPayment",
                table: "ListingFees",
                columns: new[] { "Provider", "ProviderPaymentId" },
                unique: true,
                filter: "([ProviderPaymentId] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_Meetings_Creator",
                table: "Meetings",
                columns: new[] { "CreatorId", "Status", "StartsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Meetings_Recipient",
                table: "Meetings",
                columns: new[] { "RecipientId", "Status", "StartsAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_Inbox",
                table: "Notifications",
                columns: new[] { "RecipientId", "IsRead", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_PartialOffers_Availability",
                table: "PartialOffers",
                columns: new[] { "RentalId", "RoomNumber", "Status", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_PartialRequests_Availability",
                table: "PartialRequests",
                columns: new[] { "ListingId", "Status", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Properties_Owner",
                table: "Properties",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_Properties_Search",
                table: "Properties",
                columns: new[] { "Status", "City", "Area", "Price" });

            migrationBuilder.CreateIndex(
                name: "UX_PropertyMedia_Video",
                table: "PropertyMedia",
                column: "PropertyId",
                unique: true,
                filter: "([Kind]='video')");

            migrationBuilder.CreateIndex(
                name: "IX_Requests_Availability",
                table: "RentalRequests",
                columns: new[] { "PropertyId", "Status", "StartDate", "EndDate" });

            migrationBuilder.CreateIndex(
                name: "IX_Requests_Tenant",
                table: "RentalRequests",
                columns: new[] { "TenantId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "UQ__Rentals__33A8517BDD3147A3",
                table: "Rentals",
                column: "RequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_RentNegotiations_Pending",
                table: "RentNegotiations",
                column: "RequestId",
                unique: true,
                filter: "([Status]='pending')");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_Property",
                table: "Reviews",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "UQ__Roommate__5D2A33F3603424A6",
                table: "RoommateContacts",
                columns: new[] { "UserId", "PersonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Roommate__1788CC4D41B84DF9",
                table: "RoommateProfiles",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Users__368B291AC7FE6295",
                table: "Users",
                column: "NormalizedEmail",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Activity");

            migrationBuilder.DropTable(
                name: "ConditionReports");

            migrationBuilder.DropTable(
                name: "Favorites");

            migrationBuilder.DropTable(
                name: "Inspections");

            migrationBuilder.DropTable(
                name: "Meetings");

            migrationBuilder.DropTable(
                name: "ModerationHistory");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "PaymentEvents");

            migrationBuilder.DropTable(
                name: "Preferences");

            migrationBuilder.DropTable(
                name: "PropertyMedia");

            migrationBuilder.DropTable(
                name: "RentNegotiations");

            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropTable(
                name: "Reviews");

            migrationBuilder.DropTable(
                name: "RoommateContacts");

            migrationBuilder.DropTable(
                name: "PartialRequests");

            migrationBuilder.DropTable(
                name: "ListingFees");

            migrationBuilder.DropTable(
                name: "Media");

            migrationBuilder.DropTable(
                name: "PartialOffers");

            migrationBuilder.DropTable(
                name: "Rentals");

            migrationBuilder.DropTable(
                name: "RentalRequests");

            migrationBuilder.DropTable(
                name: "Properties");

            migrationBuilder.DropTable(
                name: "RoommateProfiles");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
