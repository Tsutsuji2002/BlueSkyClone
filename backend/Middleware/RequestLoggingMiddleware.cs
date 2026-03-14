using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
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
            _logger.LogInformation("Incoming Request: {Method} {Path}", context.Request.Method, context.Request.Path);
            
            await _next(context);

            _logger.LogInformation("Outgoing Response: {Status} for {Method} {Path}", context.Response.StatusCode, context.Request.Method, context.Request.Path);
        }
    }
}
