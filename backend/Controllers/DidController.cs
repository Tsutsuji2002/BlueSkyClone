using Microsoft.AspNetCore.Mvc;

namespace BSkyClone.Controllers
{
    [ApiController]
    public class DidController : ControllerBase
    {
        private readonly IConfiguration _configuration;

        public DidController(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        [HttpGet(".well-known/did.json")]
        public IActionResult GetDidDocument()
        {
            var domain = _configuration["DomainName"] ?? "bskyclone.site";
            
            // This is a minimal did:web document.
            // In a full implementation, the 'id' would be 'did:web:bskyclone.site'
            // and it would contain public keys for signing.
            var didDocument = new
            {
                @context = new[] { "https://www.w3.org/ns/did/v1" },
                id = $"did:web:{domain}",
                service = new[]
                {
                    new
                    {
                        id = "#atproto_pds",
                        type = "AtprotoPds",
                        serviceEndpoint = $"https://{domain}"
                    }
                }
            };

            return Ok(didDocument);
        }
    }
}
