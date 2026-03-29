using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly IUserService _userService;
    private readonly IPostService _postService;
    private readonly IDistributedCache _cache;

    public SearchController(ISearchService searchService, IUserService userService, IPostService postService, IDistributedCache cache)
    {
        _searchService = searchService;
        _userService = userService;
        _postService = postService;
        _cache = cache;
    }

    [AllowAnonymous]
    [HttpGet("posts")]
    public async Task<IActionResult> SearchPosts([FromQuery] string q, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<object>());

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? userId = null;
        if (Guid.TryParse(userIdStr, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        if (userId.HasValue)
        {
            // 1. Check for Bluesky token
            var bskyToken = await _cache.GetStringAsync($"BlueskyToken_{userId.Value}");
            if (!string.IsNullOrEmpty(bskyToken))
            {
                var remotePosts = await _postService.SearchPostsRemoteAsync(q, bskyToken, skip, take);
                if (remotePosts.Any())
                {
                    return Ok(remotePosts);
                }
            }
        }

        // 2. Local ElasticSearch
        var postIds = (await _searchService.SearchPostsAsync(q, skip, take)).ToList();
        
        // 3. Fallback to DB search
        if (postIds.Count == 0)
        {
            // DB search can work without user authentication if we just skip subscription checking
            var dbPosts = await _postService.SearchPostsDBAsync(q, userId ?? Guid.Empty, take, skip);
            return Ok(dbPosts);
        }

        // Hydrate posts from DB
        var posts = await _postService.GetPostsByIdsAsync(postIds, userId ?? Guid.Empty);
        return Ok(posts);
    }

    [AllowAnonymous]
    [HttpGet("users")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q, [FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        if (string.IsNullOrWhiteSpace(q)) return Ok(new List<object>());

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? userId = null;
        if (Guid.TryParse(userIdStr, out var parsedUserId))
        {
            userId = parsedUserId;
        }

        if (userId.HasValue)
        {
            // 1. Check for Bluesky token
            var bskyToken = await _cache.GetStringAsync($"BlueskyToken_{userId.Value}");
            if (!string.IsNullOrEmpty(bskyToken))
            {
                var remoteUsers = await _userService.SearchActorsRemoteAsync(q, bskyToken, skip, take);
                if (remoteUsers.Any())
                {
                    return Ok(remoteUsers.Select(user => new
                    {
                        user.Id,
                        user.Handle,
                        user.Username,
                        user.DisplayName,
                        user.AvatarUrl,
                        user.Bio,
                        user.FollowersCount,
                        user.FollowingCount,
                        user.PostsCount,
                        user.Did
                    }));
                }
            }
        }

        // 2. Local ElasticSearch
        var userIds = (await _searchService.SearchUsersAsync(q, skip, take)).ToList();

        // 3. Fallback to DB search
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
                user.PostsCount,
                user.Did
            }));
        }

        // Hydrate users from DB
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
            user.PostsCount,
            user.Did
        }));
    }
}
