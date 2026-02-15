using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly IUserService _userService;
    private readonly IPostService _postService;

    public SearchController(ISearchService searchService, IUserService userService, IPostService postService)
    {
        _searchService = searchService;
        _userService = userService;
        _postService = postService;
    }

    [HttpGet("posts")]
    public async Task<IActionResult> SearchPosts([FromQuery] string q, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<object>());

        var postIds = await _searchService.SearchPostsAsync(q, skip, take);
        
        // Hydrate posts from DB/Service to return full DTOs
        var posts = new List<object>();
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = userId != null ? Guid.Parse(userId) : null;

        foreach (var id in postIds)
        {
            var post = await _postService.GetPostByIdAsync(id, currentUserId);
            if (post != null)
            {
                posts.Add(post);
            }
        }

        return Ok(posts);
    }

    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<object>());

        var userIds = await _searchService.SearchUsersAsync(q, skip, take);

        // Hydrate users from DB/Service
        var users = new List<object>();
        
        foreach (var id in userIds)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user != null)
            {
                // Map to DTO if needed, or return user object (be careful with sensitive data)
                // Using a safe DTO is better. existing UserDto or similar.
                // For now, I'll return a simplified anonymous object to avoid circular refs or sensitive data
                users.Add(new 
                {
                   user.Id,
                   user.Handle,
                   user.Username,
                   user.DisplayName,
                   user.AvatarUrl,
                   user.Bio,
                   user.FollowersCount,
                   user.FollowingCount,
                   user.PostsCount
                });
            }
        }

        return Ok(users);
    }
}
