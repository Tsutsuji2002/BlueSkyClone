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
    public async Task<IActionResult> GetTimeline()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var posts = await _postService.GetTimelineAsync(userId);
        return Ok(posts);
    }

    [HttpGet("trending")]
    public async Task<IActionResult> GetTrending()
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var posts = await _postService.GetTrendingPostsAsync(viewerId);
        return Ok(posts);
    }

    [HttpGet("bookmarks")]
    public async Task<IActionResult> GetBookmarks()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var posts = await _postService.GetBookmarkedPostsAsync(userId);
        return Ok(posts);
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserPosts(Guid userId, [FromQuery] string? type = null, [FromQuery] int limit = 3, [FromQuery] int offset = 0)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var posts = await _postService.GetUserPostsAsync(userId, type, viewerId, limit, offset);
        return Ok(posts);
    }

    [HttpPost]
    public async Task<IActionResult> CreatePost([FromForm] CreatePostRequest request)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var post = await _postService.CreatePostAsync(userId, request);
        return Ok(post);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPost(Guid id)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var post = await _postService.GetPostByIdAsync(id, viewerId);
        if (post == null) return NotFound();
        return Ok(post);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _postService.DeletePostAsync(userId, id);
        if (!result) return BadRequest("Could not delete post");
        return Ok();
    }

    [HttpPost("{id:guid}/like")]
    public async Task<IActionResult> LikePost(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _postService.ToggleLikeAsync(userId, id);
        return Ok(result);
    }

    [HttpPost("{id:guid}/bookmark")]
    public async Task<IActionResult> BookmarkPost(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _postService.ToggleBookmarkAsync(userId, id);
        return Ok(result);
    }

    [HttpPost("{id:guid}/repost")]
    public async Task<IActionResult> RepostPost(Guid id)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _postService.ToggleRepostAsync(userId, id);
        return Ok(result);
    }

    [HttpGet("{id:guid}/replies")]
    public async Task<IActionResult> GetPostReplies(Guid id)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var replies = await _postService.GetPostRepliesAsync(id, viewerId);
        return Ok(replies);
    }

    [HttpGet("tag/{tag}")]
    public async Task<IActionResult> GetPostsByTag(string tag, [FromQuery] int limit = 20, [FromQuery] int offset = 0)
    {
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? viewerId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var posts = await _postService.GetPostsByTagAsync(tag, viewerId, limit, offset);
        return Ok(posts);
    }
}
