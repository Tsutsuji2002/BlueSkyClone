using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly ILogger<UserController> _logger;

    public UserController(IUserService userService, ILogger<UserController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    [HttpPatch("profile")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var user = await _userService.UpdateProfileAsync(userId, request);
            
            var userDto = new UserDto(
                user.Id,
                user.Username,
                user.Handle,
                user.Email,
                user.DisplayName,
                user.AvatarUrl,
                user.CoverImageUrl,
                user.Bio,
                user.Location,
                user.Website,
                user.DateOfBirth,
                user.FollowersCount,
                user.FollowingCount,
                user.PostsCount,
                user.Role,
                null,
                user.IsVerified,
                user.Did
            );

            return Ok(userDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("account")]
    public async Task<IActionResult> UpdateAccount([FromBody] UpdateAccountRequest? request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Invalid request body" });
        }
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var user = await _userService.UpdateAccountAsync(userId, request);
            
            var userDto = new UserDto(
                user.Id,
                user.Username,
                user.Handle,
                user.Email,
                user.DisplayName,
                user.AvatarUrl,
                user.CoverImageUrl,
                user.Bio,
                user.Location,
                user.Website,
                user.DateOfBirth,
                user.FollowersCount,
                user.FollowingCount,
                user.PostsCount,
                user.Role,
                null,
                user.IsVerified,
                user.Did
            );

            return Ok(userDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UserSettingDto? request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Invalid request body" });
        }
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var settings = await _userService.UpdateSettingsAsync(userId, request);
            
            // Map back to DTO
            var settingsDto = new UserSettingDto(
                settings.AdultContentFilter,
                settings.EnableAdultContent,
                settings.SexuallyExplicitFilter,
                settings.GraphicMediaFilter,
                settings.NonSexualNudityFilter,
                settings.SortReplies,
                settings.RequireAltText,
                settings.AutoplayVideoGif,
                settings.AppLanguage,
                settings.ThemeMode,
                settings.NotifyLikes,
                settings.NotifyFollowers,
                settings.NotifyReplies,
                settings.NotifyMentions,
                settings.NotifyQuotes,
                settings.NotifyReposts,
                settings.PushNotifyLikes,
                settings.PushNotifyFollowers,
                settings.PushNotifyReplies,
                settings.PushNotifyMentions,
                settings.PushNotifyQuotes,
                settings.PushNotifyReposts,
                settings.InAppNotifyLikes,
                settings.InAppNotifyFollowers,
                settings.InAppNotifyReplies,
                settings.InAppNotifyMentions,
                settings.InAppNotifyQuotes,
                settings.InAppNotifyReposts,
                settings.NotifyActivity,
                settings.PushNotifyActivity,
                settings.InAppNotifyActivity,
                settings.NotifyLikesOfReposts,
                settings.PushNotifyLikesOfReposts,
                settings.InAppNotifyLikesOfReposts,
                settings.NotifyRepostsOfReposts,
                settings.PushNotifyRepostsOfReposts,
                settings.InAppNotifyRepostsOfReposts,
                settings.NotifyOthers,
                settings.PushNotifyOthers,
                settings.InAppNotifyOthers,
                settings.DefaultReplyRestriction,
                settings.DefaultAllowQuotes,
                settings.FontSize,
                settings.EnableTrending,
                settings.EnableDiscoverVideo,
                settings.EnableTreeView,
                settings.RequireLogoutVisibility,
                settings.LargerAltBadge,
                settings.ShowReplies,
                settings.ShowReposts,
                settings.ShowQuotePosts,
                settings.ShowSampleSavedFeeds,
                UserSettingDto.ParseJson(settings.EnabledMediaProviders),
                UserSettingDto.ParseJson(settings.SelectedInterests)
            );

            return Ok(settingsDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("verify-domain")]
    public async Task<IActionResult> VerifyDomain([FromBody] VerifyDomainRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            return Unauthorized();

        var success = await _userService.VerifyDomainAsync(userId, request.Handle);
        if (success)
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user != null)
            {
                var userDto = new UserDto(
                    user.Id,
                    user.Username,
                    user.Handle,
                    user.Email,
                    user.DisplayName,
                    user.AvatarUrl,
                    user.CoverImageUrl,
                    user.Bio,
                    user.Location,
                    user.Website,
                    user.DateOfBirth,
                    user.FollowersCount,
                    user.FollowingCount,
                    user.PostsCount,
                    user.Role,
                    null,
                    user.IsVerified,
                    user.Did
                );
                return Ok(userDto);
            }
        }
        return BadRequest(new { message = "Verification failed" });
    }

    [HttpGet("interests")]
    public async Task<IActionResult> GetInterests()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            return Unauthorized();

        var interests = await _userService.GetSelectedInterestsAsync(userId);
        return Ok(interests);
    }

    [HttpPost("interests")]
    public async Task<IActionResult> SaveInterests([FromBody] List<string> interests)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            return Unauthorized();

        await _userService.SaveSelectedInterestsAsync(userId, interests);
        return Ok(new { success = true });
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q, [FromQuery] int limit = 10)
    {
        var users = await _userService.SearchUsersAsync(q, limit);
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            dtos.Add(await MapUserToDtoWithStatus(user, currentUserId));
        }
        return Ok(dtos);
    }

    private async Task<UserDto> MapUserToDtoWithStatus(User user, Guid? viewerId)
    {
        var dto = new UserDto(
            user.Id,
            user.Username,
            user.Handle,
            user.Email,
            user.DisplayName,
            user.AvatarUrl,
            user.CoverImageUrl,
            user.Bio,
            user.Location,
            user.Website,
            user.DateOfBirth,
            user.FollowersCount,
            user.FollowingCount,
            user.PostsCount,
            user.Role,
            null,
            user.IsVerified,
            user.Did
        );

        if (viewerId.HasValue && viewerId != user.Id)
        {
            return dto with
            {
                IsFollowing = await _userService.IsFollowingAsync(viewerId.Value, user.Id),
                IsBlocking = await _userService.IsBlockedAsync(viewerId.Value, user.Id),
                IsBlockedBy = await _userService.IsBlockedByAsync(viewerId.Value, user.Id),
                IsMuted = await _userService.IsMutedAsync(viewerId.Value, user.Id)
            };
        }
        
        return dto;
    }

    [HttpPost("batch-follow-status")]
    public async Task<IActionResult> GetBatchFollowStatus([FromBody] BatchFollowStatusRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var currentUserId))
            return Unauthorized();

        if (request?.UserIds == null || request.UserIds.Count == 0)
            return BadRequest(new { message = "UserIds array is required" });

        // Limit to prevent abuse
        if (request.UserIds.Count > 100)
            return BadRequest(new { message = "Maximum 100 users per request" });

        var result = new Dictionary<Guid, bool>();
        
        // Check follow status for each user in parallel
        var tasks = request.UserIds.Select(async targetUserId => {
            try {
                var isFollowing = await _userService.IsFollowingAsync(currentUserId, targetUserId);
                return (targetUserId, isFollowing);
            } catch {
                return (targetUserId, false);
            }
        });

        var results = await Task.WhenAll(tasks);
        
        foreach (var (userId, isFollowing) in results)
        {
            result[userId] = isFollowing;
        }

        return Ok(result);
    }

    [HttpPost("batch-follow-status-by-did")]
    public async Task<IActionResult> GetBatchFollowStatusByDid([FromBody] BatchFollowStatusByDidRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var currentUserId))
            return Unauthorized();

        if (request?.Dids == null || request.Dids.Count == 0)
            return BadRequest(new { message = "Dids array is required" });

        if (request.Dids.Count > 100)
            return BadRequest(new { message = "Maximum 100 users per request" });

        // Use AT Protocol-aware lookup so remote Bluesky follow state is included
        var statuses = await _userService.GetInteractionStatusesByDidsAsync(currentUserId, request.Dids);

        // Map DID -> bool (isFollowing)
        var result = statuses.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.IsFollowing == true,
            StringComparer.OrdinalIgnoreCase
        );

        return Ok(result);
    }

    /// <summary>
    /// GET /api/user/verify-follow?dids=did1,did2,...
    /// Batch-resolve profiles and viewer follow state for a comma-separated list of DIDs or handles.
    /// Returns { profiles: [...] } matching the shape expected by useVerifiedFollowStatuses.ts.
    /// </summary>
    [HttpGet("verify-follow")]
    public async Task<IActionResult> VerifyFollow([FromQuery] string dids)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var currentUserId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(dids))
            return Ok(new { profiles = Array.Empty<object>() });

        var actors = dids.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                         .Take(25) // cap at BSky standard batch size
                         .ToList();

        if (actors.Count == 0)
            return Ok(new { profiles = Array.Empty<object>() });

        var profiles = new List<object>();

        var tasks = actors.Select(async actor =>
        {
            try
            {
                User? user = null;
                if (actor.StartsWith("did:"))
                    user = await _userService.GetUserByDidAsync(actor);
                else
                    user = await _userService.GetUserByHandleAsync(actor);

                if (user == null)
                    (user, _) = await _userService.ResolveRemoteProfileAsync(actor, viewerId: currentUserId);

                if (user == null) return (object?)null;

                var follow = await _userService.GetFollowAsync(currentUserId, user.Id);
                var isMuted = await _userService.IsMutedAsync(currentUserId, user.Id);
                var isBlockedBy = await _userService.IsBlockedByAsync(currentUserId, user.Id);
                var block = await _userService.GetBlockAsync(currentUserId, user.Id);

                return (object?)new
                {
                    did = user.Did ?? "",
                    handle = user.Handle ?? user.Did ?? "unknown",
                    displayName = user.DisplayName,
                    avatar = user.AvatarUrl,
                    isFollowing = follow != null,
                    followingReference = follow?.Uri,
                    viewer = new
                    {
                        following = follow?.Uri,
                        muted = isMuted,
                        blockedBy = isBlockedBy,
                        blocking = block?.Uri
                    }
                };
            }
            catch
            {
                return (object?)null;
            }
        });

        var results = await Task.WhenAll(tasks);
        profiles.AddRange(results.Where(r => r != null)!);

        return Ok(new { profiles });
    }
}

public record BatchFollowStatusRequest(List<Guid> UserIds);
public record BatchFollowStatusByDidRequest(List<string> Dids);
