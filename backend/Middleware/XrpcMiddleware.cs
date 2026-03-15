using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Microsoft.Extensions.Configuration;
using System.Linq;

namespace BSkyClone.Middleware
{
    public class XrpcMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IConfiguration _configuration;

        public XrpcMiddleware(RequestDelegate next, IConfiguration configuration)
        {
            _next = next;
            _configuration = configuration;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            if (context.Request.Path.StartsWithSegments("/xrpc") && context.Request.Headers.ContainsKey("Authorization"))
            {
                var authHeader = context.Request.Headers["Authorization"].ToString();
                if (authHeader.StartsWith("Bearer ", System.StringComparison.OrdinalIgnoreCase))
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();
                    await VerifyTokenAsync(context, token);
                }
            }

            await _next(context);
        }

        private async Task VerifyTokenAsync(HttpContext context, string token)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "a_very_long_secret_key_that_is_at_least_32_chars_long");

            try
            {
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false, // Simplified for inter-service auth
                    ValidateAudience = false, // Simplified for inter-service auth
                    ClockSkew = System.TimeSpan.Zero
                }, out SecurityToken validatedToken);

                // Check if this is a service token (has aud/iss but maybe no sub)
                var claims = principal.Claims.ToList();
                var iss = claims.FirstOrDefault(c => c.Type == "iss")?.Value;
                var aud = claims.FirstOrDefault(c => c.Type == "aud")?.Value;
                
                if (iss != null && aud != null && !claims.Any(c => c.Type == "sub"))
                {
                    // This is a service token. 
                    // In a full implementation, we would verify that 'iss' 
                    // corresponds to a trusted service DID.
                    context.Items["IsServiceAuth"] = true;
                    context.Items["ServiceDid"] = iss;
                }
            }
            catch
            {
                // Token validation failed. 
                // We don't block here because some XRPC endpoints might be public.
                // The [Authorize] attribute on controllers will handle blocking if needed.
            }
        }
    }
}
