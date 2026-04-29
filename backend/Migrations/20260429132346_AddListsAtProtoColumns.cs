using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddListsAtProtoColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Posts_AuthorId",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_ReplyToPostId",
                table: "Posts");

            migrationBuilder.AlterColumn<string>(
                name: "Targets",
                table: "MutedWords",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "content",
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "Lists",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uri",
                table: "Lists",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "ListMembers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uri",
                table: "ListMembers",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "BlockedAccounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Tid",
                table: "BlockedAccounts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_Active_CreatedAt",
                table: "Users",
                columns: new[] { "IsDeleted", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_FollowersCount_CreatedAt",
                table: "Users",
                columns: new[] { "FollowersCount", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_AuthorId_Active_CreatedAt",
                table: "Posts",
                columns: new[] { "AuthorId", "IsDeleted", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_AuthorId_CreatedAt",
                table: "Posts",
                columns: new[] { "AuthorId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_CreatedAt",
                table: "Posts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_LikesCount",
                table: "Posts",
                column: "LikesCount");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_LikesCount_CreatedAt",
                table: "Posts",
                columns: new[] { "LikesCount", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_ReplyToPostId_CreatedAt",
                table: "Posts",
                columns: new[] { "ReplyToPostId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RecipientId_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "RecipientId", "IsRead", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Active_CreatedAt",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_FollowersCount_CreatedAt",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Posts_AuthorId_Active_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_AuthorId_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_LikesCount",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_LikesCount_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Posts_ReplyToPostId_CreatedAt",
                table: "Posts");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_RecipientId_IsRead_CreatedAt",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "Lists");

            migrationBuilder.DropColumn(
                name: "Uri",
                table: "Lists");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "ListMembers");

            migrationBuilder.DropColumn(
                name: "Uri",
                table: "ListMembers");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "BlockedAccounts");

            migrationBuilder.DropColumn(
                name: "Tid",
                table: "BlockedAccounts");

            migrationBuilder.AlterColumn<string>(
                name: "Targets",
                table: "MutedWords",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50,
                oldDefaultValue: "content");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_AuthorId",
                table: "Posts",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_ReplyToPostId",
                table: "Posts",
                column: "ReplyToPostId");
        }
    }
}
