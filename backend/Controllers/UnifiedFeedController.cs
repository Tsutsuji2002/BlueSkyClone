using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

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

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetFeed([FromServices] IFeedService feedService, [FromQuery] string feedId = "home", [FromQuery] int take = 5, [FromQuery] int skip = 0, [FromQuery] string? cursor = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(userIdStr, out var cid) ? cid : null;

            _logger.LogInformation("[UnifiedFeed] Request for FeedId: {FeedId}, ViewerId: {ViewerId}, Cursor: {Cursor}", feedId, viewerId, cursor);

            if (!string.IsNullOrEmpty(feedId) &&
                (feedId.StartsWith("at://", StringComparison.OrdinalIgnoreCase) ||
                 feedId.Equals("following", StringComparison.OrdinalIgnoreCase)))
            {
                var pagedResult = await feedService.GetFeedPostsAsync(Guid.Empty, viewerId, skip, take, feedId, cursor);
                return Ok(new
                {
                    feedId = feedId,
                    posts = pagedResult.Posts,
                    skip = skip,
                    cursor = pagedResult.Cursor,
                    hasMore = !string.IsNullOrEmpty(pagedResult.Cursor) || (pagedResult.Posts?.Count() ?? 0) >= take
                });
            }

            IEnumerable<PostDto> posts = new List<PostDto>();
            string? outCursor = null;

            switch (feedId.ToLower())
            {
                case "home":
                case "following":
                    if (viewerId == null)
                    {
                        posts = await _postService.GetTrendingPosts24hAsync(null, take, skip);
                    }
                    else
                    {
                        posts = await _postService.GetTimelineAsync(viewerId.Value, skip, take);
                    }
                    break;
                case "discover":
                    if (viewerId == null)
                    {
                        // Guests get the official "What's Hot" Discover feed
                        var guestResult = await feedService.GetFeedPostsAsync(Guid.Empty, null, skip, take, "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot", cursor);
                        posts = guestResult.Posts;
                        outCursor = guestResult.Cursor;
                    }
                    else
                    {
                        var interests = await _userService.GetSelectedInterestsAsync(viewerId.Value);
                        posts = await _postService.GetTrendingPostsAsync(viewerId.Value, skip, take, interests);
                    }
                    break;
                case "internal-music":
                    posts = await _postService.GetPostsByTagAsync("music", viewerId, take, skip);
                    break;
                default:
                    _logger.LogInformation("[UnifiedFeed] Default case for FeedId: {FeedId}", feedId);
                    if (Guid.TryParse(feedId, out var fGuid))
                    {
                        var guidResult = await feedService.GetFeedPostsAsync(fGuid, viewerId, skip, take, null, cursor);
                        posts = guidResult.Posts;
                        outCursor = guidResult.Cursor;
                        _logger.LogInformation("[UnifiedFeed] Custom GUID feed returned {Count} posts", posts?.Count() ?? 0);
                    }
                    else if (feedId.StartsWith("tag-"))
                    {
                        var tag = feedId.Substring(4);
                        posts = await _postService.GetPostsByTagAsync(tag, viewerId, take, skip);
                    }
                    else
                    {
                        if (viewerId == null)
                        {
                            posts = await _postService.GetTrendingPosts24hAsync(null, take, skip);
                        }
                        else
                        {
                            posts = await _postService.GetTimelineAsync(viewerId.Value, skip, take);
                        }
                    }
                    break;
            }

            return Ok(new 
            {
                feedId = feedId,
                posts = posts,
                skip = skip,
                cursor = outCursor,
                hasMore = !string.IsNullOrEmpty(outCursor) || (posts?.Count() ?? 0) >= take
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching unified feed {FeedId}", feedId);
            return StatusCode(500, new { error = "Internal server error." });
        }
    }
}
