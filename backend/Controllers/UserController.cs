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

    public UserController(IUserService userService)
    {
        _userService = userService;
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
                user.PostsCount
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
                user.PostsCount
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
                settings.DefaultReplyRestriction,
                settings.DefaultAllowQuotes,
                settings.FontSize,
                settings.EnableTrending,
                settings.EnableDiscoverVideo,
                settings.EnableTreeView,
                settings.RequireLogoutVisibility,
                settings.LargerAltBadge
            );

            return Ok(settingsDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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
            user.Role
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
}
