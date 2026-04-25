using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Diagnostics;
using System.Threading.Tasks;

namespace BSkyClone.Middleware
{
    public class RequestLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<RequestLoggingMiddleware> _logger;

        public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task Invoke(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();
            var requestPath = context.Request.Path.Value ?? "unknown";
            var requestMethod = context.Request.Method;

            try
            {
                await _next(context);
            }
            finally
            {
                stopwatch.Stop();
                var elapsed = stopwatch.ElapsedMilliseconds;
                var statusCode = context.Response.StatusCode;

                // Log basic request info
                _logger.LogInformation(
                    "Request: {Method} {Path} | Status: {Status} | Duration: {Duration}ms",
                    requestMethod,
                    requestPath,
                    statusCode,
                    elapsed);

                // Track slow requests (over 1 second)
                if (elapsed > 1000)
                {
                    _logger.LogWarning(
                        "Slow request detected: {Method} {Path} took {Duration}ms",
                        requestMethod,
                        requestPath,
                        elapsed);
                }

                // Track failed requests
                if (statusCode >= 400)
                {
                    _logger.LogWarning(
                        "Failed request: {Method} {Path} | Status: {Status} | Duration: {Duration}ms",
                        requestMethod,
                        requestPath,
                        statusCode,
                        elapsed);
                }

                // Track very slow requests (over 5 seconds)
                if (elapsed > 5000)
                {
                    _logger.LogError(
                        "Very slow request detected: {Method} {Path} took {Duration}ms",
                        requestMethod,
                        requestPath,
                        elapsed);
                }
            }
        }
    }
}
