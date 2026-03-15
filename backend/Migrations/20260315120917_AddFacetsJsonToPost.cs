using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddFacetsJsonToPost : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FacetsJson",
                table: "Posts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Uri",
                table: "Posts",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Labels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Src = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Uri = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Val = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Neg = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Labels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    SubjectType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SubjectUri = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    SubjectCid = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ReasonType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReasonText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReporterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "open")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reports_Users_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_Labels_Uri",
                table: "Labels",
                column: "Uri");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ReporterId",
                table: "Reports",
                column: "ReporterId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Labels");

            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropColumn(
                name: "FacetsJson",
                table: "Posts");

            migrationBuilder.DropColumn(
                name: "Uri",
                table: "Posts");
        }
    }
}
