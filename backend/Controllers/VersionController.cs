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
        return Ok(new
        {
            Version = "1.0.5",
            BuildDate = "2026-05-01 16:30 UTC",
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown",
            Status = "Live",
            Features = new[] { "StructuredFollowResults", "AggressiveSync", "SingletonTrending", "RobustResolution" }
        });
    }
}
