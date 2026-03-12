using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/users")]
public class ProfileController : ControllerBase
{
    private readonly IUserService _userService;

    public ProfileController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpGet("profile/{*handle}")]
    public async Task<IActionResult> GetProfile(string handle)
    {
        User? user;
        if (Guid.TryParse(handle, out var userId))
        {
            user = await _userService.GetUserByIdAsync(userId);
        }
        else
        {
            user = await _userService.GetUserByHandleAsync(handle) 
                   ?? await _userService.GetUserByUsernameAsync(handle);
        }
                   
        if (user == null) return NotFound();

        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        bool isFollowing = false;
        bool isBlockedBy = false;
        bool isBlocking = false;
        bool isMuted = false;

        if (Guid.TryParse(currentUserIdString, out var currentUserId))
        {
            // Check if viewer is blocked by the user
            isBlockedBy = await _userService.IsBlockedByAsync(currentUserId, user.Id);
            if (isBlockedBy)
            {
                // If blocked, user essentially behaves as if not found or restricted
            }

            isFollowing = await _userService.IsFollowingAsync(currentUserId, user.Id);
            isBlocking = await _userService.IsBlockedAsync(currentUserId, user.Id);
            isMuted = await _userService.IsMutedAsync(currentUserId, user.Id);
        }

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

        return Ok(new { 
            user = userDto,
            isFollowing,
            isBlockedBy,
            isBlocking,
            isMuted
        });
    }

    [HttpGet("profile/id/{userId}")]
    public async Task<IActionResult> GetProfileById(Guid userId)
    {
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null) return NotFound();

        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        bool isFollowing = false;
        bool isBlockedBy = false;
        bool isBlocking = false;
        bool isMuted = false;

        if (Guid.TryParse(currentUserIdString, out var currentUserId))
        {
            isBlockedBy = await _userService.IsBlockedByAsync(currentUserId, user.Id);
            isFollowing = await _userService.IsFollowingAsync(currentUserId, user.Id);
            isBlocking = await _userService.IsBlockedAsync(currentUserId, user.Id);
            isMuted = await _userService.IsMutedAsync(currentUserId, user.Id);
        }

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

        return Ok(new { 
            user = userDto,
            isFollowing,
            isBlockedBy,
            isBlocking,
            isMuted
        });
    }

    [HttpPost("follow/{userId}")]
    public async Task<IActionResult> Follow(Guid userId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var result = await _userService.FollowUserAsync(currentUserId, userId);
        if (!result) return BadRequest("Could not follow user");

        var targetUser = await _userService.GetUserByIdAsync(userId);
        return Ok(new { 
            isFollowing = true, 
            followersCount = targetUser?.FollowersCount ?? 0 
        });
    }

    [HttpPost("unfollow/{userId}")]
    public async Task<IActionResult> Unfollow(Guid userId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        await _userService.UnfollowUserAsync(currentUserId, userId);

        var targetUser = await _userService.GetUserByIdAsync(userId);
        return Ok(new { 
            isFollowing = false, 
            followersCount = targetUser?.FollowersCount ?? 0 
        });
    }

    [HttpPost("block/{userId}")]
    public async Task<IActionResult> Block(Guid userId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var result = await _userService.BlockUserAsync(currentUserId, userId);
        if (!result) return BadRequest("Could not block user");

        return Ok(new { isBlocking = true, isFollowing = false });
    }

    [HttpPost("unblock/{userId}")]
    public async Task<IActionResult> Unblock(Guid userId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        await _userService.UnblockUserAsync(currentUserId, userId);
        return Ok(new { isBlocking = false });
    }

    [HttpPost("mute/{userId}")]
    public async Task<IActionResult> Mute(Guid userId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var result = await _userService.MuteUserAsync(currentUserId, userId);
        if (!result) return BadRequest("Could not mute user");
        return Ok(new { isMuted = true });
    }

    [HttpPost("unmute/{userId}")]
    public async Task<IActionResult> Unmute(Guid userId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        await _userService.UnmuteUserAsync(currentUserId, userId);
        return Ok(new { isMuted = false });
    }

    [HttpGet("{userId}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId)
    {
        var users = await _userService.GetFollowersAsync(userId);
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            dtos.Add(await MapUserToDtoWithStatus(user, currentUserId));
        }
        return Ok(dtos);
    }

    [HttpGet("{userId}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId)
    {
        var users = await _userService.GetFollowingAsync(userId);
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            var dto = await MapUserToDtoWithStatus(user, currentUserId);
            // If viewing own following list, we definitely follow everyone in it
            if (userId == currentUserId && currentUserId.HasValue)
            {
                dto = dto with { IsFollowing = true };
            }
            dtos.Add(dto);
        }
        return Ok(dtos);
    }

    [HttpGet("muted")]
    public async Task<IActionResult> GetMutedAccounts()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var users = await _userService.GetMutedUsersAsync(currentUserId);
        
        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            var dto = await MapUserToDtoWithStatus(user, currentUserId);
            dto = dto with { IsMuted = true };
            dtos.Add(dto);
        }
        return Ok(dtos);
    }

    [HttpGet("blocked")]
    public async Task<IActionResult> GetBlockedAccounts()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var users = await _userService.GetBlockedUsersAsync(currentUserId);
        
        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            var dto = await MapUserToDtoWithStatus(user, currentUserId);
            dto = dto with { IsBlocking = true };
            dtos.Add(dto);
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

    [HttpGet("muted-words")]
    public async Task<IActionResult> GetMutedWords()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var words = await _userService.GetMutedWordsAsync(currentUserId);
        var dtos = words.Select(w => new MutedWordDto(w.Id, w.Word, w.MuteBehavior, w.CreatedAt));
        return Ok(dtos);
    }

    [HttpPost("muted-words")]
    public async Task<IActionResult> AddMutedWord([FromBody] MutedWordDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var word = await _userService.AddMutedWordAsync(currentUserId, request.Word, request.MuteBehavior);
        return Ok(new MutedWordDto(word.Id, word.Word, word.MuteBehavior, word.CreatedAt));
    }

    [HttpDelete("muted-words/{id}")]
    public async Task<IActionResult> DeleteMutedWord(int id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var success = await _userService.DeleteMutedWordAsync(currentUserId, id);
        if (!success) return NotFound();
        return Ok();
    }
}
