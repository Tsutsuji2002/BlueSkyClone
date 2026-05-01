using Microsoft.AspNetCore.Mvc;
using System;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VersionController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        var info = new
        {
            Version = "1.0.8",
            BuildDate = "2026-05-01 12:14 UTC",
            Environment = "Production",
            Status = "Live",
            Features = new[] { "StructuredFollowResults", "AggressiveSync", "SingletonTrending", "RobustResolution", "PerformanceOptimized", "IndexedUri", "GuestTrending", "StubPersistence", "PersistBeforeSync" }
        };
        return Ok(info);
    }

    [HttpGet("test")]
    public async Task<IActionResult> TestResolution([FromServices] BSkyClone.Services.IUserService userService, [FromQuery] string did = "did:plc:jrwqqeyrvd3sl4hxv7lqaarh")
    {
        try
        {
            var user = await userService.ResolveRemoteProfileAsync(did);
            return Ok(new { success = true, user = user });
        }
        catch (Exception ex)
        {
            var inner = ex;
            var fullException = "";
            while (inner != null)
            {
                fullException += inner.Message + " | ";
                inner = inner.InnerException;
            }
            return BadRequest(new { success = false, message = fullException });
        }
    }
}
