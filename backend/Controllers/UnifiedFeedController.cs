using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/unified-feed")]
public class UnifiedFeedController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly IUserService _userService;
    private readonly ILogger<UnifiedFeedController> _logger;

    public UnifiedFeedController(IPostService postService, IUserService userService, ILogger<UnifiedFeedController> logger)
    {
        _postService = postService;
        _userService = userService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetFeed([FromServices] IFeedService feedService, [FromQuery] string feedId = "home", [FromQuery] int take = 20, [FromQuery] int skip = 0)
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
                    var interests = await _userService.GetSelectedInterestsAsync(viewerId.Value);
                    posts = await _postService.GetTrendingPostsAsync(viewerId.Value, skip, take, interests);
                    break;
                case "internal-music":
                    posts = await _postService.GetPostsByTagAsync("music", viewerId.Value, take, skip);
                    break;
                default:
                    if (Guid.TryParse(feedId, out var fGuid))
                    {
                        posts = await feedService.GetFeedPostsAsync(fGuid, viewerId.Value, skip, take);
                    }
                    else if (feedId.StartsWith("tag-"))
                    {
                        var tag = feedId.Substring(4);
                        posts = await _postService.GetPostsByTagAsync(tag, viewerId.Value, take, skip);
                    }
                    else
                    {
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
