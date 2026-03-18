using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.Extensions.Configuration;

namespace BSkyClone.Diagnostics;

public class DbCheck
{
    public static async Task Main(string[] args)
    {
        var host = Host.CreateDefaultBuilder(args)
            .ConfigureAppConfiguration((hostingContext, config) =>
            {
                config.AddJsonFile("appsettings.json", optional: true);
                config.AddJsonFile("appsettings.Development.json", optional: true);
            })
            .ConfigureServices((hostContext, services) =>
            {
                var connectionString = hostContext.Configuration.GetConnectionString("DefaultConnection");
                services.AddDbContext<BSkyDbContext>(options =>
                    options.UseSqlServer(connectionString));
                services.AddScoped<IUnitOfWork, UnitOfWork.UnitOfWork>();
            })
            .Build();

        using (var scope = host.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BSkyDbContext>();
            try
            {
                var postCount = await db.Posts.CountAsync();
                var userCount = await db.Users.CountAsync();
                var mediaCount = await db.PostMedia.CountAsync();
                
                Console.WriteLine($"Posts: {postCount}");
                Console.WriteLine($"Users: {userCount}");
                Console.WriteLine($"PostMedia: {mediaCount}");

                if (postCount > 0)
                {
                    var samplePost = await db.Posts.Include(p => p.Author).FirstOrDefaultAsync();
                    Console.WriteLine($"Sample Post ID: {samplePost?.Id}");
                    Console.WriteLine($"Sample Post Author: {samplePost?.Author?.Handle}");
                }
                
                var tables = db.Model.GetEntityTypes().Select(t => t.GetTableName()).ToList();
                Console.WriteLine("Tables found: " + string.Join(", ", tables));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
                if (ex.InnerException != null) Console.WriteLine($"Inner: {ex.InnerException.Message}");
            }
        }
    }
}
