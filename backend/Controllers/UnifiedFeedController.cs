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
    public async Task<IActionResult> GetFeed([FromServices] IFeedService feedService, [FromQuery] string feedId = "home", [FromQuery] int take = 5, [FromQuery] int skip = 0, [FromQuery] string? cursor = null, [FromQuery] bool refresh = false)
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
                var pagedResult = await feedService.GetFeedPostsAsync(Guid.Empty, viewerId, skip, take, feedId, cursor, HttpContext.RequestAborted);
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
                        posts = await _postService.GetTrendingPosts24hAsync(null, take, skip, refresh, skipDeepResolution: true);
                    }
                    else
                    {
                        var paged = await _postService.GetTimelineAsync(viewerId.Value, skip, take, cursor, refresh, skipDeepResolution: true, HttpContext.RequestAborted);
                        posts = paged.Posts;
                        outCursor = paged.Cursor;
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
                        var trendingPosts = await _postService.GetTrendingPostsAsync(viewerId.Value, skip, take, interests, refresh, skipDeepResolution: true, HttpContext.RequestAborted);
                        posts = trendingPosts.ToList();

                        // [NEW] Resilient Fallback: If local trending is empty (due to query timeout or no local data),
                        // immediately fallback to Bluesky's official "What's Hot" feed.
                        if (!posts.Any() && skip == 0)
                        {
                            _logger.LogInformation("[UnifiedFeed] Local trending empty for {UserId}. Falling back to Bluesky What's Hot.", viewerId);
                            var remoteResult = await feedService.GetFeedPostsAsync(Guid.Empty, viewerId, skip, take, "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot", cursor, HttpContext.RequestAborted);
                            posts = remoteResult.Posts;
                            outCursor = remoteResult.Cursor;
                        }
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
                            posts = await _postService.GetTrendingPosts24hAsync(null, take, skip, refresh, skipDeepResolution: true);
                        }
                        else
                        {
                            var paged = await _postService.GetTimelineAsync(viewerId.Value, skip, take, cursor, refresh, skipDeepResolution: true, HttpContext.RequestAborted);
                            posts = paged.Posts;
                            outCursor = paged.Cursor;
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
                hasMore = !string.IsNullOrEmpty(outCursor) || (posts?.Count() ?? 0) > 0
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching unified feed {FeedId}", feedId);
            return StatusCode(500, new { error = "Internal server error." });
        }
    }
}
