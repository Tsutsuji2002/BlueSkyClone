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
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var posts = await _postService.GetTrendingPostsAsync(viewerId);
        return Ok(posts);
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
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var posts = await _postService.GetUserPostsAsync(userId, type, viewerId, limit, offset);
        return Ok(posts);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePost([FromForm] CreatePostRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var userId = Guid.Parse(userIdStr);
        var post = await _postService.CreatePostAsync(userId, request);
        return Ok(post);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePost(Guid id, [FromForm] CreatePostRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var userId = Guid.Parse(userIdStr);
        var post = await _postService.UpdatePostAsync(userId, id, request);
        if (post == null) return NotFound("Post not found or you are not authorized to edit it.");
        return Ok(post);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPost(Guid id)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var post = await _postService.GetPostByIdAsync(id, viewerId);
        if (post == null) return NotFound();
        return Ok(post);
    }

    [HttpGet("tid/{tid}")]
    public async Task<IActionResult> GetPostByTid(string tid)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var post = await _postService.GetPostByTidAsync(tid, viewerId);
        if (post == null) return NotFound();
        return Ok(post);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeletePost(string id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var userId = Guid.Parse(userIdStr);

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

    [HttpPost("{id}/like")]
    public async Task<IActionResult> LikePost(string id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var userId = Guid.Parse(userIdStr);

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

    [HttpPost("{id}/bookmark")]
    public async Task<IActionResult> BookmarkPost(string id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var userId = Guid.Parse(userIdStr);

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

    [HttpPost("{id}/repost")]
    public async Task<IActionResult> RepostPost(string id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var userId = Guid.Parse(userIdStr);

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

    [HttpGet("{id}/replies")]
    public async Task<IActionResult> GetPostReplies(string id)
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

    [HttpGet("tag/{tag}")]
    public async Task<IActionResult> GetPostsByTag(string tag, [FromQuery] int limit = 20, [FromQuery] int offset = 0)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var posts = await _postService.GetPostsByTagAsync(tag, viewerId, limit, offset);
        return Ok(posts);
    }

    [HttpPost("{id}/interaction-settings")]
    public async Task<IActionResult> UpdateInteractionSettings(string id, [FromBody] UpdateInteractionSettingsRequest request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var userId = Guid.Parse(userIdStr);

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
}
