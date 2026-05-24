using System.Collections.Concurrent;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;

namespace BSkyClone.Middleware
{
    public class BannedUserMiddleware
    {
        private readonly RequestDelegate _next;
        private static readonly ConcurrentDictionary<Guid, (bool IsBanned, DateTime Expiry)> _cache = new();
        private static readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5);

        public BannedUserMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context, BSkyDbContext dbContext)
        {
            try
            {
                if (context.User.Identity?.IsAuthenticated == true)
                {
                    var userIdString = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? context.User.FindFirst("sub")?.Value;
                    if (Guid.TryParse(userIdString, out var userId))
                    {
                        bool isBanned = false;
                        if (_cache.TryGetValue(userId, out var entry) && entry.Expiry > DateTime.UtcNow)
                        {
                            isBanned = entry.IsBanned;
                        }
                        else
                        {
                            isBanned = await dbContext.Users
                                .Where(u => u.Id == userId)
                                .Select(u => u.IsBanned)
                                .FirstOrDefaultAsync();
                            
                            _cache[userId] = (isBanned, DateTime.UtcNow.Add(_cacheDuration));
                        }

                        if (isBanned)
                        {
                            context.Response.StatusCode = 401;
                            await context.Response.WriteAsJsonAsync(new { message = "Your account has been banned." });
                            return;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Log error but allow request to proceed to avoid complete service blackout
                // if there's a temporary DB issue or schema mismatch
                System.Console.WriteLine($"Error checking banned status: {ex.Message}");
            }

            await _next(context);
        }
    }
}
