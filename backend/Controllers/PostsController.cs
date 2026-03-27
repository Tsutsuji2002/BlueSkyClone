using BSkyClone.DTOs;
using BSkyClone.Services;
using BSkyClone.UnitOfWork;
using BSkyClone.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private readonly ILogger<PostsController> _logger;
    private readonly BSkyDbContext _context;

    public PostsController(IPostService postService, IUnitOfWork unitOfWork, ILogger<PostsController> logger, BSkyDbContext context)
    {
        _postService = postService;
        _unitOfWork = unitOfWork;
        _logger = logger;
        _context = context;
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
            Console.WriteLine($"[PostsController] GetTrending error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpGet("discover")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDiscover([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            // Fast, lightweight query — just the interest names
            List<string>? userInterests = null;
            if (viewerId.HasValue)
            {
                userInterests = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.Id == viewerId.Value)
                    .SelectMany(u => u.Interests)
                    .Select(i => i.Name)
                    .ToListAsync();
            }

            var posts = await _postService.GetTrendingPostsAsync(
                viewerId, skip, take,
                userInterests != null && userInterests.Count > 0 ? userInterests : null
            );

            return Ok(new
            {
                posts,
                hasMore = posts.Count() >= take
            });
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetDiscover error: {ex.Message}");
            return Ok(new { posts = new List<PostDto>(), hasMore = false });
        }
    }

    [HttpGet("bookmarks")]
    public async Task<IActionResult> GetBookmarks()
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

            var posts = await _postService.GetBookmarkedPostsAsync(userId);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetBookmarks error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserPosts(string userId, [FromQuery] string? type = null, [FromQuery] int take = 20, [FromQuery] int skip = 0)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            // Resolve a handle or DID to use with the proxy
            string handleOrDid = userId;
            if (Guid.TryParse(userId, out var userGuid))
            {
                var user = await _unitOfWork.Users.GetByIdAsync(userGuid);
                handleOrDid = user?.Did ?? user?.Handle ?? userId;
            }

            var posts = await _postService.GetUserPostsAsync(handleOrDid, viewerId, skip, take, type);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetUserPosts error: {ex.Message}");
            return Ok(new List<PostDto>());
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
            Console.WriteLine($"[PostsController] CreatePost error: {ex.ToString()}");
            return BadRequest(new { message = ex.Message, trace = ex.StackTrace, full = ex.ToString() });
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

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetPost(string id)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            Guid postId;
            if (!Guid.TryParse(id, out postId))
            {
                // Resolve by TID if it's not a GUID
                var p = await _postService.GetPostByTidAsync(id, viewerId);
                if (p == null) return NotFound("Post not found by identifier.");
                postId = p.Id;
            }

            var post = await _postService.GetPostByIdAsync(postId, viewerId);
            if (post == null) return NotFound();

            // If it's a remote post (stub), fetch the full thread from AppView
            if (!string.IsNullOrEmpty(post.Uri) && post.Uri.StartsWith("at://"))
            {
                var xrpcThread = await _postService.GetPostThreadAsync(post.Uri, 6, 80, viewerId);
                if (xrpcThread != null)
                {
                    return Ok(xrpcThread);
                }
                // Fall back to local DB if proxy fails (very unlikely but for robustness)
            }

            var thread = new List<PostDto> { post };

            // Fetch Ancestors
            var current = post;
            for (int i = 0; i < 5; i++)
            {
                if (current.ReplyToPostId.HasValue)
                {
                    var parent = await _postService.GetPostByIdAsync(current.ReplyToPostId.Value, viewerId);
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
    public async Task<IActionResult> GetPostByTid(string tid)
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
                var xrpcThread = await _postService.GetPostThreadAsync(post.Uri, 6, 80, viewerId);
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
                if (current.ReplyToPostId.HasValue)
                {
                    var parent = await _postService.GetPostByIdAsync(current.ReplyToPostId.Value, viewerId);
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
            if (!Guid.TryParse(id, out postId))
            {
                // Resolve by AT-URI or TID
                var actualUri = uri ?? (id.StartsWith("at://") ? id : null);
                if (!string.IsNullOrEmpty(actualUri))
                {
                    var post = await _postService.GetPostByUriAsync(actualUri, userId);
                    if (post == null) return NotFound("Post URI could not be resolved.");
                    postId = post.Id;
                }
                else
                {
                    var post = await _postService.GetPostByTidAsync(id, userId);
                    if (post == null) return NotFound("Post identifier could not be resolved.");
                    postId = post.Id;
                }
            }
            var deletedIds = await _postService.DeletePostAsync(userId, postId);
            if (deletedIds == null || !deletedIds.Any()) return BadRequest("Could not delete post (unauthorized or not found)");
            return Ok(deletedIds);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] DeletePost error: {ex.Message}");
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

    [HttpGet("{id}/replies")]
    public async Task<IActionResult> GetPostReplies(string id, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            Guid postId;
            if (!Guid.TryParse(id, out postId))
            {
                var post = await _postService.GetPostByTidAsync(id);
                if (post == null) return NotFound();
                postId = post.Id;
            }

            var replies = await _postService.GetPostRepliesAsync(postId, viewerId, skip, take);
            return Ok(replies);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetPostReplies error: {ex.Message}");
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
}
