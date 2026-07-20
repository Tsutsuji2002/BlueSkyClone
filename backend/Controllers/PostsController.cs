using BSkyClone.DTOs;
using BSkyClone.Services;
using BSkyClone.UnitOfWork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.OutputCaching;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ThreadReplyCacheService _threadReplyCacheService;
    private readonly ILogger<PostsController> _logger;

    public PostsController(IPostService postService, IUnitOfWork unitOfWork, ThreadReplyCacheService threadReplyCacheService, ILogger<PostsController> logger)
    {
        _postService = postService;
        _unitOfWork = unitOfWork;
        _threadReplyCacheService = threadReplyCacheService;
        _logger = logger;
    }

    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline([FromQuery] int skip = 0, [FromQuery] int take = 30)
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();
            
            var pagedResult = await _postService.GetTimelineAsync(userId, skip, take);
            _logger.LogInformation("[PostsController] GetTimeline: UserId={UserId}, Count={Count}", userId, pagedResult.Posts.Count());
            return Ok(pagedResult.Posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetTimeline error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpGet("trending")]
    [AllowAnonymous]
    [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "skip", "take" })]
    public async Task<IActionResult> GetTrending([FromQuery] int skip = 0, [FromQuery] int take = 30)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var posts = await _postService.GetTrendingPostsAsync(viewerId, skip, take);
            _logger.LogInformation("[PostsController] GetTrending: ViewerId={ViewerId}, Count={Count}, Skip={Skip}, Take={Take}", viewerId, posts.Count(), skip, take);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetTrending error: {ex}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpGet("discover")]
    public async Task<IActionResult> GetDiscover([FromQuery] int take = 30, [FromQuery] int skip = 0)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var posts = await _postService.GetDiscoverPostsAsync(userId, take, skip);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetDiscover error: {ex}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpGet("bookmarks")]
    public async Task<IActionResult> GetBookmarks([FromQuery] int skip = 0, [FromQuery] int take = 5)
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var result = await _postService.GetBookmarkedPostsAsync(userId, skip, take);
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetBookmarks error: {ex.Message}");
            return Ok(new PagedPostDto());
        }
    }
    [HttpPost("interactions/status")]
    public async Task<IActionResult> GetInteractionStatuses([FromBody] PostInteractionStatusRequest? request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var uris = request?.Uris ?? new List<string>();
            var statuses = await _postService.GetInteractionStatusesAsync(userId, uris);
            return Ok(statuses);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetInteractionStatuses error: {ex.Message}");
            return Ok(new List<PostInteractionStatusDto>());
        }
    }

    /// <summary>
    /// Returns viewer like/repost state for a given list of AT-URIs by querying the Bluesky AppView
    /// with the user's stored OAuth token. Supplements the local-DB-based /interactions/status for
    /// posts liked/reposted natively on Bluesky (not stored in our Likes/Reposts tables).
    /// </summary>
    [HttpPost("interactions/viewer-state")]
    public async Task<IActionResult> GetViewerState([FromBody] PostInteractionStatusRequest? request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var uris = (request?.Uris ?? new List<string>())
                .Where(u => !string.IsNullOrWhiteSpace(u) && u.StartsWith("at://") && !u.Contains("local"))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!uris.Any()) return Ok(new List<PostInteractionStatusDto>());

            var statuses = await _postService.GetViewerStateFromAppViewAsync(userId, uris);
            return Ok(statuses);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetViewerState error: {ex.Message}");
            return Ok(new List<PostInteractionStatusDto>());
        }
    }

    [AllowAnonymous]
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserPosts(string userId, [FromQuery] string? type = null, [FromQuery] int take = 30, [FromQuery] int skip = 0, [FromQuery] string? cursor = null, [FromQuery] bool refresh = false, [FromQuery] bool includePins = false, [FromQuery] bool stream = false)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            string handleOrDid = userId;
            if (Guid.TryParse(userId, out var userGuid))
            {
                var user = await _unitOfWork.Users.GetByIdAsync(userGuid);
                if (user != null)
                {
                    handleOrDid = user.Did ?? user.Handle ?? userId;
                }
            }

            if (stream)
            {
                Response.ContentType = "application/x-ndjson";
                await foreach (var post in _postService.GetUserPostsStreamAsync(handleOrDid, viewerId, take, type, cursor, includePins))
                {
                    // Detect cursor sentinel emitted at the end of the stream
                    if (post.Id == Guid.Empty && post.Content != null && post.Content.StartsWith("__cursor__:"))
                    {
                        var cursorValue = post.Content.Substring("__cursor__:".Length);
                        await Response.WriteAsync($"{{\"__cursor__\":\"{cursorValue}\"}}\n", HttpContext.RequestAborted);
                    }
                    else
                    {
                        var json = System.Text.Json.JsonSerializer.Serialize(post, new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });
                        await Response.WriteAsync(json + "\n", HttpContext.RequestAborted);
                    }
                    await Response.Body.FlushAsync(HttpContext.RequestAborted);
                }
                return new EmptyResult();
            }

            var result = await _postService.GetUserPostsAsync(handleOrDid, viewerId, skip, take, type, cursor, refresh, includePins);
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetUserPosts error: {ex.Message}");
            return Ok(new PagedPostDto());
        }
    }


    [HttpPost]
    public async Task<IActionResult> CreatePost([FromForm] CreatePostRequest request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var post = await _postService.CreatePostAsync(userId, request);

            // Invalidate relevant caches
            try
            {
                var cacheService = HttpContext.RequestServices.GetRequiredService<ICacheService>();
                await cacheService.RemoveAsync($"Timeline_{userId}");
                await cacheService.RemoveAsync("Trending");
                await cacheService.RemoveByPrefixAsync("Search_");
                _logger.LogInformation("[PostsController] Cache invalidated for user {UserId} after post creation", userId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[PostsController] Failed to invalidate cache after post creation");
            }

            return Ok(post);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] CreatePost error: {ex}");
            return BadRequest(new { message = ex.Message, stackTrace = ex.ToString() });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdatePost(string id, [FromForm] CreatePostRequest request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();
            
            Guid postId;
            if (!Guid.TryParse(id, out postId))
            {
                var p = await _postService.GetPostByTidAsync(id);
                if (p == null) return NotFound("Post not found by TID.");
                postId = p.Id;
            }

            var post = await _postService.UpdatePostAsync(userId, postId, request);
            if (post == null) return NotFound("Post not found or you are not authorized to edit it.");
            return Ok(post);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] UpdatePost error: {ex.Message}");
            // Return detailed message to help debug concurrency
            return BadRequest(new { message = ex.Message, detailed = ex.ToString() });
        }
    }

    [HttpGet("details")]
    public async Task<IActionResult> GetPostDetails([FromQuery] string? id, [FromQuery] string? uri, [FromQuery] int take = 20, [FromQuery] int depth = 0, [FromQuery] int parentHeight = 0)
    {
        string identifier = uri ?? id ?? "";
        if (string.IsNullOrEmpty(identifier)) return BadRequest("Post ID or URI required.");

        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            PostDto? post = null;
            if (Guid.TryParse(identifier, out var guidTaskId))
            {
                post = await _postService.GetPostByIdAsync(guidTaskId, viewerId);
            }
            else
            {
                post = await _postService.GetPostByTidAsync(identifier, viewerId);
            }

            if (post == null) return NotFound();

            // If it's a remote post (stub), fetch the full thread from AppView
            if (!string.IsNullOrEmpty(post.Uri) && post.Uri.StartsWith("at://"))
            {
                var xrpcThread = await _postService.GetPostThreadAsync(post.Uri, depth, parentHeight, viewerId, take);
                if (xrpcThread != null)
                {
                    return Ok(xrpcThread);
                }
            }

            var thread = new List<PostDto> { post };
            var current = post;

            // Fetch Ancestors - optimized with batch loading
            var ancestorTids = new List<string>();
            for (int i = 0; i < 5; i++)
            {
                if (!string.IsNullOrEmpty(current.ReplyToPostId))
                {
                    ancestorTids.Add(current.ReplyToPostId);
                    // We need to get the next parent, but we don't have it yet
                    // For now, we'll break and load all ancestors at once
                    break;
                }
                else break;
            }

            // Batch load all ancestors
            if (ancestorTids.Count > 0)
            {
                var ancestors = await _postService.GetPostsByTidsAsync(ancestorTids, viewerId);
                var ancestorDict = ancestors.ToDictionary(a => a.Tid ?? a.Id.ToString());

                // Build thread from ancestors
                current = post;
                for (int i = 0; i < 5; i++)
                {
                    if (!string.IsNullOrEmpty(current.ReplyToPostId))
                    {
                        if (ancestorDict.TryGetValue(current.ReplyToPostId, out var parent))
                        {
                            if (!thread.Any(p => p.Id == parent.Id)) thread.Add(parent);
                            current = parent;
                        }
                        else break;
                    }
                    else break;
                }
            }

            // Fetch Replies
            var replies = await _postService.GetPostRepliesAsync(post.Id, viewerId, 0, take);
            foreach (var reply in replies)
            {
                if (!thread.Any(p => p.Id == reply.Id)) thread.Add(reply);
            }

            return Ok(thread);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetPostDetails error: {ex.Message}");
            return NotFound();
        }
    }

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPost(string id, [FromQuery] int take = 20, [FromQuery] int depth = 0, [FromQuery] int parentHeight = 0)
    {
        // Redirect to new query-based logic for robustness if it looks like a URI
        if (id.Contains("at://") || id.Contains("%")) 
            return await GetPostDetails(null, System.Net.WebUtility.UrlDecode(id), take, depth, parentHeight);
            
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            PostDto? post = null;
            if (Guid.TryParse(id, out var guidTaskId))
            {
                post = await _postService.GetPostByIdAsync(guidTaskId, viewerId);
            }
            else
            {
                post = await _postService.GetPostByTidAsync(id, viewerId);
            }

            if (post == null) return NotFound();

            var thread = new List<PostDto> { post };
            var current = post;

            // Collect ancestor TIDs for batch loading
            var ancestorTids = new List<string>();
            for (int i = 0; i < 5; i++)
            {
                if (!string.IsNullOrEmpty(current.ReplyToPostId))
                {
                    ancestorTids.Add(current.ReplyToPostId);
                    // We need to get the next parent, but we don't have it yet
                    // For now, we'll break and load all ancestors at once
                    break;
                }
                else break;
            }

            // Batch load all ancestors
            if (ancestorTids.Count > 0)
            {
                var ancestors = await _postService.GetPostsByTidsAsync(ancestorTids, viewerId);
                var ancestorDict = ancestors.ToDictionary(a => a.Tid ?? a.Id.ToString());

                // Build thread from ancestors
                current = post;
                for (int i = 0; i < 5; i++)
                {
                    if (!string.IsNullOrEmpty(current.ReplyToPostId))
                    {
                        if (ancestorDict.TryGetValue(current.ReplyToPostId, out var parent))
                        {
                            if (!thread.Any(p => p.Id == parent.Id)) thread.Add(parent);
                            current = parent;
                        }
                        else break;
                    }
                    else break;
                }
            }

            // Fetch Replies
            var replies = await _postService.GetPostRepliesAsync(post.Id, viewerId);
            foreach (var reply in replies)
            {
                if (!thread.Any(p => p.Id == reply.Id)) thread.Add(reply);
            }

            return Ok(thread);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetPost error: {ex.Message}");
            return NotFound();
        }
    }

    [AllowAnonymous]
    [HttpGet("tid/{tid}")]
    public async Task<IActionResult> GetPostByTid(string tid, [FromQuery] int take = 20, [FromQuery] int depth = 0, [FromQuery] int parentHeight = 0)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            _logger.LogInformation("[PostsController] GetPostByTid: Requested Tid={Tid}, ViewerId={ViewerId}", tid, viewerId);

            var post = await _postService.GetPostByTidAsync(tid, viewerId);
            if (post == null) 
            {
                _logger.LogWarning("[PostsController] GetPostByTid: Post NOT FOUND for Tid={Tid}", tid);
                return NotFound();
            }

            // If it's a remote post (stub), fetch the full thread from AppView
            if (!string.IsNullOrEmpty(post.Uri) && post.Uri.StartsWith("at://"))
            {
                var xrpcThread = await _postService.GetPostThreadAsync(post.Uri, depth, parentHeight, viewerId, take);
                if (xrpcThread != null)
                {
                    return Ok(xrpcThread);
                }
            }

            var thread = new List<PostDto> { post };

            // Fetch Ancestors - optimized with batch loading
            var current = post;
            var ancestorTids = new List<string>();
            for (int i = 0; i < 5; i++)
            {
                if (!string.IsNullOrEmpty(current.ReplyToPostId))
                {
                    ancestorTids.Add(current.ReplyToPostId);
                    // We need to get the next parent, but we don't have it yet
                    // For now, we'll break and load all ancestors at once
                    break;
                }
                else break;
            }

            // Batch load all ancestors
            if (ancestorTids.Count > 0)
            {
                var ancestors = await _postService.GetPostsByTidsAsync(ancestorTids, viewerId);
                var ancestorDict = ancestors.ToDictionary(a => a.Tid ?? a.Id.ToString());

                // Build thread from ancestors
                current = post;
                for (int i = 0; i < 5; i++)
                {
                    if (!string.IsNullOrEmpty(current.ReplyToPostId))
                    {
                        if (ancestorDict.TryGetValue(current.ReplyToPostId, out var parent))
                        {
                            if (!thread.Any(p => p.Id == parent.Id)) thread.Add(parent);
                            current = parent;
                        }
                        else break;
                    }
                    else break;
                }
            }

            // Fetch Replies
            var replies = await _postService.GetPostRepliesAsync(post.Id, viewerId);
            foreach (var reply in replies)
            {
                if (!thread.Any(p => p.Id == reply.Id)) thread.Add(reply);
            }

            return Ok(thread);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetPostByTid error: {ex.Message}");
            return NotFound();
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePost(string id, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid postId;
            // Support URI-based deletion
            if (id.StartsWith("at://") || !string.IsNullOrEmpty(uri))
            {
                var resolvedUri = uri ?? id;
                var post = await _postService.GetPostByUriAsync(resolvedUri, userId);
                
                // If URI resolution fails, try direct TID lookup as fallback
                if (post == null)
                {
                    // Extract TID from the URI (last segment)
                    var tid = resolvedUri.Contains('/') ? resolvedUri.Split('/').Last() : resolvedUri;
                    if (!string.IsNullOrEmpty(tid))
                    {
                        post = await _postService.GetPostByTidAsync(tid, userId);
                    }
                }
                
                if (post == null) 
                {
                    _logger.LogWarning("[PostsController] DeletePost: Could not resolve URI={Uri} or TID fallback for id={Id}", uri, id);
                    return NotFound("Post URI could not be resolved.");
                }
                postId = post.Id;
            }
            else if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id);
                if (post == null) return NotFound();
                postId = post.Id;
            }
            
            var deletedIds = await _postService.DeletePostAsync(userId, postId);
            if (deletedIds == null) return BadRequest("Could not delete post");
            return Ok(deletedIds);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] DeletePost error: {ex}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/like")]
    public async Task<IActionResult> LikePost(string id, [FromQuery] string? uri = null, [FromQuery] bool? isLiked = null, [FromQuery] string? likeUri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid postId;
            if (id.StartsWith("at://") || !string.IsNullOrEmpty(uri))
            {
                var resolvedUri = uri ?? id;
                _logger.LogInformation("[PostsController] LikePost: Using URI fast-path for {Uri}", resolvedUri);

                // [FAST PATH] For remote posts, skip GetPostByUriAsync (slow ingestion) entirely.
                // ToggleLikeAsync handles the CID fetch internally with a fast targeted call.
                // Only do a local DB check (no network) to get the local GUID if it exists.
                var localPost = await _unitOfWork.Posts.Query()
                    .Select(p => new { p.Id, p.Uri })
                    .FirstOrDefaultAsync(p => p.Uri == resolvedUri);
                postId = localPost?.Id ?? Guid.Empty;
            }
            else if (!Guid.TryParse(id, out postId))
            {
                _logger.LogInformation("[PostsController] LikePost: Resolving by TID={Tid}", id);
                var post = await _postService.GetPostByTidAsync(id, userId, bypassCache: true);
                if (post == null)
                {
                    _logger.LogWarning("[PostsController] LikePost: FAILED to resolve TID={Tid}", id);
                    return NotFound($"Post with TID {id} not found.");
                }
                postId = post.Id;
            }
            
            _logger.LogInformation("[PostsController] LikePost: Toggling interaction for PostId={PostId} (OriginalId={Id})", postId, id);
            string? fallbackUri = uri ?? (id.StartsWith("at://") ? id : null);
            var result = (dynamic)await _postService.ToggleLikeAsync(userId, postId, isLiked, likeUri, fallbackUri);
            
            // Check for service-level errors and return as BadRequest so frontend detects failure
            try {
                if (result.error != null) return BadRequest(result);
            } catch {}

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] LikePost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/bookmark")]
    public async Task<IActionResult> BookmarkPost(string id, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid postId;
            if (id.StartsWith("at://") || !string.IsNullOrEmpty(uri))
            {
                var resolvedUri = uri ?? id;
                _logger.LogInformation("[PostsController] BookmarkPost: Using URI fast-path for {Uri}", resolvedUri);

                // [FAST PATH] For remote posts, skip GetPostByUriAsync (slow ingestion) entirely.
                // ToggleBookmarkAsync handles stubs/background ingestion internally.
                var localPost = await _unitOfWork.Posts.Query()
                    .Select(p => new { p.Id, p.Uri })
                    .FirstOrDefaultAsync(p => p.Uri == resolvedUri);
                postId = localPost?.Id ?? Guid.Empty;
            }
            else if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id, userId, bypassCache: true);
                if (post == null) return NotFound();
                postId = post.Id;
            }
            
            var result = await _postService.ToggleBookmarkAsync(userId, postId, uri ?? (id.StartsWith("at://") ? id : null));
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] BookmarkPost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/repost")]
    public async Task<IActionResult> RepostPost(string id, [FromQuery] string? uri = null, [FromQuery] bool? isReposted = null, [FromQuery] string? repostUri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid postId;
            if (id.StartsWith("at://") || !string.IsNullOrEmpty(uri))
            {
                var resolvedUri = uri ?? id;
                _logger.LogInformation("[PostsController] RepostPost: Using URI fast-path for {Uri}", resolvedUri);

                // [FAST PATH] For remote posts, skip GetPostByUriAsync (slow ingestion) entirely.
                // ToggleRepostAsync handles the CID fetch internally with a fast targeted call.
                // Only do a local DB check (no network) to get the local GUID if it exists.
                var localPost = await _unitOfWork.Posts.Query()
                    .Select(p => new { p.Id, p.Uri })
                    .FirstOrDefaultAsync(p => p.Uri == resolvedUri);
                postId = localPost?.Id ?? Guid.Empty;
            }
            else if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id, userId, bypassCache: true);
                if (post == null) return NotFound();
                postId = post.Id;
            }
            _logger.LogInformation("[PostsController] RepostPost: Toggling interaction for PostId={PostId} (OriginalId={Id})", postId, id);
            string? fallbackUri = uri ?? (id.StartsWith("at://") ? id : null);
            var result = (dynamic)await _postService.ToggleRepostAsync(userId, postId, isReposted, repostUri, fallbackUri);
            
            // Check for service-level errors and return as BadRequest so frontend detects failure
            try {
                if (result.error != null) return BadRequest(result);
            } catch {}

            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] RepostPost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [HttpGet("replies")]
    public async Task<IActionResult> GetPostReplies([FromQuery] string? id, [FromQuery] string? uri, [FromQuery] string? identifier, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        string inputIdentifier = identifier ?? uri ?? id ?? "";
        if (string.IsNullOrEmpty(inputIdentifier)) return BadRequest("Post ID or URI required.");

        // Enforce maximum take limit for performance
        take = Math.Min(take, 100);
        
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            // Normalize identifier if it's a known post TID or a handle-based URI
            string cacheKey = inputIdentifier;
            PostDto? post = null;
            
            // Log specifically for Mariana post to debug if needed
            if (inputIdentifier.Contains("3mk2b7qv3nk2h"))
            {
                _logger.LogInformation("[PostsController] Debugging scale post: {Id}", inputIdentifier);
            }

            if (!inputIdentifier.Contains("did:plc:"))
            {
                // Resolve handle-based URI or TID to canonical DID-based URI
                if (inputIdentifier.StartsWith("at://")) post = await _postService.GetPostByUriAsync(inputIdentifier, viewerId);
                else post = await _postService.GetPostByTidAsync(inputIdentifier, viewerId);
                
                if (post != null && !string.IsNullOrEmpty(post.Uri)) cacheKey = post.Uri;
            }

            // 1. Check cache first
            if (!_threadReplyCacheService.TryGet(cacheKey, out var allReplies) || allReplies == null)
            {
                // 2. Cache miss — fetch the thread from Bluesky
                allReplies = new List<PostDto>();
                
                if (post == null)
                {
                    if (inputIdentifier.StartsWith("at://")) post = await _postService.GetPostByUriAsync(inputIdentifier, viewerId);
                    else post = await _postService.GetPostByTidAsync(inputIdentifier, viewerId);
                }

                string? threadUri = post?.Uri ?? (inputIdentifier.StartsWith("at://") ? inputIdentifier : null);
                if (string.IsNullOrEmpty(threadUri)) return NotFound("Post not found.");
                
                // Final normalization check: ensure we always use the DID-based URI in the cache
                cacheKey = threadUri;

                // Depth 4 gives a deeper conversation tree, matching BSky's detailed view
                // We use V2 (unspecced) which handles large threads better
                _logger.LogInformation("[PostsController] Fetching V2 thread for {Uri} (Viewer: {Viewer})", threadUri, viewerId);
                var xrpcThread = await _postService.GetPostThreadV2Async(threadUri, 4, 0, "top", viewerId);
                
                // Fallback to standard V1 if V2 fails
                if (xrpcThread == null)
                {
                    _logger.LogInformation("[PostsController] V2 failed, falling back to V1 for {Uri}", threadUri);
                    xrpcThread = await _postService.GetPostThreadAsync(threadUri, 2, 0, viewerId);
                }

                int totalExpected = 0;
                
                if (xrpcThread == null)
                {
                    // Fallback to local DB if remote resolution fails or it's not a remote post yet
                    Guid postId;
                    if (!Guid.TryParse(inputIdentifier, out postId))
                    {
                        var p3 = await _postService.GetPostByTidAsync(inputIdentifier, viewerId);
                        if (p3 == null) return NotFound();
                        postId = p3.Id;
                    }
                    var replies = await _postService.GetPostRepliesAsync(postId, viewerId, 0, 1000);
                    allReplies = replies.ToList();
                }
                else
                {
                    allReplies = ExtractDirectRepliesFromThread(xrpcThread, cacheKey, out totalExpected);
                    _logger.LogInformation("[PostsController] Extracted {Count} replies from XRPC (Expected: {Expected}) for {Uri}", allReplies.Count, totalExpected, cacheKey);
                    
                    // 3. Deep Fetch Fallback
                    if (allReplies.Count < totalExpected && totalExpected > 20)
                    {
                        _logger.LogInformation("[PostsController] Attempting Search Deep Fetch for {Uri}", cacheKey);
                        var searchReplies = await FetchMoreRepliesViaSearch(cacheKey, viewerId);
                        _logger.LogInformation("[PostsController] Search found {Count} new replies for {Uri}", searchReplies.Count, cacheKey);
                        var existingUris = new HashSet<string>(allReplies.Select(r => r.Uri).Where(u => u != null)!, StringComparer.OrdinalIgnoreCase);
                        
                        foreach (var sr in searchReplies)
                        {
                            if (sr.Uri != null && !existingUris.Contains(sr.Uri))
                            {
                                allReplies.Add(sr);
                                existingUris.Add(sr.Uri);
                            }
                        }
                    }
                }

                // 3. Sort consistently
                allReplies = allReplies?
                    .OrderByDescending(r => r.LikesCount)
                    .ThenBy(r => r.CreatedAt)
                    .ToList() ?? new List<PostDto>();

                // 4. Cache the full sorted list
                _threadReplyCacheService.Set(cacheKey, allReplies);
            }

            // 5. Apply skip/take to the cached list
            var page = (allReplies ?? new List<PostDto>())
                .Skip(skip)
                .Take(take)
                .ToList();

            var hasMore = (skip + take) < allReplies.Count;

            return Ok(new 
            { 
                posts = page, 
                hasMore = hasMore, 
                totalCount = allReplies.Count 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] GetPostReplies error for identifier {Identifier}", inputIdentifier);
            return Ok(new 
            { 
                posts = new List<PostDto>(), 
                hasMore = false, 
                totalCount = 0 
            });
        }
    }

    /// <summary>
    /// SSE streaming endpoint: fetches thread once, emits each reply as an SSE event immediately,
    /// allowing the frontend to render replies progressively as they arrive.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("replies/stream")]
    public async Task GetPostRepliesStream([FromQuery] string? uri, [FromQuery] string? id, [FromQuery] string? identifier)
    {
        string inputIdentifier = identifier ?? uri ?? id ?? "";
        if (string.IsNullOrEmpty(inputIdentifier))
        {
            Response.StatusCode = 400;
            return;
        }

        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no"; // Disable Nginx buffering
        Response.Headers["Connection"] = "keep-alive";
        await Response.Body.FlushAsync();

        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        async Task SendEvent(string eventName, object data)
        {
            var json = System.Text.Json.JsonSerializer.Serialize(data, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            });
            var payload = $"event: {eventName}\ndata: {json}\n\n";
            await Response.Body.WriteAsync(System.Text.Encoding.UTF8.GetBytes(payload), HttpContext.RequestAborted);
            await Response.Body.FlushAsync(HttpContext.RequestAborted);
        }

        try
        {
            // Resolve URI
            string? threadUri = null;
            if (inputIdentifier.StartsWith("at://"))
            {
                threadUri = inputIdentifier;
            }
            else
            {
                PostDto? resolvedPost = null;
                if (inputIdentifier.Contains("did:plc:"))
                    resolvedPost = await _postService.GetPostByUriAsync(inputIdentifier, viewerId);
                else
                    resolvedPost = await _postService.GetPostByTidAsync(inputIdentifier, viewerId);
                threadUri = resolvedPost?.Uri ?? (inputIdentifier.StartsWith("at://") ? inputIdentifier : null);
            }

            if (string.IsNullOrEmpty(threadUri))
            {
                await SendEvent("error", new { message = "Post not found" });
                return;
            }

            // Check cache first — emit all cached replies immediately
            if (_threadReplyCacheService.TryGet(threadUri, out var cachedReplies) && cachedReplies?.Count > 0)
            {
                await SendEvent("meta", new { totalCount = cachedReplies.Count });
                foreach (var reply in cachedReplies)
                {
                    if (HttpContext.RequestAborted.IsCancellationRequested) return;
                    await SendEvent("reply", reply);
                }
                await SendEvent("done", new { });
                return;
            }

            // Fetch from Bluesky V2
            _logger.LogInformation("[PostsController] SSE: Fetching V2 thread for {Uri}", threadUri);
            var xrpcThread = await _postService.GetPostThreadV2Async(threadUri, 4, 0, "top", viewerId);

            // Fallback to V1
            if (xrpcThread == null)
            {
                _logger.LogInformation("[PostsController] SSE: V2 failed, falling back to V1 for {Uri}", threadUri);
                xrpcThread = await _postService.GetPostThreadAsync(threadUri, 2, 0, viewerId);
            }

            if (xrpcThread == null)
            {
                // Last resort: local DB
                Guid postId;
                if (!Guid.TryParse(inputIdentifier, out postId))
                {
                    var p = await _postService.GetPostByTidAsync(inputIdentifier, viewerId);
                    if (p == null) { await SendEvent("done", new { }); return; }
                    postId = p.Id;
                }
                var dbReplies = (await _postService.GetPostRepliesAsync(postId, viewerId, 0, 200)).ToList();
                await SendEvent("meta", new { totalCount = dbReplies.Count });
                foreach (var reply in dbReplies)
                {
                    if (HttpContext.RequestAborted.IsCancellationRequested) return;
                    await SendEvent("reply", reply);
                }
                await SendEvent("done", new { });
                return;
            }

            // Process extraction using unified method
            int totalReplyCount = 0;
            var allReplies = ExtractDirectRepliesFromThread(xrpcThread, threadUri, out totalReplyCount);
            
            await SendEvent("meta", new { totalCount = totalReplyCount });
            _logger.LogInformation("[PostsController] SSE: Extracted {Count} replies for {Uri}. (totalCount expected: {Expected})", allReplies.Count, threadUri, totalReplyCount);

            foreach (var postDto in allReplies)
            {
                if (HttpContext.RequestAborted.IsCancellationRequested) break;
                await SendEvent("reply", postDto);
            }

            // Cache the full list for subsequent paginated calls if user refreshes
            _threadReplyCacheService.Set(threadUri, allReplies);

            await SendEvent("done", new { });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] SSE GetPostRepliesStream error for {Identifier}", inputIdentifier);
            try { await SendEvent("error", new { message = "Stream error" }); } catch { /* ignore */ }
        }
    }


    private List<PostDto> ExtractDirectRepliesFromThread(object threadResponse, string rootUri, out int totalReplyCount)
    {
        var results = new List<PostDto>();
        totalReplyCount = 0;
        try
        {
            var json = Newtonsoft.Json.JsonConvert.SerializeObject(threadResponse);
            var jObject = Newtonsoft.Json.Linq.JObject.Parse(json);
            
            var threadNode = jObject["thread"];
            if (threadNode == null) return results;

            if (threadNode is Newtonsoft.Json.Linq.JArray threadArray)
            {
                // Handle V2 Flat Structure (unspecced.getPostThreadV2)
                // Each item: { depth: int, value: { $type, post: <AppBskyFeedDefs#postView> } }
                foreach (var item in threadArray)
                {
                    var depth = (int)(item["depth"] ?? -1);
                    var valueNode = item["value"];
                    var postNode = valueNode?["post"];

                    if (postNode == null) continue;

                    if (depth == 0)
                    {
                        totalReplyCount = (int)(postNode["replyCount"] ?? 0);
                    }
                    else if (depth == 1)
                    {
                        var postDto = MapBskyPostViewToDto(postNode);
                        if (postDto != null) results.Add(postDto);
                    }
                }
            }
            else if (threadNode is Newtonsoft.Json.Linq.JObject threadObj)
            {
                // Handle V1 Tree Structure (app.bsky.feed.getPostThread)
                // { thread: { $type, post: <postView>, replies: [...] } }
                var rootPostNode = threadObj["post"];
                if (rootPostNode != null)
                {
                    totalReplyCount = (int)(rootPostNode["replyCount"] ?? 0);
                }

                if (threadObj["replies"] is Newtonsoft.Json.Linq.JArray repliesArray)
                {
                    foreach (var replyNode in repliesArray)
                    {
                        var postNode = replyNode["post"];
                        if (postNode == null) continue;
                        var postDto = MapBskyPostViewToDto(postNode);
                        if (postDto != null)
                        {
                            postDto.RepliesCount = (int)(postNode["replyCount"] ?? postDto.RepliesCount);
                            results.Add(postDto);
                        }
                    }
                }
            }
            
            if (results.Count == 0 && totalReplyCount > 0)
            {
                _logger.LogWarning("[PostsController] No replies extracted for {Uri} (totalReplyCount={Count}). First 500 chars: {Raw}", 
                    rootUri, totalReplyCount,
                    json.Length > 500 ? json.Substring(0, 500) : json);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] Error extracting replies for {Uri}", rootUri);
        }
        return results;
    }

    /// <summary>
    /// Maps a Bluesky AppView postView JSON node (camelCase) to our internal PostDto.
    /// Bluesky fields: uri, cid, author.{did,handle,displayName,avatar}, record.{text,createdAt},
    ///                 replyCount, repostCount, likeCount, quoteCount, viewer.{like,repost}
    /// </summary>
    private PostDto? MapBskyPostViewToDto(Newtonsoft.Json.Linq.JToken postNode)
    {
        try
        {
            var uri = postNode["uri"]?.ToString();
            var cid = postNode["cid"]?.ToString();
            if (string.IsNullOrEmpty(uri)) return null;

            // Extract TID from AT URI: at://did/app.bsky.feed.post/<tid>
            var tid = uri.Contains('/') ? uri.Split('/').Last() : uri;

            var authorNode = postNode["author"];
            var author = new AuthorDto
            {
                Did = authorNode?["did"]?.ToString(),
                Handle = authorNode?["handle"]?.ToString() ?? "",
                Username = authorNode?["handle"]?.ToString() ?? "",
                DisplayName = authorNode?["displayName"]?.ToString(),
                AvatarUrl = authorNode?["avatar"]?.ToString(),
            };

            var recordNode = postNode["record"];
            var content = recordNode?["text"]?.ToString();
            var createdAtStr = recordNode?["createdAt"]?.ToString();
            DateTime? createdAt = DateTime.TryParse(createdAtStr, out var dt) ? DateTime.SpecifyKind(dt, DateTimeKind.Utc) : null;

            var replyCount = (int)(postNode["replyCount"] ?? 0);
            var repostCount = (int)(postNode["repostCount"] ?? 0);
            var likeCount = (int)(postNode["likeCount"] ?? 0);
            var quoteCount = (int)(postNode["quoteCount"] ?? 0);

            // Viewer state (requires auth)
            var viewerNode = postNode["viewer"];
            var isLiked = viewerNode?["like"] != null;
            var isReposted = viewerNode?["repost"] != null;
            var likeUri = viewerNode?["like"]?.ToString();
            var repostUri = viewerNode?["repost"]?.ToString();

            // Reply parent info
            var replyRef = recordNode?["reply"];
            var replyToParentUri = replyRef?["parent"]?["uri"]?.ToString();

            // Images from embed
            var imageUrls = new List<string>();
            var media = new List<MediaDto>();
            var embedNode = postNode["embed"];
            if (embedNode != null)
            {
                var embedType = embedNode["$type"]?.ToString() ?? "";
                if (embedType.Contains("images"))
                {
                    var imagesArr = embedNode["images"] as Newtonsoft.Json.Linq.JArray;
                    if (imagesArr != null)
                    {
                        foreach (var img in imagesArr)
                        {
                            var fullUrl = img["fullsize"]?.ToString() ?? img["thumb"]?.ToString();
                            if (!string.IsNullOrEmpty(fullUrl))
                            {
                                imageUrls.Add(fullUrl);
                                media.Add(new MediaDto { Url = fullUrl, AltText = img["alt"]?.ToString(), Type = "image" });
                            }
                        }
                    }
                }
            }

            // Labels
            var labels = new List<string>();
            var labelsArr = postNode["labels"] as Newtonsoft.Json.Linq.JArray;
            if (labelsArr != null)
            {
                foreach (var l in labelsArr) { var val = l["val"]?.ToString(); if (!string.IsNullOrEmpty(val)) labels.Add(val); }
            }

            return new PostDto
            {
                Id = Guid.Empty, // No local GUID for remote posts
                Tid = tid,
                Uri = uri,
                Cid = cid,
                Content = content,
                CreatedAt = createdAt,
                Author = author,
                RepliesCount = replyCount,
                RepostsCount = repostCount,
                LikesCount = likeCount,
                QuotesCount = quoteCount,
                IsLiked = isLiked,
                IsReposted = isReposted,
                ReplyToPostId = replyToParentUri,
                ImageUrls = imageUrls,
                Media = media,
                Labels = labels,
                Viewer = (likeUri != null || repostUri != null) ? new PostViewerDto { Like = likeUri, Repost = repostUri } : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[PostsController] MapBskyPostViewToDto failed for node");
            return null;
        }
    }

    private async Task<List<PostDto>> FetchMoreRepliesViaSearch(string rootUri, Guid? viewerId)
    {
        var searchResults = new List<PostDto>();
        try
        {
            string? viewerToken = viewerId.HasValue && viewerId.Value != Guid.Empty
                    ? await (HttpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Caching.Distributed.IDistributedCache>())
                        .GetStringAsync($"BlueskyToken_{viewerId.Value}")
                    : null;

            var clientFactory = HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>();
            using var client = clientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");

            if (!string.IsNullOrEmpty(viewerToken))
            {
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", viewerToken);
            }

            string? cursor = null;
            int maxPages = 10; 
            string hostname = string.IsNullOrEmpty(viewerToken) ? "public.api.bsky.app" : "api.bsky.app";

            for (int page = 0; page < maxPages; page++)
            {
                // Try searching for the URI directly (most robust way to find replies in search index)
            var url = $"https://{hostname}/xrpc/app.bsky.feed.searchPosts?q={Uri.EscapeDataString(rootUri)}&limit=100";
            _logger.LogInformation("[PostsController] Searching for replies via {Url}", url);
                if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={Uri.EscapeDataString(cursor)}";

                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = System.Text.Json.JsonDocument.Parse(content);
                    bool addedAny = false;
                    
                    if (doc.RootElement.TryGetProperty("posts", out var postsArray))
                    {
                        foreach (var postItem in postsArray.EnumerateArray())
                        {
                            var postDto = Newtonsoft.Json.JsonConvert.DeserializeObject<PostDto>(postItem.GetRawText());
                            if (postDto != null)
                            {
                                searchResults.Add(postDto);
                                addedAny = true;
                            }
                        }
                    }
                    
                    if (doc.RootElement.TryGetProperty("cursor", out var nextCursor))
                    {
                        cursor = nextCursor.GetString();
                    }
                    else
                    {
                        cursor = null;
                    }

                    if (string.IsNullOrEmpty(cursor) || !addedAny) break;
                }
                else
                {
                    _logger.LogWarning("[PostsController] Search page {Page} failed for {Uri}", page, rootUri);
                    break;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] Deep fetch via Search failed for {Uri}", rootUri);
        }
        return searchResults;
    }

    [HttpGet("tag/{tag}")]
    public async Task<IActionResult> GetPostsByTag(string tag, [FromQuery] int limit = 20, [FromQuery] int offset = 0)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var posts = await _postService.GetPostsByTagAsync(tag, viewerId, limit, offset);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetPostsByTag error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpPost("{id}/interaction-settings")]
    public async Task<IActionResult> UpdateInteractionSettings(string id, [FromBody] UpdateInteractionSettingsRequest request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid postId;
            if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id);
                if (post == null) return NotFound();
                postId = post.Id;
            }
            var postResult = await _postService.UpdateInteractionSettingsAsync(userId, postId, request);
            if (postResult == null) return NotFound("Post not found or you are not authorized to edit it.");
            return Ok(postResult);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] UpdateInteractionSettings error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("interactions/settings")]
    public async Task<IActionResult> UpdateInteractionSettingsGlobal([FromBody] UpdateInteractionSettingsRequest request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            if (string.IsNullOrEmpty(request.Uri))
            {
                // Gracefully return Ok for client draft configurations when no post URI is provided yet
                return Ok(new { message = "Local settings configured." });
            }

            var post = await _postService.GetPostByUriAsync(request.Uri, userId);
            if (post == null) return NotFound("Post not found.");

            var postResult = await _postService.UpdateInteractionSettingsAsync(userId, post.Id, request);
            if (postResult == null) return NotFound("Post not found or you are not authorized to edit it.");
            return Ok(postResult);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] UpdateInteractionSettingsGlobal error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("pin")]
    public async Task<IActionResult> PinPost([FromQuery] string uri)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            await _postService.PinPostAsync(userId, uri);
            return Ok(new { message = "Post pinned successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("unpin")]
    public async Task<IActionResult> UnpinPost()
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            await _postService.UnpinPostAsync(userId);
            return Ok(new { message = "Post unpinned successfully" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // ─── Post Interaction Lists ────────────────────────────────────────────────

    /// <summary>
    /// Returns the list of users who reposted a given post (proxies app.bsky.feed.getRepostedBy).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("reposted-by")]
    public async Task<IActionResult> GetRepostedBy([FromQuery] string uri, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        if (string.IsNullOrWhiteSpace(uri)) return BadRequest("uri is required.");
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var viewerToken = viewerId.HasValue
                ? await (HttpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Caching.Distributed.IDistributedCache>())
                    .GetStringAsync($"BlueskyToken_{viewerId.Value}")
                : null;

            var clientFactory = HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>();
            using var client = clientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
            if (!string.IsNullOrEmpty(viewerToken))
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", viewerToken);

            var hostname = string.IsNullOrEmpty(viewerToken) ? "public.api.bsky.app" : "api.bsky.app";
            var url = $"https://{hostname}/xrpc/app.bsky.feed.getRepostedBy?uri={Uri.EscapeDataString(uri)}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={Uri.EscapeDataString(cursor)}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return Ok(new { users = new List<object>(), cursor = (string?)null });

            var content = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(content);

            string? nextCursor = doc.RootElement.TryGetProperty("cursor", out var cur) ? cur.GetString() : null;
            var userService = HttpContext.RequestServices.GetRequiredService<IUserService>();

            var users = new List<BSkyClone.DTOs.UserDto>();
            if (doc.RootElement.TryGetProperty("repostedBy", out var repostedByArray))
            {
                foreach (var item in repostedByArray.EnumerateArray())
                {
                    var dto = MapBskyActorToUserDto(item);
                    if (dto != null) users.Add(dto);
                }
            }

            // Enrich with follow status for authenticated viewer
            if (viewerId.HasValue && users.Any())
            {
                var dids = users.Where(u => !string.IsNullOrEmpty(u.Did)).Select(u => u.Did!).ToList();
                try
                {
                    var statuses = await userService.GetInteractionStatusesByDidsAsync(viewerId.Value, dids);
                    users = users.Select(u =>
                    {
                        if (!string.IsNullOrEmpty(u.Did) && statuses.TryGetValue(u.Did, out var s))
                        {
                            return u with
                            {
                                IsFollowing = s.IsFollowing,
                                IsFollowedBy = s.IsFollowedBy,
                                FollowingReference = s.FollowingReference
                            };
                        }
                        return u;
                    }).ToList();
                }
                catch { /* Enrich is best-effort */ }
            }

            return Ok(new { users, cursor = nextCursor });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] GetRepostedBy error for {Uri}", uri);
            return Ok(new { users = new List<object>(), cursor = (string?)null });
        }
    }

    /// <summary>
    /// Returns the list of users who liked a given post (proxies app.bsky.feed.getLikes).
    /// Requires authentication.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("liked-by")]
    public async Task<IActionResult> GetLikedBy([FromQuery] string uri, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        if (string.IsNullOrWhiteSpace(uri)) return BadRequest("uri is required.");
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var viewerToken = viewerId.HasValue
                ? await (HttpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Caching.Distributed.IDistributedCache>())
                    .GetStringAsync($"BlueskyToken_{viewerId.Value}")
                : null;

            var clientFactory = HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>();
            using var client = clientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
            if (!string.IsNullOrEmpty(viewerToken))
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", viewerToken);

            var hostname = string.IsNullOrEmpty(viewerToken) ? "public.api.bsky.app" : "api.bsky.app";
            var url = $"https://{hostname}/xrpc/app.bsky.feed.getLikes?uri={Uri.EscapeDataString(uri)}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={Uri.EscapeDataString(cursor)}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return Ok(new { users = new List<object>(), cursor = (string?)null });

            var content = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(content);

            string? nextCursor = doc.RootElement.TryGetProperty("cursor", out var cur) ? cur.GetString() : null;
            var userService = HttpContext.RequestServices.GetRequiredService<IUserService>();

            var users = new List<BSkyClone.DTOs.UserDto>();
            if (doc.RootElement.TryGetProperty("likes", out var likesArray))
            {
                foreach (var item in likesArray.EnumerateArray())
                {
                    // getLikes returns { createdAt, indexedAt, actor: {...} }
                    if (item.TryGetProperty("actor", out var actorEl))
                    {
                        var dto = MapBskyActorToUserDto(actorEl);
                        if (dto != null) users.Add(dto);
                    }
                }
            }

            // Enrich with follow status
            if (viewerId.HasValue && users.Any())
            {
                var dids = users.Where(u => !string.IsNullOrEmpty(u.Did)).Select(u => u.Did!).ToList();
                try
                {
                    var statuses = await userService.GetInteractionStatusesByDidsAsync(viewerId.Value, dids);
                    users = users.Select(u =>
                    {
                        if (!string.IsNullOrEmpty(u.Did) && statuses.TryGetValue(u.Did, out var s))
                        {
                            return u with
                            {
                                IsFollowing = s.IsFollowing,
                                IsFollowedBy = s.IsFollowedBy,
                                FollowingReference = s.FollowingReference
                            };
                        }
                        return u;
                    }).ToList();
                }
                catch { /* Enrich is best-effort */ }
            }

            return Ok(new { users, cursor = nextCursor });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] GetLikedBy error for {Uri}", uri);
            return Ok(new { users = new List<object>(), cursor = (string?)null });
        }
    }

    /// <summary>
    /// Returns the list of posts that quote a given post (proxies app.bsky.feed.getQuotes).
    /// </summary>
    [AllowAnonymous]
    [HttpGet("quotes")]
    public async Task<IActionResult> GetQuotes([FromQuery] string uri, [FromQuery] int limit = 20, [FromQuery] string? cursor = null)
    {
        if (string.IsNullOrWhiteSpace(uri)) return BadRequest("uri is required.");
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var viewerToken = viewerId.HasValue
                ? await (HttpContext.RequestServices.GetRequiredService<Microsoft.Extensions.Caching.Distributed.IDistributedCache>())
                    .GetStringAsync($"BlueskyToken_{viewerId.Value}")
                : null;

            var clientFactory = HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>();
            using var client = clientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(20);
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
            if (!string.IsNullOrEmpty(viewerToken))
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", viewerToken);

            var hostname = string.IsNullOrEmpty(viewerToken) ? "public.api.bsky.app" : "api.bsky.app";
            var url = $"https://{hostname}/xrpc/app.bsky.feed.getQuotes?uri={Uri.EscapeDataString(uri)}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={Uri.EscapeDataString(cursor)}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return Ok(new { posts = new List<object>(), cursor = (string?)null, hasMore = false });

            var content = await response.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(content);

            string? nextCursor = doc.RootElement.TryGetProperty("cursor", out var cur) ? cur.GetString() : null;

            var posts = new List<BSkyClone.DTOs.PostDto>();
            if (doc.RootElement.TryGetProperty("posts", out var postsArray))
            {
                foreach (var postEl in postsArray.EnumerateArray())
                {
                    var mapped = _postService.MapBlueskyPost(postEl);
                    if (mapped != null) posts.Add(mapped);
                }
            }

            // Enrich with interaction status and filter restricted content for both logged in and guest users
            if (posts.Any())
            {
                try
                {
                    var enriched = await _postService.EnrichAndFilterPostsAsync(posts, viewerId ?? Guid.Empty, null, false, false);
                    posts = enriched.ToList();
                }
                catch { /* Enrich is best-effort */ }
            }

            return Ok(new { posts, cursor = nextCursor, hasMore = !string.IsNullOrEmpty(nextCursor) });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] GetQuotes error for {Uri}", uri);
            return Ok(new { posts = new List<object>(), cursor = (string?)null, hasMore = false });
        }
    }

    /// <summary>Helper to parse a Bluesky actor object into a UserDto.</summary>
    private static BSkyClone.DTOs.UserDto? MapBskyActorToUserDto(System.Text.Json.JsonElement actorEl)
    {
        try
        {
            var did = actorEl.TryGetProperty("did", out var didEl) ? didEl.GetString() : null;
            var handle = actorEl.TryGetProperty("handle", out var hEl) ? hEl.GetString() : null;
            var displayName = actorEl.TryGetProperty("displayName", out var dnEl) ? dnEl.GetString() : handle;
            var avatarUrl = actorEl.TryGetProperty("avatar", out var avEl) ? avEl.GetString() : null;
            string? bio = null;
            if (actorEl.TryGetProperty("description", out var descEl)) bio = descEl.GetString();

            if (string.IsNullOrEmpty(did) && string.IsNullOrEmpty(handle)) return null;

            return new BSkyClone.DTOs.UserDto(
                Guid.Empty, // No local ID for remote users
                handle ?? did ?? "",
                handle ?? did ?? "",
                "",
                displayName ?? handle ?? "",
                avatarUrl,
                null, // coverImageUrl
                bio,
                null, null, null,
                0, 0, 0,
                "user",
                null,
                false,
                did
            );
        }
        catch
        {
            return null;
        }
    }
}
