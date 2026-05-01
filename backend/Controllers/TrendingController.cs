using BSkyClone.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.AspNetCore.OutputCaching;
using BSkyClone.Services;
using System.Linq;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class TrendingController : ControllerBase
{
    private readonly BSkyDbContext _context;
    private readonly ITrendingService _trendingService;
    private readonly ILogger<TrendingController> _logger;

    public TrendingController(BSkyDbContext context, ITrendingService trendingService, ILogger<TrendingController> logger)
    {
        _context = context;
        _trendingService = trendingService;
        _logger = logger;
    }

    [HttpGet]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> GetTrending()
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? currentUserId = Guid.TryParse(userIdStr, out var cid) ? cid : null;

            _logger.LogInformation("[Trending] GetTrending called for user: {UserId}", currentUserId);

            // Load muted words for user
            var mutedWordsSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (currentUserId.HasValue)
            {
                try
                {
                    var mutedWords = await _context.MutedWords
                        .AsNoTracking()
                        .Where(m => m.UserId == currentUserId.Value)
                        .Select(m => m.Word)
                        .ToListAsync();
                    foreach (var w in mutedWords) mutedWordsSet.Add(w);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[Trending] Error fetching muted words");
                }
            }

            // Get trending data from singleton service (returns immediately)
            var data = _trendingService.GetTrendingData();

            // Filter by muted words per-user
            var topics = data.Topics
                .Where(t => !mutedWordsSet.Contains(t.Hashtag.Replace("#", "")))
                .Take(15)
                .ToList();

            var accounts = data.Accounts;

            _logger.LogInformation("[Trending] Returning {Count} topics and {Count} accounts", topics.Count, accounts.Count);

            return Ok(new { topics, accounts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Trending] Error fetching trending topics");
            return StatusCode(500, new { message = "Error fetching trending topics", details = ex.Message });
        }
    }

    [HttpGet("debug")]
    public async Task<IActionResult> GetTrendingDebug()
    {
        var data = _trendingService.GetTrendingData();
        return Ok(new
        {
            topicsCount = data.Topics.Count,
            accountsCount = data.Accounts.Count,
            sampleTopics = data.Topics.Take(5).Select(t => t.Hashtag).ToList()
        });
    }

    [HttpPost("refresh")]
    [Authorize]
    public async Task<IActionResult> RefreshTrending()
    {
        await _trendingService.RefreshTrendingAsync();
        return Ok(new { message = "Trending refresh triggered" });
    }
}
