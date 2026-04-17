using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class AddMutedWordAdvancedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ExcludeFollowing",
                table: "MutedWords",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "MutedWords",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExcludeFollowing",
                table: "MutedWords");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "MutedWords");
        }
    }
}
