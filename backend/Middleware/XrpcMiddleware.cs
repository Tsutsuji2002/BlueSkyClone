using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace BSkyClone.Middleware
{
    public class XrpcMiddleware
    {
        private readonly RequestDelegate _next;

        public XrpcMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Path.StartsWithSegments("/xrpc"))
            {
                // In a full implementation, we would:
                // 1. Resolve the Lexicon name from the path (e.g., /xrpc/com.atproto.server.createSession)
                // 2. Validate the request body/parameters against the Lexicon schema.
                // 3. Dispatch to the appropriate handler.
                
                // For now, let's log the XRPC call.
                // context.Response.Headers.Append("Content-Type", "application/json");
                // await context.Response.WriteAsync("{\"error\": \"NotImplemented\", \"message\": \"XRPC indexing coming soon\"}");
                // return;
            }

            await _next(context);
        }
    }
}
