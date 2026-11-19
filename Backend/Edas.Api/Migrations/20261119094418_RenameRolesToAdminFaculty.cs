using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Edas.Api.Migrations
{
    /// <inheritdoc />
    public partial class RenameRolesToAdminFaculty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Staff_Role",
                table: "Staff");

            // Existing rows are converted between dropping the old rule and adding the new one.
            migrationBuilder.Sql("UPDATE `Staff` SET `Role` = CASE `Role` WHEN 'Coordinator' THEN 'Admin' WHEN 'Staff' THEN 'Faculty' ELSE `Role` END;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Staff_Role",
                table: "Staff",
                sql: "`Role` IN ('Admin','Faculty')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Staff_Role",
                table: "Staff");

            migrationBuilder.Sql("UPDATE `Staff` SET `Role` = CASE `Role` WHEN 'Admin' THEN 'Coordinator' WHEN 'Faculty' THEN 'Staff' ELSE `Role` END;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Staff_Role",
                table: "Staff",
                sql: "`Role` IN ('Coordinator','Staff')");
        }
    }
}
