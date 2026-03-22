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
            var feeds = await context.Feeds.Where(f => f.IsOfficial).Select(f => new { f.Id, f.Name, f.Handle }).ToListAsync();
            var json = JsonSerializer.Serialize(feeds, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText("feeds.json", json);
            Console.WriteLine("EXPORT_COMPLETE");
        }
    }
}
