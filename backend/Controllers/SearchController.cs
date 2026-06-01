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
        if (Guid.TryParse(userIdStr, out var parsedUserId)) userId = parsedUserId;

        string? bskyToken = null;
        if (userId.HasValue)
            bskyToken = await _cache.GetStringAsync($"BlueskyToken_{userId.Value}");

        // [PERFORMANCE] Run remote AppView search and local ES/DB search in PARALLEL.
        // Return whichever has results first within 5 seconds; avoids a 20-30s sequential wait.
        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));

        var remoteTask = Task.Run(async () =>
        {
            try { return await _postService.SearchPostsRemoteAsync(q, bskyToken, skip, take); }
            catch { return Enumerable.Empty<BSkyClone.DTOs.PostDto>(); }
        }, cts.Token);

        var localTask = Task.Run(async () =>
        {
            try
            {
                var postIds = (await _searchService.SearchPostsAsync(q, skip, take)).ToList();
                if (postIds.Count > 0)
                {
                    var posts = await _postService.GetPostsByIdsAsync(postIds, userId ?? Guid.Empty);
                    return (IEnumerable<BSkyClone.DTOs.PostDto>)posts;
                }
                // ES returned nothing — try DB
                var dbPosts = await _postService.SearchPostsDBAsync(q, userId ?? Guid.Empty, take, skip);
                return (IEnumerable<BSkyClone.DTOs.PostDto>)dbPosts;
            }
            catch { return Enumerable.Empty<BSkyClone.DTOs.PostDto>(); }
        }, cts.Token);

        // Wait for first task with results, or both to finish (within 5s)
        IEnumerable<BSkyClone.DTOs.PostDto> remoteResults = [];
        IEnumerable<BSkyClone.DTOs.PostDto> localResults = [];

        try
        {
            await Task.WhenAll(remoteTask, localTask).WaitAsync(TimeSpan.FromSeconds(5));
        }
        catch (TimeoutException) { /* partial results below */ }
        catch (OperationCanceledException) { /* partial results below */ }

        if (remoteTask.IsCompletedSuccessfully) remoteResults = remoteTask.Result;
        if (localTask.IsCompletedSuccessfully) localResults = localTask.Result;

        // Prefer remote results; fall back to local
        var finalResults = remoteResults.Any() ? remoteResults : localResults;
        return Ok(finalResults);
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
                var remoteUsers = await _userService.SearchActorsRemoteAsync(q, bskyToken, skip, take, userId.Value);
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
