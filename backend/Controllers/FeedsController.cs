using BSkyClone.Services;
using BSkyClone.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FeedsController : ControllerBase
{
    private readonly IFeedService _feedService;
    private readonly IRecommendationService _recommendationService;
    private readonly ILogger<FeedsController> _logger;

    public FeedsController(IFeedService feedService, IRecommendationService recommendationService, ILogger<FeedsController> logger)
    {
        _feedService = feedService;
        _recommendationService = recommendationService;
        _logger = logger;
    }

    [Authorize]
    [HttpGet("recommended")]
    public async Task<IActionResult> GetRecommended()
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Unauthorized();

            var feeds = await _recommendationService.GetRecommendedFeedsAsync(userId);
            return Ok(feeds);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetRecommended error: {ex.Message}");
            return Ok(new List<FeedDto>());
        }
    }

    [Authorize]
    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending()
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                return Unauthorized();

            var feeds = await _feedService.GetTrendingFeedsAsync(userId);
            _logger.LogInformation("[FeedsController] GetTrending returned {Count} feeds. First Feed ID: {FirstId}", feeds.Count(), feeds.FirstOrDefault()?.Id);
            return Ok(feeds);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetTrending error: {ex.Message}");
            return Ok(new List<FeedDto>());
        }
    }

    [AllowAnonymous]
    [HttpGet("trending-posts")]
    public async Task<IActionResult> GetTrendingPosts([FromServices] IPostService postService, [FromQuery] int limit = 50, [FromQuery] int skip = 0)
    {
        try
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? userId = Guid.TryParse(userIdString, out var cid) ? cid : null;
            
            var posts = await postService.GetTrendingPosts24hAsync(userId, limit, skip);
            _logger.LogInformation("[FeedsController] GetTrendingPosts: UserId={UserId}, Count={Count}", userId, posts.Count());
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetTrendingPosts error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [AllowAnonymous]
    [HttpGet("discover")]
    public async Task<IActionResult> GetDiscoverPosts([FromServices] IPostService postService, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                // Unauthenticated users get trending
                var trendingPosts = await postService.GetTrendingPosts24hAsync(null, take, skip);
                return Ok(trendingPosts);
            }

            var posts = await postService.GetDiscoverPostsAsync(userId, take, skip);
            _logger.LogInformation("[FeedsController] GetDiscoverPosts: UserId={UserId}, Count={Count}", userId, posts.Count());
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetDiscoverPosts error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [Authorize]
    [HttpGet("subscribed")]
    public async Task<IActionResult> GetSubscribed()
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var feeds = await _feedService.GetUserFeedsAsync(userId);
            return Ok(feeds);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetSubscribed error: {ex.Message}");
            return Ok(new List<FeedDto>());
        }
    }

    [AllowAnonymous]
    [HttpGet("resolve")]
    public async Task<IActionResult> ResolveFeedByUri([FromQuery] string uri)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(uri)) return BadRequest(new { message = "uri is required" });
            var dto = await _feedService.GetFeedMetadataByUriAsync(uri.Trim());
            if (dto == null) return NotFound(new { message = "Feed not found" });
            return Ok(dto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedsController] ResolveFeedByUri error: {Msg}", ex.Message);
            return NotFound(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpGet("{tid}")]
    public async Task<IActionResult> GetFeed(string tid)
    {
        try
        {
            var feed = await _feedService.GetFeedByTidAsync(tid);
            if (feed == null) return NotFound();
            return Ok(feed);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetFeed error: {ex.Message}");
            return NotFound();
        }
    }

    [AllowAnonymous]
    [HttpGet("info/{id}")]
    public async Task<IActionResult> GetFeedById(Guid id)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid userId = Guid.TryParse(userIdStr, out var cid) ? cid : Guid.Empty;

            _logger.LogInformation("[FeedsController] GetFeedById requested for ID: {Id}, Original string in path: {PathId}", id, Request.Path.Value?.Split('/').Last());
            var feed = await _feedService.GetFeedByIdAsync(id, userId);
            if (feed == null) return NotFound();
            return Ok(feed);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetFeedById error: {ex.Message}");
            return NotFound();
        }
    }

    [Authorize]
    [HttpPost("save/{feedId}")]
    public async Task<IActionResult> SaveFeed(string feedId, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid fId = Guid.Empty;
            string? resolvedUri = uri;
            if (feedId.StartsWith("at://") || feedId == "following") resolvedUri = feedId;
            else Guid.TryParse(feedId, out fId);

            var result = await _feedService.SaveFeedAsync(userId, fId, resolvedUri);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedsController] SaveFeed error: {Msg}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("unsave/{feedId}")]
    public async Task<IActionResult> UnsaveFeed(string feedId, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid fId = Guid.Empty;
            string? resolvedUri = uri;
            if (feedId.StartsWith("at://") || feedId == "following") resolvedUri = feedId;
            else Guid.TryParse(feedId, out fId);

            var result = await _feedService.UnsaveFeedAsync(userId, fId, resolvedUri);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedsController] UnsaveFeed error: {Msg}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("pin/{feedId}")]
    public async Task<IActionResult> PinFeed(string feedId, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid fId = Guid.Empty;
            string? resolvedUri = uri;
            if (feedId.StartsWith("at://") || feedId == "following") resolvedUri = feedId;
            else Guid.TryParse(feedId, out fId);

            var result = await _feedService.PinFeedAsync(userId, fId, resolvedUri);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedsController] PinFeed error: {Msg}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("unpin/{feedId}")]
    public async Task<IActionResult> UnpinFeed(string feedId, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid fId = Guid.Empty;
            string? resolvedUri = uri;
            if (feedId.StartsWith("at://") || feedId == "following") resolvedUri = feedId;
            else Guid.TryParse(feedId, out fId);

            var result = await _feedService.UnpinFeedAsync(userId, fId, resolvedUri);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedsController] UnpinFeed error: {Msg}", ex.Message);
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("reorder")]
    public async Task<IActionResult> ReorderFeeds([FromBody] List<Guid> feedIds)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var result = await _feedService.ReorderFeedsAsync(userId, feedIds);
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] ReorderFeeds error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("search")]
    public async Task<IActionResult> SearchFeeds([FromQuery] string query, [FromQuery] int skip = 0, [FromQuery] int take = 10)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var feeds = await _feedService.SearchFeedsAsync(userId, query, skip, take);
            return Ok(feeds);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] SearchFeeds error: {ex.Message}");
            return Ok(new List<FeedDto>());
        }
    }

    [AllowAnonymous]
    [HttpGet("{feedId}/posts")]
    public async Task<IActionResult> GetFeedPosts(string feedId, [FromQuery] string? uri = null, [FromQuery] int skip = 0, [FromQuery] int take = 10)
    {
        try
        {
            var userIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? userId = Guid.TryParse(userIdString, out var cid) ? cid : null;

            Guid fId = Guid.Empty;
            string? resolvedUri = uri;

            if (feedId.StartsWith("at://") || feedId == "following")
            {
                resolvedUri = feedId;
            }
            else if (Guid.TryParse(feedId, out var gId))
            {
                fId = gId;
            }
    
            var posts = await _feedService.GetFeedPostsAsync(fId, userId, skip, take, resolvedUri);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[FeedsController] GetFeedPosts error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }
}
