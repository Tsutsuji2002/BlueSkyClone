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

    private static readonly System.Text.Json.JsonSerializerOptions _jsonOpts = new() { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase };

    private async Task WriteNdjsonStreamAsync(IEnumerable<PostDto> posts, string? cursor)
    {
        Response.ContentType = "application/x-ndjson";
        foreach (var post in posts)
        {
            if (HttpContext.RequestAborted.IsCancellationRequested) break;
            var json = System.Text.Json.JsonSerializer.Serialize(post, _jsonOpts);
            await Response.WriteAsync(json + "\n", HttpContext.RequestAborted);
            await Response.Body.FlushAsync(HttpContext.RequestAborted);
        }
        if (!string.IsNullOrEmpty(cursor))
        {
            await Response.WriteAsync($"{{\"__cursor__\":\"{cursor}\"}}\n", HttpContext.RequestAborted);
            await Response.Body.FlushAsync(HttpContext.RequestAborted);
        }
    }

    [AllowAnonymous]
    [HttpGet]
    public async Task<IActionResult> GetFeed([FromServices] IFeedService feedService, [FromQuery] string feedId = "home", [FromQuery] int take = 30, [FromQuery] int skip = 0, [FromQuery] string? cursor = null, [FromQuery] bool refresh = false, [FromQuery] bool stream = false)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(userIdStr, out var cid) ? cid : null;

            _logger.LogInformation("[UnifiedFeed] FeedId: {FeedId}, ViewerId: {ViewerId}, Cursor: {Cursor}, Stream: {Stream}", feedId, viewerId, cursor, stream);

            // ── HOME / FOLLOWING ────────────────────────────────────────────────
            if (feedId.ToLower() == "home" || feedId.ToLower() == "following")
            {
                if (stream && viewerId.HasValue)
                {
                    // Fast streaming: helper collects raw posts (cache-first, no enrichment)
                    // The stream ends with a __cursor__ sentinel for load-more support
                    await foreach (var post in _postService.GetTimelineStreamAsync(viewerId.Value, skip, take, cursor, refresh, true, HttpContext.RequestAborted))
                    {
                        if (HttpContext.RequestAborted.IsCancellationRequested) break;
                        // Sentinel detection: already emitted by GetTimelineStreamAsync
                        if (post.Id == Guid.Empty && post.Content?.StartsWith("__cursor__:") == true)
                        {
                            var cur = post.Content.Substring("__cursor__:".Length);
                            await Response.WriteAsync($"{{\"__cursor__\":\"{cur}\"}}\n", HttpContext.RequestAborted);
                        }
                        else
                        {
                            await Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(post, _jsonOpts) + "\n", HttpContext.RequestAborted);
                        }
                        await Response.Body.FlushAsync(HttpContext.RequestAborted);
                    }
                    return new EmptyResult();
                }

                // Non-stream fallback
                if (viewerId == null)
                {
                    var trending = await _postService.GetTrendingPosts24hAsync(null, take, skip, refresh, skipDeepResolution: true);
                    return Ok(new { feedId, posts = trending, skip, cursor = (string?)null, hasMore = trending.Any() });
                }
                var paged = await _postService.GetTimelineAsync(viewerId.Value, skip, take, cursor, refresh, skipDeepResolution: true, HttpContext.RequestAborted);
                return Ok(new { feedId, posts = paged.Posts, skip, cursor = paged.Cursor, hasMore = !string.IsNullOrEmpty(paged.Cursor) || (paged.Posts?.Count() ?? 0) >= take });
            }

            // ── AT:// AND FOLLOWING CUSTOM FEEDS ────────────────────────────────
            if (!string.IsNullOrEmpty(feedId) &&
                (feedId.StartsWith("at://", StringComparison.OrdinalIgnoreCase) ||
                 feedId.Equals("following", StringComparison.OrdinalIgnoreCase)))
            {
                var feedResult = await feedService.GetFeedPostsAsync(Guid.Empty, viewerId, skip, take, feedId, cursor, HttpContext.RequestAborted);
                if (stream)
                {
                    await WriteNdjsonStreamAsync(feedResult.Posts, feedResult.Cursor);
                    return new EmptyResult();
                }
                return Ok(new { feedId, posts = feedResult.Posts, skip, cursor = feedResult.Cursor, hasMore = !string.IsNullOrEmpty(feedResult.Cursor) || (feedResult.Posts?.Count() ?? 0) >= take });
            }

            // ── ALL OTHER FEEDS ──────────────────────────────────────────────────
            IEnumerable<PostDto> posts = new List<PostDto>();
            string? outCursor = null;

            switch (feedId.ToLower())
            {
                case "discover":
                    if (viewerId == null)
                    {
                        var guestResult = await feedService.GetFeedPostsAsync(Guid.Empty, null, skip, take, "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot", cursor, HttpContext.RequestAborted);
                        posts = guestResult.Posts; outCursor = guestResult.Cursor;
                    }
                    else
                    {
                        var interests = await _userService.GetSelectedInterestsAsync(viewerId.Value);
                        var trendingPosts = await _postService.GetTrendingPostsAsync(viewerId.Value, skip, take, interests, refresh, skipDeepResolution: true, HttpContext.RequestAborted);
                        posts = trendingPosts.ToList();
                        if (!posts.Any() && skip == 0)
                        {
                            _logger.LogInformation("[UnifiedFeed] Local trending empty, falling back to What's Hot.");
                            var remoteResult = await feedService.GetFeedPostsAsync(Guid.Empty, viewerId, skip, take, "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot", cursor, HttpContext.RequestAborted);
                            posts = remoteResult.Posts; outCursor = remoteResult.Cursor;
                        }
                    }
                    break;
                case "internal-music":
                    posts = await _postService.GetPostsByTagAsync("music", viewerId, take, skip);
                    break;
                default:
                    if (feedId.StartsWith("at://", StringComparison.OrdinalIgnoreCase))
                    {
                        var r = await feedService.GetFeedPostsAsync(Guid.Empty, viewerId, skip, take, feedId, cursor, HttpContext.RequestAborted);
                        posts = r.Posts; outCursor = r.Cursor;
                    }
                    else if (Guid.TryParse(feedId, out var fGuid))
                    {
                        var r = await feedService.GetFeedPostsAsync(fGuid, viewerId, skip, take, null, cursor, HttpContext.RequestAborted);
                        posts = r.Posts; outCursor = r.Cursor;
                    }
                    else if (feedId.StartsWith("tag-"))
                    {
                        posts = await _postService.GetPostsByTagAsync(feedId.Substring(4), viewerId, take, skip);
                    }
                    else
                    {
                        if (viewerId == null)
                        {
                            posts = await _postService.GetTrendingPosts24hAsync(null, take, skip, refresh, skipDeepResolution: true);
                        }
                        else
                        {
                            var r = await _postService.GetTimelineAsync(viewerId.Value, skip, take, cursor, refresh, skipDeepResolution: true, HttpContext.RequestAborted);
                            posts = r.Posts; outCursor = r.Cursor;
                        }
                    }
                    break;
            }

            if (stream && posts.Any())
            {
                await WriteNdjsonStreamAsync(posts, outCursor);
                return new EmptyResult();
            }

            return Ok(new { feedId, posts, skip, cursor = outCursor, hasMore = !string.IsNullOrEmpty(outCursor) || (posts?.Count() ?? 0) > 0 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching unified feed {FeedId}", feedId);
            return StatusCode(500, new { error = "Internal server error." });
        }
    }

}

