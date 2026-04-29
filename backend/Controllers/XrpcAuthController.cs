using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using BSkyClone.Services;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.Configuration;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("api/xrpc")]
    [Route("xrpc")]
    public class XrpcAuthController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public XrpcAuthController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [Authorize]
        [HttpGet("com.atproto.server.getServiceAuth")]
        public IActionResult GetServiceAuth([FromQuery] string aud)
        {
            if (string.IsNullOrEmpty(aud))
            {
                return BadRequest(new { error = "InvalidRequest", message = "Audience (aud) is required" });
            }

            // In AT Protocol, a service-to-service JWT usually:
            // 1. Has 'iss' = the service's DID (e.g., did:web:bskyclone.site)
            // 2. Has 'aud' = the target service's DID
            // 3. Is signed by the service's private key.

            var domain = _configuration["DomainName"] ?? "bskyclone.site";
            var serviceDid = $"did:web:{domain}";
            
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT signing key (Jwt:Key) is not configured."));
            
            var expires = DateTime.UtcNow.AddMinutes(10); // Service tokens are usually short-lived

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim("iss", serviceDid),
                    new Claim("aud", aud),
                    new Claim("exp", ((DateTimeOffset)expires).ToUnixTimeSeconds().ToString())
                }),
                Expires = expires,
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return Ok(new { token = tokenHandler.WriteToken(token) });
        }
    }
}
