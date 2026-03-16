using System;
using System.Linq;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

class TestProfileScript
{
    static void Main()
    {
        var connStr = "Server=localhost,1433;Database=BlueSkyClone;User Id=sa;Password=Ifilp0721!;TrustServerCertificate=True;";

        var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
        optionsBuilder.UseSqlServer(connStr);

        using (var context = new BSkyDbContext(optionsBuilder.Options))
        {
            try
            {
                var user = context.Users.Include(u => u.UserSetting).FirstOrDefault(u => u.Handle == "dophuqui.bsky.social");
                Console.WriteLine(user != null ? $"FOUND_USER: {user.Username}" : "USER_NOT_FOUND");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DB_EXCEPTION: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"DB_INNER_EXCEPTION: {ex.InnerException.Message}");
                }
            }
        }
    }
}
