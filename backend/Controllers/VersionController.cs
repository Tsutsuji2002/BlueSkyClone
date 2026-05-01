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
            Version = "1.0.4",
            BuildDate = "2026-05-01 15:55 UTC",
            Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown",
            Status = "Live",
            Features = new[] { "StructuredFollowResults", "AggressiveSync", "SingletonTrending" }
        });
    }
}
