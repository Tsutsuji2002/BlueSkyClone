using System;
using System.Collections.Concurrent;
using System.Linq;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Middleware
{
    public class IpAbuseMitigationMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<IpAbuseMitigationMiddleware> _logger;

        // Banned IPs and their ban expiration (UTC)
        private static readonly ConcurrentDictionary<string, DateTime> _bannedIps = new();

        // Track 429 violations per IP: List of violation timestamps in UTC
        private static readonly ConcurrentDictionary<string, ConcurrentQueue<DateTime>> _violationLogs = new();

        // Configuration constants
        private const int MaxViolationsPerMinute = 30;
        private static readonly TimeSpan BanDuration = TimeSpan.FromMinutes(15);
        private static readonly TimeSpan ViolationTrackingWindow = TimeSpan.FromMinutes(1);

        public IpAbuseMitigationMiddleware(RequestDelegate next, ILogger<IpAbuseMitigationMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var ipAddress = GetClientIpAddress(context);

            if (!string.IsNullOrEmpty(ipAddress))
            {
                // 1. Check if IP is currently banned
                if (_bannedIps.TryGetValue(ipAddress, out var banExpiry))
                {
                    if (DateTime.UtcNow < banExpiry)
                    {
                        var remainingSeconds = (int)Math.Ceiling((banExpiry - DateTime.UtcNow).TotalSeconds);
                        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                        context.Response.Headers["Retry-After"] = remainingSeconds.ToString();
                        context.Response.ContentType = "application/json";

                        await context.Response.WriteAsJsonAsync(new
                        {
                            error = "IP_SUSPENDED",
                            message = "Your IP has been temporarily suspended due to excessive rate limit violations.",
                            retryAfterSeconds = remainingSeconds
                        });
                        return;
                    }
                    else
                    {
                        // Ban expired, clean up
                        _bannedIps.TryRemove(ipAddress, out _);
                    }
                }
            }

            // 2. Process request
            await _next(context);

            // 3. Post-execution check for Rate Limit (429) status code
            if (!string.IsNullOrEmpty(ipAddress) && context.Response.StatusCode == StatusCodes.Status429TooManyRequests)
            {
                RecordViolation(ipAddress);
            }
        }

        private void RecordViolation(string ipAddress)
        {
            var now = DateTime.UtcNow;
            var queue = _violationLogs.GetOrAdd(ipAddress, _ => new ConcurrentQueue<DateTime>());
            queue.Enqueue(now);

            // Trim violations older than 1 minute
            var cutoff = now.Subtract(ViolationTrackingWindow);
            while (queue.TryPeek(out var oldest) && oldest < cutoff)
            {
                queue.TryDequeue(out _);
            }

            // Check if violation count exceeds threshold
            if (queue.Count >= MaxViolationsPerMinute)
            {
                var banExpiry = now.Add(BanDuration);
                _bannedIps[ipAddress] = banExpiry;
                _logger.LogWarning("IP {IpAddress} suspended for {Duration} minutes due to {ViolationCount} rate limit violations in 1 minute.",
                    ipAddress, BanDuration.TotalMinutes, queue.Count);

                // Clear queue once banned
                _violationLogs.TryRemove(ipAddress, out _);
            }
        }

        private static string GetClientIpAddress(HttpContext context)
        {
            // Check X-Forwarded-For header first (populated when behind Nginx / Cloudflare)
            var forwardedHeader = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(forwardedHeader))
            {
                var firstIp = forwardedHeader.Split(',')[0].Trim();
                if (IPAddress.TryParse(firstIp, out _))
                {
                    return firstIp;
                }
            }

            return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }
}
