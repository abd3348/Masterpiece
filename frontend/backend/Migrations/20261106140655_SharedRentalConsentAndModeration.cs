using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CampusMate.Migrations
{
    /// <inheritdoc />
    public partial class SharedRentalConsentAndModeration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK__Rentals__Status__2EDAF651",
                table: "Rentals");

            migrationBuilder.DropCheckConstraint(
                name: "CK__RentalReq__Statu__160F4887",
                table: "RentalRequests");

            migrationBuilder.AddColumn<string>(
                name: "SuspendedBy",
                table: "Users",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SuspendedUntil",
                table: "Users",
                type: "datetimeoffset(0)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SuspensionReason",
                table: "Users",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ActionTakenAt",
                table: "Reports",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResolutionNotes",
                table: "Reports",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "InvitationExpiresAt",
                table: "RentalRequests",
                type: "datetimeoffset(0)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvitationStatus",
                table: "RentalRequests",
                type: "varchar(16)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "RoommateAccepted",
                table: "RentalRequests",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RoommateUserId",
                table: "RentalRequests",
                type: "nvarchar(64)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TermsVersion",
                table: "RentalRequests",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "WorkflowVersion",
                table: "RentalRequests",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<bool>(
                name: "OwnerWantsPublished",
                table: "Properties",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewStatus",
                table: "Properties",
                type: "varchar(20)",
                nullable: false,
                defaultValue: "approved");

            migrationBuilder.AddColumn<string>(
                name: "Route",
                table: "Notifications",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            // Preserve owner pauses and existing moderation decisions during adoption.
            migrationBuilder.Sql("UPDATE dbo.Properties SET OwnerWantsPublished = CASE WHEN Status = 'archived' THEN 0 ELSE 1 END, ReviewStatus = CASE WHEN Status = 'deleted' THEN 'suspended' WHEN Status = 'pending' THEN 'pending' ELSE 'approved' END;");

            migrationBuilder.CreateTable(
                name: "RoommateFavorites",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    RoommateId = table.Column<string>(type: "nvarchar(64)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RoommateFavorites", x => new { x.UserId, x.RoommateId });
                    table.ForeignKey(
                        name: "FK_RoommateFavorites_RoommateProfiles_RoommateId",
                        column: x => x.RoommateId,
                        principalTable: "RoommateProfiles",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_RoommateFavorites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK__Rentals__Status__2EDAF651",
                table: "Rentals",
                sql: "[Status] IN ('upcoming','active','closed')");

            migrationBuilder.AddCheckConstraint(
                name: "CK__RentalReq__Statu__160F4887",
                table: "RentalRequests",
                sql: "[Status] IN ('draft','waiting-roommate','submitted','approved','inspection','agreement','payment','confirmed','active','closed','rejected','cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_RentalRequests_Invitation",
                table: "RentalRequests",
                sql: "[InvitationStatus] IS NULL OR [InvitationStatus] IN ('pending','accepted','declined','cancelled','expired')");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Properties_ReviewStatus",
                table: "Properties",
                sql: "[ReviewStatus] IN ('approved','pending','changes-requested','suspended')");

            migrationBuilder.AddForeignKey(
                name: "FK_RentalRequests_Users_RoommateUserId",
                table: "RentalRequests",
                column: "RoommateUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RentalRequests_Users_RoommateUserId",
                table: "RentalRequests");

            migrationBuilder.DropTable(
                name: "RoommateFavorites");

            migrationBuilder.DropCheckConstraint(
                name: "CK__Rentals__Status__2EDAF651",
                table: "Rentals");

            migrationBuilder.DropCheckConstraint(
                name: "CK__RentalReq__Statu__160F4887",
                table: "RentalRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_RentalRequests_Invitation",
                table: "RentalRequests");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Properties_ReviewStatus",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "SuspendedBy",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SuspendedUntil",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "SuspensionReason",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ActionTakenAt",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "ResolutionNotes",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "InvitationExpiresAt",
                table: "RentalRequests");

            migrationBuilder.DropColumn(
                name: "InvitationStatus",
                table: "RentalRequests");

            migrationBuilder.DropColumn(
                name: "RoommateAccepted",
                table: "RentalRequests");

            migrationBuilder.DropColumn(
                name: "RoommateUserId",
                table: "RentalRequests");

            migrationBuilder.DropColumn(
                name: "TermsVersion",
                table: "RentalRequests");

            migrationBuilder.DropColumn(
                name: "WorkflowVersion",
                table: "RentalRequests");

            migrationBuilder.DropColumn(
                name: "OwnerWantsPublished",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "ReviewStatus",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "Route",
                table: "Notifications");

            migrationBuilder.AddCheckConstraint(
                name: "CK__Rentals__Status__2EDAF651",
                table: "Rentals",
                sql: "([Status]='closed' OR [Status]='active')");

            migrationBuilder.AddCheckConstraint(
                name: "CK__RentalReq__Statu__160F4887",
                table: "RentalRequests",
                sql: "([Status]='rejected' OR [Status]='closed' OR [Status]='active' OR [Status]='payment' OR [Status]='inspection' OR [Status]='approved' OR [Status]='submitted')");
        }
    }
}
