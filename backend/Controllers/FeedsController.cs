using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FeedsController : ControllerBase
{
    private readonly IFeedService _feedService;
    private readonly IRecommendationService _recommendationService;

    public FeedsController(IFeedService feedService, IRecommendationService recommendationService)
    {
        _feedService = feedService;
        _recommendationService = recommendationService;
    }

    [HttpGet("recommended")]
    public async Task<IActionResult> GetRecommended()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var feeds = await _recommendationService.GetRecommendedFeedsAsync(userId);
        return Ok(feeds);
    }

    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var feeds = await _feedService.GetTrendingFeedsAsync(userId);
        return Ok(feeds);
    }

    [HttpGet("trending-posts")]
    public async Task<IActionResult> GetTrendingPosts([FromServices] IPostService postService, [FromQuery] int limit = 50)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? userId = string.IsNullOrEmpty(userIdString) ? null : Guid.Parse(userIdString);
        
        var posts = await postService.GetTrendingPosts24hAsync(userId, limit);
        return Ok(posts);
    }

    [HttpGet("discover")]
    public async Task<IActionResult> GetDiscoverPosts([FromServices] IPostService postService, [FromQuery] int skip = 0, [FromQuery] int take = 10)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString))
        {
            // Unauthenticated users get trending
            var trendingPosts = await postService.GetTrendingPosts24hAsync(null, take);
            return Ok(trendingPosts);
        }

        var userId = Guid.Parse(userIdString);
        var posts = await postService.GetDiscoverPostsAsync(userId, take, skip);
        return Ok(posts);
    }

    [HttpGet("subscribed")]
    public async Task<IActionResult> GetSubscribed()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var feeds = await _feedService.GetUserFeedsAsync(userId);
        return Ok(feeds);
    }

    [HttpGet("{tid}")]
    public async Task<IActionResult> GetFeed(string tid)
    {
        var feed = await _feedService.GetFeedByTidAsync(tid);
        if (feed == null) return NotFound();
        return Ok(feed);
    }

    [HttpGet("info/{id}")]
    public async Task<IActionResult> GetFeedById(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var feed = await _feedService.GetFeedByIdAsync(id, userId);
        if (feed == null) return NotFound();
        return Ok(feed);
    }

    [HttpPost("save/{feedId}")]
    public async Task<IActionResult> SaveFeed(Guid feedId)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _feedService.SaveFeedAsync(userId, feedId);
        return Ok(result);
    }

    [HttpDelete("unsave/{feedId}")]
    public async Task<IActionResult> UnsaveFeed(Guid feedId)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _feedService.UnsaveFeedAsync(userId, feedId);
        return Ok(result);
    }

    [HttpPost("pin/{feedId}")]
    public async Task<IActionResult> PinFeed(Guid feedId)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _feedService.PinFeedAsync(userId, feedId);
        return Ok(result);
    }

    [HttpDelete("unpin/{feedId}")]
    public async Task<IActionResult> UnpinFeed(Guid feedId)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _feedService.UnpinFeedAsync(userId, feedId);
        return Ok(result);
    }

    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderFeeds([FromBody] List<Guid> feedIds)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _feedService.ReorderFeedsAsync(userId, feedIds);
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchFeeds([FromQuery] string query, [FromQuery] int skip = 0, [FromQuery] int take = 10)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var feeds = await _feedService.SearchFeedsAsync(userId, query, skip, take);
        return Ok(feeds);
    }

    [HttpGet("{feedId}/posts")]
    public async Task<IActionResult> GetFeedPosts(Guid feedId, [FromQuery] int skip = 0, [FromQuery] int take = 10)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? userId = string.IsNullOrEmpty(userIdString) ? null : Guid.Parse(userIdString);

        var posts = await _feedService.GetFeedPostsAsync(feedId, userId, skip, take);
        return Ok(posts);
    }
}
