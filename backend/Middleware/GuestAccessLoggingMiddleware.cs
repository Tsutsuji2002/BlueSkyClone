using BSkyClone.Services;
using Microsoft.Extensions.Caching.Memory;

namespace BSkyClone.Middleware;

public class GuestAccessLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GuestAccessLoggingMiddleware> _logger;

    public GuestAccessLoggingMiddleware(RequestDelegate next, ILogger<GuestAccessLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IAccessLogService accessLogService, IMemoryCache memoryCache)
    {
        // Proceed with pipeline first
        await _next(context);

        try
        {
            var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

            // Ignore static assets, swagger, health, and signalr websockets
            if (path.StartsWith("/swagger") ||
                path.StartsWith("/hub") ||
                path.StartsWith("/hubs") ||
                path.EndsWith(".css") ||
                path.EndsWith(".js") ||
                path.EndsWith(".png") ||
                path.EndsWith(".jpg") ||
                path.EndsWith(".jpeg") ||
                path.EndsWith(".gif") ||
                path.EndsWith(".ico") ||
                path.EndsWith(".svg") ||
                path.EndsWith(".woff") ||
                path.EndsWith(".woff2") ||
                path.EndsWith(".ttf"))
            {
                return;
            }

            // Only log if the request is unauthenticated (Guest)
            if (context.User?.Identity?.IsAuthenticated != true)
            {
                var ip = GetClientIp(context);
                var cacheKey = $"guest_access_{ip}";

                // Throttle guest logging per IP to once every 15 minutes
                if (!memoryCache.TryGetValue(cacheKey, out _))
                {
                    var userAgent = context.Request.Headers["User-Agent"].ToString();
                    await accessLogService.LogAsync(null, "Guest", ip, userAgent, "guest_visit");

                    memoryCache.Set(cacheKey, true, TimeSpan.FromMinutes(15));
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to log guest access.");
        }
    }

    private static string GetClientIp(HttpContext context)
    {
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp.Trim();
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
    }
}
