using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddMissingCidAndUriColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "UserFollows",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uri",
                table: "UserFollows",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "Reposts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uri",
                table: "Reposts",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "Posts",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "PostMedia",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "Likes",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uri",
                table: "Likes",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Cid",
                table: "Bookmarks",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Cid",
                table: "UserFollows");

            migrationBuilder.DropColumn(
                name: "Uri",
                table: "UserFollows");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "Reposts");

            migrationBuilder.DropColumn(
                name: "Uri",
                table: "Reposts");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "PostMedia");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "Likes");

            migrationBuilder.DropColumn(
                name: "Uri",
                table: "Likes");

            migrationBuilder.DropColumn(
                name: "Cid",
                table: "Bookmarks");
        }
    }
}
