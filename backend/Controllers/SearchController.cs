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

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = userId != null ? Guid.Parse(userId) : null;

        var postIds = (await _searchService.SearchPostsAsync(q, skip, take)).ToList();
        
        // Fallback to DB search if no results from ElasticSearch
        if (postIds.Count == 0)
        {
            var dbPosts = await _postService.SearchPostsDBAsync(q, currentUserId, take, skip);
            return Ok(dbPosts);
        }

        // Hydrate posts from DB/Service to return full DTOs in batch
        var posts = await _postService.GetPostsByIdsAsync(postIds, currentUserId);
        return Ok(posts);
    }

    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<object>());

        var userIds = (await _searchService.SearchUsersAsync(q, skip, take)).ToList();

        // Fallback to DB search if no results from ElasticSearch
        if (userIds.Count == 0)
        {
            var dbUsers = await _userService.SearchUsersAsync(q, take);
            return Ok(dbUsers.Select(user => new
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
            }));
        }

        // Hydrate users from DB/Service in batch
        var users = await _userService.GetUsersByIdsAsync(userIds);
        
        return Ok(users.Select(user => new 
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
        }));
    }
}
