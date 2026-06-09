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
        private readonly ILogger<BannedUserMiddleware> _logger;
        private static readonly ConcurrentDictionary<Guid, (bool IsBanned, DateTime Expiry)> _cache = new();
        private static readonly TimeSpan _cacheDuration = TimeSpan.FromMinutes(5);

        public BannedUserMiddleware(RequestDelegate next, ILogger<BannedUserMiddleware> logger)
        {
            _next = next;
            _logger = logger;
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
                            using var checkCts = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
                            checkCts.CancelAfter(TimeSpan.FromSeconds(2));

                            isBanned = await dbContext.Users
                                .AsNoTracking()
                                .Where(u => u.Id == userId)
                                .Select(u => u.IsBanned)
                                .FirstOrDefaultAsync(checkCts.Token);
                            
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
            catch (OperationCanceledException) when (!context.RequestAborted.IsCancellationRequested)
            {
                // Do not let a slow SQL pool/lock in the ban check block all authenticated APIs.
                // Ban state is cached for normal traffic and will be checked again on the next request.
                _logger.LogWarning("Banned user check timed out; allowing request to continue.");
            }
            catch (Exception ex)
            {
                // Log error but allow request to proceed to avoid complete service blackout
                // if there's a temporary DB issue or schema mismatch
                _logger.LogWarning(ex, "Error checking banned status; allowing request to continue.");
            }

            await _next(context);
        }
    }
}
