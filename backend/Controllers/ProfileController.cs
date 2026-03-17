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
                   
        if (user == null) 
        {
            // If not found locally, and it looks like a remote handle (contains a dot or starts with did:), try resolving it.
            if (!string.IsNullOrEmpty(handle) && (handle.Contains(".") || handle.StartsWith("did:")))
            {
                 user = await _userService.ResolveRemoteProfileAsync(handle);
            }
            
            if (user == null) return NotFound();
        }

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

    [HttpPost("follow/{userIdOrDid}")]
    public async Task<IActionResult> Follow(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound("User not found or could not be resolved");

        var result = await _userService.FollowUserAsync(currentUserId, targetUser.Id);
        if (!result) return BadRequest("Could not follow user");

        // Re-fetch to get updated counters
        targetUser = await _userService.GetUserByIdAsync(targetUser.Id);
        return Ok(new { 
            isFollowing = true, 
            followersCount = targetUser?.FollowersCount ?? 0 
        });
    }

    private async Task<User?> ResolveUserAsync(string identifier)
    {
        if (Guid.TryParse(identifier, out var guid))
        {
            return await _userService.GetUserByIdAsync(guid);
        }
        
        // Try remote resolution or handle lookup
        return await _userService.ResolveRemoteProfileAsync(identifier);
    }

    [HttpPost("unfollow/{userIdOrDid}")]
    public async Task<IActionResult> Unfollow(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound("User not found");

        await _userService.UnfollowUserAsync(currentUserId, targetUser.Id);

        targetUser = await _userService.GetUserByIdAsync(targetUser.Id);
        return Ok(new { 
            isFollowing = false, 
            followersCount = targetUser?.FollowersCount ?? 0 
        });
    }

    [HttpPost("block/{userIdOrDid}")]
    public async Task<IActionResult> Block(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound("User not found");

        var result = await _userService.BlockUserAsync(currentUserId, targetUser.Id);
        if (!result) return BadRequest("Could not block user");

        return Ok(new { isBlocking = true, isFollowing = false });
    }

    [HttpPost("unblock/{userIdOrDid}")]
    public async Task<IActionResult> Unblock(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound("User not found");

        await _userService.UnblockUserAsync(currentUserId, targetUser.Id);
        return Ok(new { isBlocking = false });
    }

    [HttpPost("mute/{userIdOrDid}")]
    public async Task<IActionResult> Mute(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound("User not found");

        var result = await _userService.MuteUserAsync(currentUserId, targetUser.Id);
        if (!result) return BadRequest("Could not mute user");
        return Ok(new { isMuted = true });
    }

    [HttpPost("unmute/{userIdOrDid}")]
    public async Task<IActionResult> Unmute(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound("User not found");

        await _userService.UnmuteUserAsync(currentUserId, targetUser.Id);
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
            if (user == null) continue;
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
            if (user == null) continue;
            var dto = await MapUserToDtoWithStatus(user, currentUserId);
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
            if (user == null) continue;
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
            if (user == null) continue;
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
            user.Username ?? "unknown",
            user.Handle ?? "unknown",
            user.Email ?? "unknown",
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
            user.Role ?? "user",
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
