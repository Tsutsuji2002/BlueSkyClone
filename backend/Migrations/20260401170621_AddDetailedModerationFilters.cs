using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddDetailedModerationFilters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GraphicMediaFilter",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NonSexualNudityFilter",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SexuallyExplicitFilter",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uri",
                table: "BlockedAccounts",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GraphicMediaFilter",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NonSexualNudityFilter",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "SexuallyExplicitFilter",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "Uri",
                table: "BlockedAccounts");
        }
    }
}
