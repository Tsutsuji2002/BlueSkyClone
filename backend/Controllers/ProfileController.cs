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
    private readonly IPostService _postService;
    private readonly BSkyClone.Models.BSkyDbContext _db;
    private readonly ILogger<ProfileController> _logger;

    public ProfileController(IUserService userService, IPostService postService, BSkyClone.Models.BSkyDbContext db, ILogger<ProfileController> logger)
    {
        _userService = userService;
        _postService = postService;
        _db = db;
        _logger = logger;
    }

    [AllowAnonymous]
    [HttpGet("profile/{*handle}")]
    public async Task<IActionResult> GetProfile(string handle)
    {
        User? user = null;
        try
        {
            if (Guid.TryParse(handle, out var userId))
            {
                user = await _userService.GetUserByIdAsync(userId);
            }
            else
            {
                user = await _userService.GetUserByHandleAsync(handle) 
                       ?? await _userService.GetUserByUsernameAsync(handle);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Local profile lookup failed for {Handle}. Falling back to remote resolution.", handle);
            user = null;
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
            try
            {
                var refreshed = await _userService.ResolveRemoteProfileAsync(user.Did, token, currentUserIdGuid);
                if (refreshed != null) user = refreshed;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Remote profile refresh failed for {Did}. Using local data.", user.Did);
            }
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

        // Counts are maintained incrementally in the service layer.

        bool isFollowing = false;
        bool isFollowedBy = false;
        bool isBlockedBy = false;
        bool isBlocking = false;
        bool isMuted = false;

        MutedByListDto? mutedBy = null;
        if (Guid.TryParse(currentUserIdString, out var currentUserId))
        {
            isBlockedBy = await _userService.IsBlockedByAsync(currentUserId, user.Id);
            isFollowing = await _userService.IsFollowingAsync(currentUserId, user.Id);
            isFollowedBy = await _userService.IsFollowingAsync(user.Id, currentUserId);
            isBlocking = await _userService.IsBlockedAsync(currentUserId, user.Id);
            isMuted = await _userService.IsMutedAsync(currentUserId, user.Id);
            
            if (isMuted)
            {
                mutedBy = await _userService.GetMutingListAsync(currentUserId, user.Id);
            }
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
            BlockingReference = block?.Uri,
            MutedBy = mutedBy,
            MuteInfo = await EvaluateProfileMuteInfo(user, currentUserIdGuid)
        };

        if (!string.IsNullOrEmpty(user.PinnedPostUri))
        {
            try
            {
                var pinnedPost = await _postService.GetPostByUriAsync(user.PinnedPostUri);
                if (pinnedPost != null)
                {
                    var enriched = await _postService.EnrichAndFilterPostsAsync(new List<PostDto> { pinnedPost }, currentUserIdGuid ?? Guid.Empty);
                    if (enriched.Any())
                    {
                        var pinned = enriched.First();
                        pinned.IsPinned = true;
                        userDto.PinnedPost = pinned;
                    }
                }
            }
            catch (Exception)
            {
                // Ignore pinned post errors
            }
        }

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
        bool isFollowedBy = false;
        bool isBlockedBy = false;
        bool isBlocking = false;
        bool isMuted = false;

        MutedByListDto? mutedById = null;
        if (Guid.TryParse(currentUserIdString, out var currentUserId))
        {
            isBlockedBy = await _userService.IsBlockedByAsync(currentUserId, user.Id);
            isFollowing = await _userService.IsFollowingAsync(currentUserId, user.Id);
            isFollowedBy = await _userService.IsFollowingAsync(user.Id, currentUserId);
            isBlocking = await _userService.IsBlockedAsync(currentUserId, user.Id);
            isMuted = await _userService.IsMutedAsync(currentUserId, user.Id);

            if (isMuted)
            {
                mutedById = await _userService.GetMutingListAsync(currentUserId, user.Id);
            }
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
            IsFollowedBy = isFollowedBy,
            IsBlocking = isBlocking,
            IsBlockedBy = isBlockedBy,
            IsMuted = isMuted,
            BlockingReference = block?.Uri,
            MutedBy = mutedById,
            MuteInfo = await EvaluateProfileMuteInfo(user, Guid.TryParse(currentUserIdString, out var cid) ? cid : null)
        };

        return Ok(new { 
            user = userDto,
            isFollowing,
            isFollowedBy,
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

        var targetUser = await ResolveUserAsync(userIdOrDid, currentUserId);
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

    private async Task<User?> ResolveUserAsync(string identifier, Guid? viewerId = null)
    {
        if (Guid.TryParse(identifier, out var guid))
        {
            return await _userService.GetUserByIdAsync(guid);
        }

        // Try local handle lookup first (for local users)
        var localUser = await _userService.GetUserByHandleAsync(identifier)
            ?? await _userService.GetUserByUsernameAsync(identifier);
        if (localUser != null)
        {
            return localUser;
        }

        // Try remote resolution (for remote ATProto users)
        return await _userService.ResolveRemoteProfileAsync(identifier, viewerId: viewerId);
    }

    [HttpPost("unfollow/{userIdOrDid}")]
    public async Task<IActionResult> Unfollow(string userIdOrDid)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized(new { message = "Unauthorized" });
        var currentUserId = Guid.Parse(userIdStr);

        var targetUser = await ResolveUserAsync(userIdOrDid, currentUserId);
        if (targetUser == null) return NotFound(new { message = "User not found" });

        var success = await _userService.UnfollowUserAsync(currentUserId, targetUser.Id);
        if (!success) return BadRequest(new { message = "Could not unfollow user. Your Bluesky session may have expired. Please log out and log back in." });

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
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? currentUserId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;
            
            _logger.LogInformation("[GetFollowers] Request for userId: {UserId}, limit: {Limit}, cursor: {Cursor}, currentUserId: {CurrentUserId}", userId, limit, cursor, currentUserId);

            User? targetUser = null;
            try
            {
                targetUser = await ResolveUserAsync(userId, currentUserId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[GetFollowers] Database error during ResolveUserAsync for {UserId}. Proceeding to check if remote.", userId);
            }

            var isRemoteAtProto = (targetUser != null &&
                                   !string.IsNullOrWhiteSpace(targetUser.Did) &&
                                   !targetUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase))
                                   || userId.StartsWith("did:", StringComparison.OrdinalIgnoreCase)
                                   || (userId.Contains(".") && !Guid.TryParse(userId, out _));

            _logger.LogInformation("[GetFollowers] Target resolved: {Resolved}, IsRemoteAtProto: {IsRemote}", targetUser != null, isRemoteAtProto);

            if (isRemoteAtProto)
            {
                var remoteActor = targetUser?.Did ?? targetUser?.Handle ?? userId;
                _logger.LogInformation("[GetFollowers] Fetching remote for actor: {RemoteActor}", remoteActor);
                var (remoteDtos, remoteNextCursor) = await _userService.GetRemoteFollowersDtosAsync(remoteActor, limit, cursor, currentUserId);
                _logger.LogInformation("[GetFollowers] Remote fetch returned {Count} followers.", remoteDtos.Count);
                return Ok(new { followers = remoteDtos, cursor = remoteNextCursor });
            }

            var (users, nextCursor) = await _userService.GetFollowersAsync(userId, limit, cursor, currentUserId);

            Dictionary<Guid, UserRelationshipStatusDto> interactionStatuses;
            try
            {
                interactionStatuses = currentUserId.HasValue
                    ? await _userService.GetInteractionStatusesAsync(currentUserId.Value, users.Where(u => u != null).Select(u => u.Id), refreshRemote: false)
                    : new Dictionary<Guid, UserRelationshipStatusDto>();
            }
            catch (Exception)
            {
                interactionStatuses = new Dictionary<Guid, UserRelationshipStatusDto>();
            }

            var dtos = new List<UserDto>();
            foreach (var user in users)
            {
                if (user == null) continue;
                var status = interactionStatuses.GetValueOrDefault(user.Id);
                dtos.Add(MapUserToDtoWithPreFetchedStatus(user, currentUserId, status));
            }
            return Ok(new { followers = dtos, cursor = nextCursor });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GetFollowers] Unhandled exception occurred for userId {UserId}", userId);
            // Return error temporarily for live diagnostics
            return Ok(new { followers = new List<object>(), cursor = (string?)null, error = ex.ToString() });
        }
    }

    [AllowAnonymous]
    [HttpGet("{userId}/following")]
    public async Task<IActionResult> GetFollowing(string userId, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        try
        {
            var currentUserIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? currentUserId = Guid.TryParse(currentUserIdString, out var cid) ? cid : null;

            User? targetUser = null;
            try
            {
                targetUser = await ResolveUserAsync(userId, currentUserId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[GetFollowing] Database error during ResolveUserAsync for {UserId}. Proceeding to check if remote.", userId);
            }

            bool isOwnProfile = targetUser != null && currentUserId.HasValue && targetUser.Id == currentUserId.Value;
            var isRemoteAtProto = (targetUser != null &&
                                   !string.IsNullOrWhiteSpace(targetUser.Did) &&
                                   !targetUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase))
                                   || userId.StartsWith("did:", StringComparison.OrdinalIgnoreCase)
                                   || (userId.Contains(".") && !Guid.TryParse(userId, out _));

            if (isRemoteAtProto)
            {
                var remoteActor = targetUser?.Did ?? targetUser?.Handle ?? userId;
                var (remoteDtos, remoteNextCursor) = await _userService.GetRemoteFollowingDtosAsync(remoteActor, limit, cursor, currentUserId);
                if (isOwnProfile)
                {
                    remoteDtos = remoteDtos.Select(dto => dto with { IsFollowing = true }).ToList();
                }
                return Ok(new { following = remoteDtos, cursor = remoteNextCursor });
            }

            var (users, nextCursor) = await _userService.GetFollowingAsync(userId, limit, cursor, currentUserId);

            Dictionary<Guid, UserRelationshipStatusDto> interactionStatuses;
            try
            {
                interactionStatuses = currentUserId.HasValue
                    ? await _userService.GetInteractionStatusesAsync(currentUserId.Value, users.Where(u => u != null).Select(u => u.Id), refreshRemote: false)
                    : new Dictionary<Guid, UserRelationshipStatusDto>();
            }
            catch (Exception)
            {
                interactionStatuses = new Dictionary<Guid, UserRelationshipStatusDto>();
            }

            var dtos = new List<UserDto>();
            foreach (var user in users)
            {
                if (user == null) continue;
                interactionStatuses.TryGetValue(user.Id, out var status);
                var dto = MapUserToDtoWithPreFetchedStatus(user, currentUserId, status);
                // If viewing own following, they are all followed by definition
                if (isOwnProfile)
                {
                    dto = dto with { IsFollowing = true };
                }
                dtos.Add(dto);
            }

            return Ok(new { following = dtos, cursor = nextCursor });
        }
        catch (Exception ex)
        {
            return Ok(new { following = new List<object>(), cursor = (string?)null });
        }
    }

    [HttpGet("muted")]
    public async Task<IActionResult> GetMutedAccounts([FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var (users, nextCursor) = await _userService.GetMutedUsersAsync(currentUserId, limit, cursor);
        
        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            if (user == null) continue;
            var dto = MapUserToDtoWithPreFetchedStatus(user, currentUserId, null);
            dto = dto with { IsMuted = true };
            dtos.Add(dto);
        }
        return Ok(new { mutes = dtos, cursor = nextCursor });
    }

    public async Task<IActionResult> GetBlockedAccounts([FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();
        var currentUserId = Guid.Parse(userIdStr);

        var (users, nextCursor) = await _userService.GetBlockedUsersAsync(currentUserId, limit, cursor);
        
        var dtos = new List<UserDto>();
        foreach (var user in users)
        {
            if (user == null) continue;
            var dto = MapUserToDtoWithPreFetchedStatus(user, currentUserId, null);
            dto = dto with { IsBlocking = true };
            dtos.Add(dto);
        }
        return Ok(new { blocks = dtos, cursor = nextCursor });
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
                IsFollowedBy = status.IsFollowedBy,
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
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var currentUserId)) return Unauthorized();

        var words = await _userService.GetMutedWordsAsync(currentUserId);
        var dtos = words.Select(w => new MutedWordDto(w.Id, w.Word, w.MuteBehavior, w.CreatedAt, w.Targets, w.ExpiresAt, w.ExcludeFollowing));
        return Ok(dtos);
    }

    [HttpPost("muted-words")]
    public async Task<IActionResult> AddMutedWord([FromBody] MutedWordDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var currentUserId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Word)) return BadRequest(new { message = "Word is required" });

        var word = await _userService.AddMutedWordAsync(
            currentUserId, 
            request.Word.Trim(), 
            string.IsNullOrWhiteSpace(request.MuteBehavior) ? "hide" : request.MuteBehavior, 
            request.Targets ?? "content",
            request.ExpiresAt,
            request.ExcludeFollowing
        );
        return Ok(new MutedWordDto(word.Id, word.Word, word.MuteBehavior, word.CreatedAt, word.Targets, word.ExpiresAt, word.ExcludeFollowing));
    }

    [HttpPost("muted-words/sync")]
    public async Task<IActionResult> SyncMutedWords()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var currentUserId)) return Unauthorized();

        await _userService.SyncMutedWordsWithAtProtoAsync(currentUserId);
        return Ok(new { success = true });
    }

    [HttpDelete("muted-words/{id}")]
    public async Task<IActionResult> DeleteMutedWord(int id)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var currentUserId)) return Unauthorized();

        var success = await _userService.DeleteMutedWordAsync(currentUserId, id);
        if (!success) return NotFound();
        return Ok();
    }

    private async Task<PostMuteDto?> EvaluateProfileMuteInfo(User user, Guid? viewerId)
    {
        if (string.IsNullOrWhiteSpace(user.Labels)) return null;

        UserSetting? viewerSettings = null;
        if (viewerId.HasValue)
        {
            viewerSettings = await _db.UserSettings.FirstOrDefaultAsync(s => s.UserId == viewerId.Value);
        }

        bool shouldHide = false;
        string? warnReason = null;
        var muteInfo = new PostMuteDto { IsMuted = false, Behavior = "none" };

        var labels = (user.Labels ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries);
        foreach (var label in labels)
        {
            string filter = "show";
            string category = "";
            var isAdult = label == "porn" || label == "sexual" || label == "nudity" || label == "graphic-media" || label == "nsfw" || label == "adult" || label == "sexual-explicit" || label == "sexual-suggestive";

            if (label == "porn" || label == "sexual-explicit" || label == "sexual") { 
                filter = viewerSettings?.SexuallyExplicitFilter ?? ((viewerSettings?.EnableAdultContent == true) ? "warn" : "hide"); 
                category = "explicit_content";
            }
            else if (label == "nsfw" || label == "adult" || label == "sexual-suggestive") { 
                filter = viewerSettings?.AdultContentFilter ?? ((viewerSettings?.EnableAdultContent == true) ? "warn" : "hide"); 
                category = "adult_content";
            }
            else if (label == "graphic-media" || label == "gore" || label == "violence") { 
                filter = viewerSettings?.GraphicMediaFilter ?? ((viewerSettings?.EnableAdultContent == true) ? "warn" : "hide"); 
                category = "graphic_media";
            }
            else if (label == "nudity") { 
                filter = viewerSettings?.NonSexualNudityFilter ?? ((viewerSettings?.EnableAdultContent == true) ? "show" : "hide"); 
                category = "non_sexual_nudity";
            }
            else if (label == "!hide") {
                filter = "hide";
                category = "Sensitive Content";
            }
            else if (label == "!warn") {
                filter = "warn";
                category = "Sensitive Content";
            }

            if (viewerSettings?.EnableAdultContent == false && isAdult)
            {
                filter = "hide";
            }

            if (filter == "hide") 
            { 
                shouldHide = true;
                warnReason = category; 
                muteInfo.Behavior = "hide"; 
                break;
            }
            else if (filter == "warn" && muteInfo.Behavior != "hide") 
            { 
                warnReason = category; 
                muteInfo.Behavior = "warn";
            }
        }

        if (shouldHide || warnReason != null) {
            muteInfo.IsMuted = true;
            if (string.IsNullOrEmpty(muteInfo.Behavior) || muteInfo.Behavior == "none")
                muteInfo.Behavior = "warn"; 
            muteInfo.Reason = warnReason;
            return muteInfo;
        }

        return null;
    }
}
