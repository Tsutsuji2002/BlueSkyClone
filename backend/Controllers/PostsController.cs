using BSkyClone.DTOs;
using BSkyClone.Services;
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

    public PostsController(IPostService postService)
    {
        _postService = postService;
    }

    [HttpGet("timeline")]
    public async Task<IActionResult> GetTimeline([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        try
        {
            var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();
            
            var posts = await _postService.GetTimelineAsync(userId, skip, take);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetTimeline error: {ex.Message}");
            return Ok(new List<PostDto>());
        }
    }

    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending()
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var posts = await _postService.GetTrendingPostsAsync(viewerId);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] GetTrending error: {ex.Message}");
            return Ok(new List<PostDto>());
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

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserPosts(Guid userId, [FromQuery] string? type = null, [FromQuery] int limit = 3, [FromQuery] int offset = 0)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var posts = await _postService.GetUserPostsAsync(userId, type, viewerId, limit, offset);
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
            Console.WriteLine($"[PostsController] CreatePost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePost(Guid id, [FromForm] CreatePostRequest request)
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();
            
            var post = await _postService.UpdatePostAsync(userId, id, request);
            if (post == null) return NotFound("Post not found or you are not authorized to edit it.");
            return Ok(post);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] UpdatePost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPost(Guid id)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var post = await _postService.GetPostByIdAsync(id, viewerId);
            if (post == null) return NotFound();

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

    [HttpGet("tid/{tid}")]
    public async Task<IActionResult> GetPostByTid(string tid)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            var post = await _postService.GetPostByTidAsync(tid, viewerId);
            if (post == null) return NotFound();

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
    public async Task<IActionResult> DeletePost(string id)
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
            var deletedIds = await _postService.DeletePostAsync(userId, postId);
            if (deletedIds == null) return BadRequest("Could not delete post");
            return Ok(deletedIds);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[PostsController] DeletePost error: {ex.Message}");
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/like")]
    public async Task<IActionResult> LikePost(string id)
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
    public async Task<IActionResult> BookmarkPost(string id)
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
    public async Task<IActionResult> RepostPost(string id)
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
    public async Task<IActionResult> GetPostReplies(string id)
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

            var replies = await _postService.GetPostRepliesAsync(postId, viewerId);
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
