using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusMate.Migrations
{
    /// <inheritdoc />
    public partial class ConfirmedRentalAmendments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RentalAmendments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RentalId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ProposedBy = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    BaseTermsVersion = table.Column<int>(type: "int", nullable: false),
                    OriginalTermsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ProposedTermsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RequiredApproversJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ApprovedByJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<string>(type: "varchar(16)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset(0)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RentalAmendments", x => x.Id);
                    table.CheckConstraint("CK_RentalAmendments_Status", "[Status] IN ('pending','approved','rejected','cancelled')");
                    table.ForeignKey(
                        name: "FK_RentalAmendments_Rentals_RentalId",
                        column: x => x.RentalId,
                        principalTable: "Rentals",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RentalAmendments_Users_ProposedBy",
                        column: x => x.ProposedBy,
                        principalTable: "Users",
                        principalColumn: "Id");
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RentalAmendments");
        }
    }
}
