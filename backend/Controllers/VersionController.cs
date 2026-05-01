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
            Version = "1.0.6",
            BuildDate = "2026-05-01 17:30 UTC",
            Environment = "Production",
            Status = "Live",
            Features = new[] { "StructuredFollowResults", "AggressiveSync", "SingletonTrending", "RobustResolution", "PerformanceOptimized", "IndexedUri" }
        };
        return Ok(info);
    }
}
