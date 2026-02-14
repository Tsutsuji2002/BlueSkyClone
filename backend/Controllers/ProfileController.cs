using BSkyClone.DTOs;
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
        var user = await _userService.GetUserByHandleAsync(handle) 
                   ?? await _userService.GetUserByUsernameAsync(handle);
                   
        if (user == null) return NotFound();

        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
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
                // We will return specific status so frontend can show "You are blocked"
                // But for restricted access per requirement "Unless... blocked... they can access profile",
                // implies if blocked, they cannot.
                // We'll return the basic info but with isBlockedBy=true, frontend handles UI.
                // OR we can return 403. Let's return 200 with flags so UI can render "You are blocked".
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
            user.PostsCount
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

        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
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
            user.PostsCount
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
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
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
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
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
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _userService.BlockUserAsync(currentUserId, userId);
        if (!result) return BadRequest("Could not block user");

        return Ok(new { isBlocking = true, isFollowing = false });
    }

    [HttpPost("unblock/{userId}")]
    public async Task<IActionResult> Unblock(Guid userId)
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        await _userService.UnblockUserAsync(currentUserId, userId);
        return Ok(new { isBlocking = false });
    }

    [HttpPost("mute/{userId}")]
    public async Task<IActionResult> Mute(Guid userId)
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var result = await _userService.MuteUserAsync(currentUserId, userId);
        if (!result) return BadRequest("Could not mute user");
        return Ok(new { isMuted = true });
    }

    [HttpPost("unmute/{userId}")]
    public async Task<IActionResult> Unmute(Guid userId)
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        await _userService.UnmuteUserAsync(currentUserId, userId);
        return Ok(new { isMuted = false });
    }

    [HttpGet("{userId}/followers")]
    public async Task<IActionResult> GetFollowers(Guid userId)
    {
        var users = await _userService.GetFollowersAsync(userId);
        var dtos = users.Select(user => new UserDto(
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
        ));
        return Ok(dtos);
    }

    [HttpGet("{userId}/following")]
    public async Task<IActionResult> GetFollowing(Guid userId)
    {
        var users = await _userService.GetFollowingAsync(userId);
        var dtos = users.Select(user => new UserDto(
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
        ));
        return Ok(dtos);
    }

    [HttpGet("muted")]
    public async Task<IActionResult> GetMutedAccounts()
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var users = await _userService.GetMutedUsersAsync(currentUserId);
        var dtos = users.Select(user => new UserDto(
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
        ));
        return Ok(dtos);
    }

    [HttpGet("blocked")]
    public async Task<IActionResult> GetBlockedAccounts()
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var users = await _userService.GetBlockedUsersAsync(currentUserId);
        var dtos = users.Select(user => new UserDto(
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
        ));
        return Ok(dtos);
    }

    [HttpGet("muted-words")]
    public async Task<IActionResult> GetMutedWords()
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var words = await _userService.GetMutedWordsAsync(currentUserId);
        var dtos = words.Select(w => new MutedWordDto(w.Id, w.Word, w.MuteBehavior, w.CreatedAt));
        return Ok(dtos);
    }

    [HttpPost("muted-words")]
    public async Task<IActionResult> AddMutedWord([FromBody] MutedWordDto request)
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var word = await _userService.AddMutedWordAsync(currentUserId, request.Word, request.MuteBehavior);
        return Ok(new MutedWordDto(word.Id, word.Word, word.MuteBehavior, word.CreatedAt));
    }

    [HttpDelete("muted-words/{id}")]
    public async Task<IActionResult> DeleteMutedWord(int id)
    {
        var currentUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
        var success = await _userService.DeleteMutedWordAsync(currentUserId, id);
        if (!success) return NotFound();
        return Ok();
    }
}
