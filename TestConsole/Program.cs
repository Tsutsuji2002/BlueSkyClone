using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;
using System;
using System.Linq;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        var connectionString = "Server=LAPTOP-S340\\SQLEXPRESS;Database=BlueSkyClone;Trusted_Connection=True;TrustServerCertificate=True;";
        var optionsBuilder = new DbContextOptionsBuilder<BSkyDbContext>();
        optionsBuilder.UseSqlServer(connectionString);

        using (var context = new BSkyDbContext(optionsBuilder.Options))
        {
            try
            {
                var feeds = await context.Feeds.ToListAsync();
                Console.WriteLine($"Total Feeds: {feeds.Count}");
                foreach (var f in feeds)
                {
                    Console.WriteLine($"FEED_ID: {f.Id}, NAME: {f.Name}, HANDLE: {f.Handle}, OFFICIAL: {f.IsOfficial}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DB_EXCEPTION: {ex.Message}");
            }
        }
    }
}
