using System;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Services;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

class TestRemoteFollowsScript
{
    static async Task Main()
    {
        var services = new ServiceCollection();
        var builder = new ConfigurationBuilder().AddJsonFile("c:\\Projects\\BlueSky\\backend\\appsettings.json");
        var config = builder.Build();
        var connStr = config.GetConnectionString("DefaultConnection");

        services.AddDbContext<BSkyDbContext>(options => options.UseSqlServer(connStr));
        services.AddLogging(builder => builder.AddConsole());
        services.AddHttpClient();
        
        // Mocking or adding necessary services
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IDidResolver, DidResolverService>();
        services.AddScoped<ICacheService, CacheService>();
        services.AddScoped<ICryptoService, CryptoService>();
        
        var serviceProvider = services.BuildServiceProvider();

        using (var scope = serviceProvider.CreateScope())
        {
            var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
            
            string remoteHandle = "paul.bsky.social";
            Console.WriteLine($"Testing followers for: {remoteHandle}");
            
            try 
            {
                var (followers, cursor) = await userService.GetFollowersAsync(remoteHandle, limit: 5);
                Console.WriteLine($"Fetched {followers.Count} followers.");
                foreach (var f in followers)
                {
                    Console.WriteLine($"- {f.Handle} ({f.Did})");
                }
                Console.WriteLine($"Next Cursor: {cursor ?? "None"}");

                var (following, fCursor) = await userService.GetFollowingAsync(remoteHandle, limit: 5);
                Console.WriteLine($"\nFetched {following.Count} following.");
                foreach (var f in following)
                {
                    Console.WriteLine($"- {f.Handle} ({f.Did})");
                }
                Console.WriteLine($"Next Cursor: {fCursor ?? "None"}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex.Message}");
            }
        }
    }
}
