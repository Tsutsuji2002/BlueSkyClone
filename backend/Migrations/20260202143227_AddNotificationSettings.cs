using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyFollowers",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyLikes",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyMentions",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyQuotes",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyReplies",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "InAppNotifyReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyMentions",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyQuotes",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyFollowers",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyLikes",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyMentions",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyQuotes",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyReplies",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "PushNotifyReposts",
                table: "UserSettings",
                type: "bit",
                nullable: true,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InAppNotifyFollowers",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyLikes",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyMentions",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyQuotes",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyReplies",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "InAppNotifyReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyMentions",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyQuotes",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "NotifyReposts",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyFollowers",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyLikes",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyMentions",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyQuotes",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyReplies",
                table: "UserSettings");

            migrationBuilder.DropColumn(
                name: "PushNotifyReposts",
                table: "UserSettings");
        }
    }
}
