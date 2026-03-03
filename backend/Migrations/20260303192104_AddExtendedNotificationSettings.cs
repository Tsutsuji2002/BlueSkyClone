using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddExtendedNotificationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyActivity",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyLikesOfReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyOthers",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyRepostsOfReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyActivity",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyLikesOfReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyOthers",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyRepostsOfReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyActivity",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyLikesOfReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyOthers",
                table: "UserSettings",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyRepostsOfReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InAppNotifyActivity",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyLikesOfReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyOthers",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyRepostsOfReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyActivity",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyLikesOfReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyOthers",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyRepostsOfReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyActivity",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyLikesOfReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyOthers",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyRepostsOfReposts",
                table: "UserSettings");

        }
    }
}
