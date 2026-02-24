using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class InitialFollowingFeedSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "EnableDiscoverVideo",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "EnableTreeView",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "EnableTrending",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "LargerAltBadge",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RequireLogoutVisibility",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "SelectedInterests",
                table: "UserSettings",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowQuotePosts",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowReplies",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowSampleSavedFeeds",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EnableDiscoverVideo",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "EnableTreeView",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "EnableTrending",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "LargerAltBadge",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "RequireLogoutVisibility",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "SelectedInterests",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowQuotePosts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowReplies",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "ShowSampleSavedFeeds",
                table: "UserSettings");
        }
    }
}
