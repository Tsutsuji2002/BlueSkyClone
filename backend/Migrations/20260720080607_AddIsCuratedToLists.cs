using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddIsCuratedToLists : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "BookmarksCount",
                table: "Posts",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Messages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "BlueskyConvoId",
                table: "Conversations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GroupName",
                table: "Conversations",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsAccepted",
                table: "Conversations",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // IsCurated was defined in the model since InitialCreate but never applied to production
            migrationBuilder.Sql(
                @"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Lists') AND name = 'IsCurated')
                  BEGIN
                      ALTER TABLE Lists ADD IsCurated BIT NOT NULL DEFAULT 0;
                  END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Type",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "BlueskyConvoId",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "GroupName",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "IsAccepted",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "IsCurated",
                table: "Lists");

            migrationBuilder.AlterColumn<int>(
                name: "BookmarksCount",
                table: "Posts",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}
