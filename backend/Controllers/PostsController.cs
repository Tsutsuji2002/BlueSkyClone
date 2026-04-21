using BSkyClone.DTOs;
using BSkyClone.Services;
using BSkyClone.UnitOfWork;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class PostsController : ControllerBase
{
    private readonly IPostService _postService;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<PostsController> _logger;

    public PostsController(IPostService postService, IUnitOfWork unitOfWork, ILogger<PostsController> logger)
    {
        _postService = postService;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();
            
            var posts = await _postService.GetTimelineAsync(userId, skip, take);
            _logger.LogInformation("[PostsController] GetTimeline: UserId={UserId}, Count={Count}", userId, posts.Count());
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetTimeline error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpGet("trending")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTrending([FromQuery] int skip = 0, [FromQuery] int take = 20)
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
    public async Task<IActionResult> GetDiscover([FromQuery] int take = 20, [FromQuery] int skip = 0)
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
    public async Task<IActionResult> GetUserPosts(string userId, [FromQuery] string? type = null, [FromQuery] int take = 20, [FromQuery] int skip = 0, [FromQuery] string? cursor = null)
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

            var result = await _postService.GetUserPostsAsync(handleOrDid, viewerId, skip, take, type, cursor);
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
    public async Task<IActionResult> GetPostDetails([FromQuery] string? id, [FromQuery] string? uri, [FromQuery] int take = 20)
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
                var xrpcThread = await _postService.GetPostThreadAsync(post.Uri, 6, 80, viewerId, take);
                if (xrpcThread != null)
                {
                    return Ok(xrpcThread);
                }
            }

            var thread = new List<PostDto> { post };
            var current = post;

            // Fetch Ancestors
            for (int i = 0; i < 5; i++)
            {
                if (!string.IsNullOrEmpty(current.ReplyToPostId))
                {
                    var parent = await _postService.GetPostByTidAsync(current.ReplyToPostId, viewerId);
                    if (parent != null)
                    {
                        if (!thread.Any(p => p.Id == parent.Id)) thread.Add(parent);
                        current = parent;
                    }
                    else break;
                }
                else break;
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
    public async Task<IActionResult> GetPost(string id, [FromQuery] int take = 20)
    {
        // Redirect to new query-based logic for robustness if it looks like a URI
        if (id.Contains("at://") || id.Contains("%")) 
            return await GetPostDetails(null, System.Net.WebUtility.UrlDecode(id), take);
            
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

            for (int i = 0; i < 5; i++)
            {
                if (!string.IsNullOrEmpty(current.ReplyToPostId))
                {
                    var parent = await _postService.GetPostByTidAsync(current.ReplyToPostId, viewerId);
                    if (parent != null)
                    {
                        if (!thread.Any(p => p.Id == parent.Id)) thread.Add(parent);
                        current = parent;
                    }
                    else break;
                }
                else break;
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
    public async Task<IActionResult> GetPostByTid(string tid, [FromQuery] int take = 20)
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
                var xrpcThread = await _postService.GetPostThreadAsync(post.Uri, 6, 80, viewerId, take);
                if (xrpcThread != null)
                {
                    return Ok(xrpcThread);
                }
            }

            var thread = new List<PostDto> { post };

            // Fetch Ancestors
            var current = post;
            for (int i = 0; i < 5; i++)
            {
                if (!string.IsNullOrEmpty(current.ReplyToPostId))
                {
                    var parent = await _postService.GetPostByTidAsync(current.ReplyToPostId, viewerId);
                    if (parent != null)
                    {
                        if (!thread.Any(p => p.Id == parent.Id)) thread.Add(parent);
                        current = parent;
                    }
                    else break;
                }
                else break;
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
    public async Task<IActionResult> LikePost(string id, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid postId;
            if (id.StartsWith("at://") || !string.IsNullOrEmpty(uri))
            {
                var post = await _postService.GetPostByUriAsync(uri ?? id, userId);
                if (post == null) return NotFound("Remote post could not be resolved or ingested.");
                postId = post.Id;
            }
            else if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id, userId);
                if (post == null) return NotFound();
                postId = post.Id;
            }
            var result = await _postService.ToggleLikeAsync(userId, postId);
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
                var post = await _postService.GetPostByUriAsync(uri ?? id, userId);
                if (post == null) return NotFound("Remote post could not be resolved or ingested.");
                postId = post.Id;
            }
            else if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id, userId);
                if (post == null) return NotFound();
                postId = post.Id;
            }
            var result = await _postService.ToggleBookmarkAsync(userId, postId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] BookmarkPost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/repost")]
    public async Task<IActionResult> RepostPost(string id, [FromQuery] string? uri = null)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            Guid postId;
            if (id.StartsWith("at://") || !string.IsNullOrEmpty(uri))
            {
                var post = await _postService.GetPostByUriAsync(uri ?? id, userId);
                if (post == null) return NotFound("Remote post could not be resolved or ingested.");
                postId = post.Id;
            }
            else if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id, userId);
                if (post == null) return NotFound();
                postId = post.Id;
            }
            var result = await _postService.ToggleRepostAsync(userId, postId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] RepostPost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("replies")]
    public async Task<IActionResult> GetPostReplies([FromQuery] string? id, [FromQuery] string? uri, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        string identifier = uri ?? id ?? "";
        if (string.IsNullOrEmpty(identifier)) return BadRequest("Post ID or URI required.");
        
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            Guid postId;
            if (!Guid.TryParse(identifier, out postId))
            {
                var post = await _postService.GetPostByTidAsync(identifier, viewerId);
                if (post == null) return NotFound();
                postId = post.Id;
            }

            var replies = await _postService.GetPostRepliesAsync(postId, viewerId, skip, take);
            return Ok(replies);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostsController] GetPostReplies error for identifier {Identifier}", identifier);
            return Ok(new List<PostDto>());
        }
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
}
