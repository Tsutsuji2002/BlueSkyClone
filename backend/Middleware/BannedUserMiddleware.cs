using BSkyClone.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BSkyClone.Middleware
{
    public class BannedUserMiddleware
    {
        private readonly RequestDelegate _next;

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
                    var userIdString = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    if (Guid.TryParse(userIdString, out var userId))
                    {
                        var isBanned = await dbContext.Users
                            .Where(u => u.Id == userId)
                            .Select(u => u.IsBanned)
                            .FirstOrDefaultAsync();

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
