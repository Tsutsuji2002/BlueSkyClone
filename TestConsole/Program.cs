using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using System.Text.Json;

class Program
{
    static async Task Main()
    {
        var connectionString = "Server=LAPTOP-S340\\SQLEXPRESS;Database=BlueSkyClone;Trusted_Connection=True;TrustServerCertificate=True;";
        var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        using (var context = new BSkyDbContext(optionsBuilder.Options))
        {
            var hashtags = await context.Hashtags
                .OrderByDescending(h => h.PostsCount)
                .Take(10)
                .ToListAsync();
            
            foreach (var h in hashtags)
            {
                Console.WriteLine($"Hashtag: {h.Name}, Count: {h.PostsCount}");
            }
        }
    }
}
