using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UnifiedFeedController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly ILogger<UnifiedFeedController> _logger;

    public UnifiedFeedController(IPostService postService, ILogger<UnifiedFeedController> logger)
    {
        _postService = postService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetFeed([FromQuery] string feedId = "home", [FromQuery] int take = 20, [FromQuery] int skip = 0)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(userIdStr, out var cid) ? cid : null;

            if (viewerId == null) return Unauthorized();

            IEnumerable<PostDto> posts = new List<PostDto>();

            switch (feedId.ToLower())
            {
                case "home":
                case "following":
                    posts = await _postService.GetTimelineAsync(viewerId.Value, skip, take);
                    break;
                case "discover":
                    posts = await _postService.GetTrendingPostsAsync(viewerId.Value, skip, take);
                    break;
                case "internal-music":
                    posts = await _postService.GetPostsByTagAsync("music", viewerId.Value, take, skip);
                    break;
                default:
                    // If it matches a tag format like tag-art
                    if (feedId.StartsWith("tag-"))
                    {
                        var tag = feedId.Substring(4);
                        posts = await _postService.GetPostsByTagAsync(tag, viewerId.Value, take, skip);
                    }
                    else
                    {
                        // Fallback to following
                        posts = await _postService.GetTimelineAsync(viewerId.Value, skip, take);
                    }
                    break;
            }

            return Ok(new 
            {
                feedId = feedId,
                posts = posts,
                skip = skip,
                hasMore = posts.Count() >= take
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching unified feed {FeedId}", feedId);
            return StatusCode(500, new { error = "Internal server error." });
        }
    }
}
