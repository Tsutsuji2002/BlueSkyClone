using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/users")]
public class ProfileController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly BSkyClone.Models.BSkyDbContext _db;

    public ProfileController(IUserService userService, BSkyClone.Models.BSkyDbContext db)
    {
        _userService = userService;
        _db = db;
    }

    [AllowAnonymous]
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
                   
        // Enforce guest visibility setting: if the profile owner requires login to view, block unauthenticated callers
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        var token = Request.Headers["Authorization"].ToString().Replace("Bearer ", "");
        Guid? currentUserIdGuid = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        if (user == null) 
        {
            // If not found locally, and it looks like a remote handle (contains a dot or starts with did:), try resolving it.
            if (!string.IsNullOrEmpty(handle) && (handle.Contains(".") || handle.StartsWith("did:")))
            {
                 user = await _userService.ResolveRemoteProfileAsync(handle, token, currentUserIdGuid);
            }
            
            if (user == null) return NotFound();
        }
        else if (!string.IsNullOrEmpty(user.Did) && !user.Did.StartsWith("did:local:"))
        {
            // Federating user: trigger a refresh to sync latest network stats (followers/following/posts)
            var refreshed = await _userService.ResolveRemoteProfileAsync(user.Did, token, currentUserIdGuid);
            if (refreshed != null) user = refreshed;
        }
        bool isGuest = string.IsNullOrEmpty(currentUserIdString);
        if (isGuest && user.Id != Guid.Empty)
        {
            // Only check for local users (did:local or null did)
            bool isLocalUser = string.IsNullOrEmpty(user.Did) || user.Did.StartsWith("did:local:");
            if (isLocalUser)
            {
                var settings = await _db.Set<UserSetting>().FirstOrDefaultAsync(s => s.UserId == user.Id);
                if (settings?.RequireLogoutVisibility == true)
                {
                    return StatusCode(403, new { message = "This account is not visible to logged-out users." });
                }
            }
        }

        // Dynamically compute counts for local users to prevent stale metrics
        if (string.IsNullOrEmpty(user.Did) || user.Did.StartsWith("did:local:"))
        {
            user.PostsCount = await _db.Posts.CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);
            user.FollowersCount = await _db.UserFollows.CountAsync(f => f.FollowingId == user.Id);
            user.FollowingCount = await _db.UserFollows.CountAsync(f => f.FollowerId == user.Id);
        }

        bool isFollowing = false;
        bool isBlockedBy = false;
        bool isBlocking = false;
        bool isMuted = false;
        bool isFollowedBy = false;

        if (Guid.TryParse(currentUserIdString, out var currentUserId))
        {
            isBlockedBy = await _userService.IsBlockedByAsync(currentUserId, user.Id);
            isFollowing = await _userService.IsFollowingAsync(currentUserId, user.Id);
            isBlocking = await _userService.IsBlockedAsync(currentUserId, user.Id);
            isMuted = await _userService.IsMutedAsync(currentUserId, user.Id);
            isFollowedBy = await _userService.IsFollowingAsync(user.Id, currentUserId);
        }

        var follow = (Guid.TryParse(currentUserIdString, out var cid1) && isFollowing) 
            ? await _userService.GetFollowAsync(cid1, user.Id) : null;
        var block = (Guid.TryParse(currentUserIdString, out var cid2) && isBlocking)
            ? await _userService.GetBlockAsync(cid2, user.Id) : null;

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
            user.Did,
            follow?.Uri
        )
        {
            IsFollowing = isFollowing,
            IsBlocking = isBlocking,
            IsBlockedBy = isBlockedBy,
            IsMuted = isMuted,
            IsFollowedBy = isFollowedBy,
            BlockingReference = block?.Uri
        };

        return Ok(new { 
            user = userDto,
            isFollowing,
            isBlockedBy,
            isBlocking,
            isMuted,
            isFollowedBy
        });
    }

    [AllowAnonymous]
    [HttpGet("profile/id/{userId}")]
    public async Task<IActionResult> GetProfileById(Guid userId)
    {
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null) return NotFound();

        // THIN-CLIENT: Refresh remote profile to sync counts/metadata
        if (!string.IsNullOrEmpty(user.Did) && !user.Did.StartsWith("did:local:"))
        {
            var refreshed = await _userService.ResolveRemoteProfileAsync(user.Did);
            if (refreshed != null) user = refreshed;
        }

        // Enforce guest visibility
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        bool isGuest = string.IsNullOrEmpty(currentUserIdString);
        if (isGuest)
        {
            bool isLocalUser = string.IsNullOrEmpty(user.Did) || user.Did.StartsWith("did:local:");
            if (isLocalUser)
            {
                var settings = await _db.Set<UserSetting>().FirstOrDefaultAsync(s => s.UserId == user.Id);
                if (settings?.RequireLogoutVisibility == true)
                {
                    return StatusCode(403, new { message = "This account is not visible to logged-out users." });
                }
            }
        }

        // Dynamically compute counts for local users to prevent stale metrics
        if (string.IsNullOrEmpty(user.Did) || user.Did.StartsWith("did:local:"))
        {
            user.PostsCount = await _db.Posts.CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);
            user.FollowersCount = await _db.UserFollows.CountAsync(f => f.FollowingId == user.Id);
            user.FollowingCount = await _db.UserFollows.CountAsync(f => f.FollowerId == user.Id);
        }

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

        var follow = (Guid.TryParse(currentUserIdString, out var cid1) && isFollowing) 
            ? await _userService.GetFollowAsync(cid1, user.Id) : null;
        var block = (Guid.TryParse(currentUserIdString, out var cid2) && isBlocking)
            ? await _userService.GetBlockAsync(cid2, user.Id) : null;

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
            user.Did,
            follow?.Uri
        )
        {
            IsFollowing = isFollowing,
            IsBlocking = isBlocking,
            IsBlockedBy = isBlockedBy,
            IsMuted = isMuted,
            BlockingReference = block?.Uri
        };

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
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized(new { message = "Unauthorized" });
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound(new { message = "User not found or could not be resolved" });

        var followUri = await _userService.FollowUserAsync(currentUserId, targetUser.Id);
        if (followUri == null) return BadRequest(new { message = "Could not follow user. Your Bluesky session may have expired. Please log out and log back in." });

        // Re-fetch to get updated counters
        targetUser = await _userService.GetUserByIdAsync(targetUser.Id);
        return Ok(new { 
            isFollowing = true, 
            followersCount = targetUser?.FollowersCount ?? 0,
            uri = followUri
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
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized(new { message = "Unauthorized" });
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound(new { message = "User not found" });

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
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized(new { message = "Unauthorized" });
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound(new { message = "User not found" });

        var result = await _userService.BlockUserAsync(currentUserId, targetUser.Id);
        if (!result) return BadRequest(new { message = "Could not block user" });

        return Ok(new { isBlocking = true, isFollowing = false });
    }

    [HttpPost("unblock/{userIdOrDid}")]
    public async Task<IActionResult> Unblock(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized(new { message = "Unauthorized" });
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound(new { message = "User not found" });

        await _userService.UnblockUserAsync(currentUserId, targetUser.Id);
        return Ok(new { isBlocking = false });
    }

    [HttpPost("mute/{userIdOrDid}")]
    public async Task<IActionResult> Mute(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized(new { message = "Unauthorized" });
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid);
        if (targetUser == null) return NotFound(new { message = "User not found" });

        var result = await _userService.MuteUserAsync(currentUserId, targetUser.Id);
        if (!result) return BadRequest(new { message = "Could not mute user" });
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

    [AllowAnonymous]
    [HttpGet("{userId}/followers")]
    public async Task<IActionResult> GetFollowers(string userId, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        var (users, nextCursor) = await _userService.GetFollowersAsync(userId, limit, cursor);
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var interactionStatuses = currentUserId.HasValue 
            ? await _userService.GetInteractionStatusesAsync(currentUserId.Value, users.Where(u => u != null).Select(u => u.Id))
            : new Dictionary<Guid, UserRelationshipStatusDto>();

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            if (user == null) continue;
            interactionStatuses.TryGetValue(user.Id, out var status);
            dtos.Add(MapUserToDtoWithPreFetchedStatus(user, currentUserId, status));
        }
        return Ok(new { followers = dtos, cursor = nextCursor });
    }

    [AllowAnonymous]
    [HttpGet("{userId}/following")]
    public async Task<IActionResult> GetFollowing(string userId, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        var (users, nextCursor) = await _userService.GetFollowingAsync(userId, limit, cursor);
        var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

        var interactionStatuses = currentUserId.HasValue 
            ? await _userService.GetInteractionStatusesAsync(currentUserId.Value, users.Where(u => u != null).Select(u => u.Id))
            : new Dictionary<Guid, UserRelationshipStatusDto>();

        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            if (user == null) continue;
            interactionStatuses.TryGetValue(user.Id, out var status);
            var dto = MapUserToDtoWithPreFetchedStatus(user, currentUserId, status);
            // If viewing own following, they are all followed by definition
            if (userId == currentUserIdString && currentUserId.HasValue)
            {
                dto = dto with { IsFollowing = true };
            }
            dtos.Add(dto);
        }
        return Ok(new { following = dtos, cursor = nextCursor });
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
            var dto = MapUserToDtoWithPreFetchedStatus(user, currentUserId, null);
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
            var dto = MapUserToDtoWithPreFetchedStatus(user, currentUserId, null);
            dto = dto with { IsBlocking = true };
            dtos.Add(dto);
        }
        return Ok(dtos);
    }

    private UserDto MapUserToDtoWithPreFetchedStatus(User user, Guid? viewerId, UserRelationshipStatusDto? status)
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

        if (status != null && viewerId.HasValue && viewerId != user.Id)
        {
            return dto with
            {
                IsFollowing = status.IsFollowing,
                IsBlocking = status.IsBlocking,
                IsBlockedBy = status.IsBlockedBy,
                IsMuted = status.IsMuted,
                FollowingReference = status.FollowingReference,
                BlockingReference = status.BlockingReference
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
