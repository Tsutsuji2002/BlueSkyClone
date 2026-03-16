using System;
using System.Linq;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

class TestProfileScript
{
    static void Main()
    {
        var builder = new ConfigurationBuilder().AddJsonFile("c:\\Projects\\BlueSky\\backend\\appsettings.json");
        var config = builder.Build();
        var connStr = config.GetConnectionString("DefaultConnection");

        var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
        optionsBuilder.UseSqlServer(connStr);

        using (var context = new BSkyDbContext(optionsBuilder.Options))
        {
            try
            {
                var user = context.Users.FirstOrDefault(u => u.Handle == "dophuqui.bsky.social");
                Console.WriteLine(user != null ? $"Found: {user.Username} ID: {user.Id}" : "User not found");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Exception: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
            }
        }
    }
}
