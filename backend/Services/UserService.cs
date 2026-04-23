using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;
using System.Net.Http.Headers;
using System.IO;
using Microsoft.AspNetCore.Http; // For QueryCollection
using BSkyClone.UnitOfWork;


namespace BSkyClone.Services;



public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _config;
    private readonly IDistributedCache _distributedCache;
    private readonly ICacheService _cacheService;
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly IRepoManager _repoManager;
    private readonly ILogger<UserService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IServiceScopeFactory _scopeFactory;

    public UserService(
        IUnitOfWork unitOfWork, 
        IConfiguration config, 
        IDistributedCache distributedCache,
        ICacheService cacheService,
        IXrpcProxyService xrpcProxy,
        IRepoManager repoManager,
        ILogger<UserService> logger,
        IHttpClientFactory httpClientFactory,
        IServiceScopeFactory scopeFactory)
    {
        _unitOfWork = unitOfWork;
        _config = config;
        _distributedCache = distributedCache;
        _cacheService = cacheService;
        _xrpcProxy = xrpcProxy;
        _repoManager = repoManager;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _scopeFactory = scopeFactory;
    }

    public async Task<User?> GetUserByIdAsync(Guid id) => await _unitOfWork.Users.GetByIdAsync(id);
    public async Task<User?> GetUserByUsernameAsync(string username) => await _unitOfWork.Users.GetByUsernameAsync(username);
    public async Task<User?> GetUserByHandleAsync(string handle) => await _unitOfWork.Users.GetByHandleAsync(handle);
    public async Task<User?> GetUserByEmailAsync(string email) => await _unitOfWork.Users.GetByEmailAsync(email);
    public async Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<Guid> userIds) => await _unitOfWork.Users.Query().Where(u => userIds.Contains(u.Id)).ToListAsync();
    public async Task<User?> GetUserByDidAsync(string did) => await _unitOfWork.Users.GetByDidAsync(did);

    public async Task<User> CreateUserAsync(RegisterRequest request)
    {
        CreatePasswordHash(request.Password, out byte[] passwordHash, out byte[] passwordSalt);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Handle = $"{request.Username.ToLower()}.{_config["DomainName"]}",
            Email = request.Email,
            DisplayName = request.DisplayName,
            PasswordHash = Convert.ToBase64String(passwordHash),
            Salt = Convert.ToBase64String(passwordSalt),
            CreatedAt = DateTime.UtcNow,
            IsVerified = false,
            Role = "user"
        };

        await _unitOfWork.Users.AddAsync(user);
        
        // Add default settings
        var settings = new UserSetting { UserId = user.Id };
        await _unitOfWork.UserSettings.AddAsync(settings);
        
        await _unitOfWork.CompleteAsync();
        return user;
    }

    public async Task<User?> AuthenticateAsync(string identifier, string password)
    {
        User? user;
        if (identifier.Contains("@"))
            user = await _unitOfWork.Users.GetByEmailAsync(identifier);
        else if (identifier.Contains("."))
            user = await _unitOfWork.Users.GetByHandleAsync(identifier);
        else
            user = await _unitOfWork.Users.GetByUsernameAsync(identifier);

        if (user == null || user.PasswordHash == "REMOTE_USER") return null;

        if (!VerifyPasswordHash(password, Convert.FromBase64String(user.PasswordHash), Convert.FromBase64String(user.Salt)))
            return null;

        return user;
    }

    public async Task<List<User>> SearchUsersAsync(string query, int limit = 10)
    {
        return await _unitOfWork.Users.Query()
            .Where(u => u.Username.Contains(query) || (u.DisplayName != null && u.DisplayName.Contains(query)) || u.Handle.Contains(query))
            .Take(limit)
            .ToListAsync();
    }

    public async Task<User> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) throw new Exception("User not found");

        var profileRecord = await GetCurrentProfileRecordNodeAsync(user)
            ?? new JsonObject
            {
                ["$type"] = "app.bsky.actor.profile"
            };

        ApplyProfileTextField(profileRecord, "displayName", request.DisplayName, value => user.DisplayName = value);
        ApplyProfileTextField(profileRecord, "description", request.Bio, value => user.Bio = value);

        if (request.RemoveAvatar)
        {
            profileRecord.Remove("avatar");
            user.AvatarUrl = null;
        }
        else if (request.Avatar != null)
        {
            var avatarBlob = await UploadProfileBlobNodeAsync(user, request.Avatar);
            profileRecord["avatar"] = avatarBlob;
            user.AvatarUrl = BuildRemoteImageUrl(user.Did, avatarBlob, "avatar");
        }

        if (request.RemoveCoverImage)
        {
            profileRecord.Remove("banner");
            user.CoverImageUrl = null;
        }
        else if (request.CoverImage != null)
        {
            var bannerBlob = await UploadProfileBlobNodeAsync(user, request.CoverImage);
            profileRecord["banner"] = bannerBlob;
            user.CoverImageUrl = BuildRemoteImageUrl(user.Did, bannerBlob, "banner");
        }

        await SaveProfileRecordAsync(user, profileRecord);

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();
        return user;
    }

    private static void ApplyProfileTextField(JsonObject profileRecord, string fieldName, string? incomingValue, Action<string?> updateLocal)
    {
        if (incomingValue == null)
        {
            return;
        }

        var normalized = string.IsNullOrWhiteSpace(incomingValue) ? null : incomingValue.Trim();
        updateLocal(normalized);

        if (normalized == null)
        {
            profileRecord.Remove(fieldName);
        }
        else
        {
            profileRecord[fieldName] = normalized;
        }
    }

    private async Task<JsonObject?> GetCurrentProfileRecordNodeAsync(User user)
    {
        try
        {
            var response = await _xrpcProxy.ProxyRequestAsync(
                user.Did!,
                "com.atproto.repo.getRecord",
                new Dictionary<string, string?>
                {
                    ["repo"] = user.Did,
                    ["collection"] = "app.bsky.actor.profile",
                    ["rkey"] = "self"
                });

            if (!response.Success || string.IsNullOrWhiteSpace(response.Content))
            {
                return null;
            }

            var root = JsonNode.Parse(response.Content)?.AsObject();
            return root?["value"]?.AsObject();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read current ATProto profile record for {Did}", user.Did);
            return null;
        }
    }

    private async Task<JsonNode> UploadProfileBlobNodeAsync(User user, IFormFile file)
    {
        if (file.Length <= 0)
        {
            throw new Exception("Selected image is empty.");
        }

        var mimeType = NormalizeProfileImageMimeType(file.ContentType, file.FileName);

        if (user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase))
        {
            await using var localStream = file.OpenReadStream();
            var cid = await _repoManager.UploadBlobAsync(user.Did, localStream, mimeType);
            return CreateBlobNode(cid, mimeType, file.Length);
        }

        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{user.Id}");
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new Exception("Your Bluesky session expired. Please sign in again before editing your profile.");
        }

        await using var stream = file.OpenReadStream();
        var result = await _xrpcProxy.ProxyRequestAsync(
            user.Did!,
            "com.atproto.repo.uploadBlob",
            new Dictionary<string, string?>(),
            token,
            "POST",
            stream,
            user.Id,
            mimeType);

        if (!result.Success)
        {
            throw new Exception($"Bluesky blob upload failed: {result.Content}");
        }

        var responseNode = JsonNode.Parse(result.Content)?.AsObject();
        var blobNode = responseNode?["blob"]?.DeepClone();
        if (blobNode == null)
        {
            throw new Exception("Bluesky blob upload returned an invalid response.");
        }

        return blobNode;
    }

    private async Task SaveProfileRecordAsync(User user, JsonObject profileRecord)
    {
        if (user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase))
        {
            var localRecord = JsonSerializer.Deserialize<object>(profileRecord.ToJsonString())
                ?? throw new Exception("Failed to serialize local profile record.");
            await _repoManager.CreateRecordAsync(user.Did, "app.bsky.actor.profile", localRecord, "self");
            return;
        }

        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{user.Id}");
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new Exception("Your Bluesky session expired. Please sign in again before editing your profile.");
        }

        var body = new
        {
            repo = user.Did,
            collection = "app.bsky.actor.profile",
            rkey = "self",
            record = JsonSerializer.Deserialize<object>(profileRecord.ToJsonString())
        };

        var response = await _xrpcProxy.ProxyRequestAsync(
            user.Did!,
            "com.atproto.repo.putRecord",
            new Dictionary<string, string?>(),
            token,
            "POST",
            body,
            user.Id);

        if (!response.Success)
        {
            throw new Exception($"Bluesky profile update failed: {response.Content}");
        }
    }

    private static string NormalizeProfileImageMimeType(string? contentType, string fileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) && contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return contentType;
        }

        var extension = Path.GetExtension(fileName)?.ToLowerInvariant();
        return extension switch
        {
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".gif" => "image/gif",
            _ => "image/jpeg"
        };
    }

    private static JsonObject CreateBlobNode(string cid, string mimeType, long size)
    {
        return new JsonObject
        {
            ["$type"] = "blob",
            ["ref"] = new JsonObject
            {
                ["$link"] = cid
            },
            ["mimeType"] = mimeType,
            ["size"] = size
        };
    }

    private static string? BuildRemoteImageUrl(string? did, JsonNode blobNode, string imageType)
    {
        var cid = blobNode["ref"]?["$link"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(did) || string.IsNullOrWhiteSpace(cid) || did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return $"https://cdn.bsky.app/img/{imageType}/plain/{did}/{cid}@jpeg";
    }

    public async Task<User> UpdateAccountAsync(Guid userId, UpdateAccountRequest request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) throw new Exception("User not found");

        if (request.Email != null) user.Email = request.Email;
        if (request.Username != null) {
            user.Username = request.Username;
            user.Handle = $"{request.Username.ToLower()}.{_config["DomainName"]}";
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();
        return user;
    }

    public async Task<UserSetting> UpdateSettingsAsync(Guid userId, UserSettingDto request)
    {
        var settings = await _unitOfWork.UserSettings.Query().FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings == null)
        {
            settings = new UserSetting { UserId = userId };
            await _unitOfWork.UserSettings.AddAsync(settings);
        }

        // Map DTO to Model using reflection to support partial updates
        var dtoProps = typeof(UserSettingDto).GetProperties();
        var modelType = typeof(UserSetting);
        
        foreach (var prop in dtoProps)
        {
            var val = prop.GetValue(request);
            if (val != null)
            {
                var modelProp = modelType.GetProperty(prop.Name);
                if (modelProp != null && modelProp.CanWrite)
                {
                    modelProp.SetValue(settings, val);
                }
            }
        }


        _unitOfWork.UserSettings.Update(settings);
        await _unitOfWork.CompleteAsync();
        return settings;
    }

    public async Task<UserSetting> GetSettingsAsync(Guid userId)
    {
        var settings = await _unitOfWork.UserSettings.Query().FirstOrDefaultAsync(s => s.UserId == userId);
        if (settings == null)
        {
            settings = new UserSetting { UserId = userId };
            await _unitOfWork.UserSettings.AddAsync(settings);
            await _unitOfWork.CompleteAsync();
        }
        return settings;
    }

    public async Task<bool> VerifyDomainAsync(Guid userId, string? handle = null)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return false;

        // In a real app, this would check DNS/HTTP records
        user.Handle = handle;
        user.IsVerified = true;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<List<string>> GetSelectedInterestsAsync(Guid userId)
    {
        var user = await _unitOfWork.Users.Query().Include(u => u.Interests).FirstOrDefaultAsync(u => u.Id == userId);
        return user?.Interests.Select(i => i.Name).ToList() ?? new List<string>();
    }

    public async Task SaveSelectedInterestsAsync(Guid userId, List<string> interests)
    {
        var user = await _unitOfWork.Users.Query().Include(u => u.Interests).FirstOrDefaultAsync(u => u.Id == userId);
        if (user != null)
        {
            user.Interests.Clear();
            var allInterests = await _unitOfWork.Interests.Query().ToListAsync();
            foreach (var name in interests)
            {
                var interest = allInterests.FirstOrDefault(i => i.Name == name);
                if (interest != null) user.Interests.Add(interest);
            }
            await _unitOfWork.CompleteAsync();
        }
    }

    public async Task<User?> ResolveRemoteProfileAsync(string identifier, string? token = null, Guid? viewerId = null)
    {
        var cacheKey = $"remote_profile:{identifier}";
        var cached = await _cacheService.GetAsync<User>(cacheKey);

        try
        {
            string baseApiUrl = "https://api.bsky.app";
            if (string.IsNullOrEmpty(token)) {
                token = viewerId.HasValue ? await GetOrRefreshBlueskyTokenAsync(viewerId.Value) : null;
            }
            
            // Use public API for unauthenticated requests
            if (string.IsNullOrEmpty(token)) {
                baseApiUrl = "https://public.api.bsky.app";
            }

            var url = $"{baseApiUrl}/xrpc/app.bsky.actor.getProfile?actor={Uri.EscapeDataString(identifier)}";
            using var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            if (!string.IsNullOrEmpty(token))
            {
                client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            var response = await client.GetAsync(url);
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized && !string.IsNullOrEmpty(token))
            {
                  // Try one more time with public if private failed
                  return await ResolveRemoteProfileAsync(identifier, null, null);
            }
            
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;

                var did = root.GetProperty("did").GetString();
                if (string.IsNullOrEmpty(did)) return null;

                var profileHandle = root.GetProperty("handle").GetString();
                
                // Merge/Sync logic
                await MergeDuplicateUsersAsync(did);
                var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
                if (user == null)
                {
                    var username = profileHandle?.Split('.')[0] ?? did;
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Did = did,
                        Username = username,
                        CreatedAt = DateTime.UtcNow,
                        PasswordHash = "REMOTE_USER",
                        Salt = "REMOTE_USER",
                        Email = $"{did}@remote.bsky.social"
                    };
                    await _unitOfWork.Users.AddAsync(user);
                }

                user.Handle = profileHandle;
                user.DisplayName = root.TryGetProperty("displayName", out var dn) ? dn.GetString() : null;
                user.AvatarUrl = root.TryGetProperty("avatar", out var av) ? av.GetString() : null;
                user.CoverImageUrl = root.TryGetProperty("banner", out var bn) ? bn.GetString() : null;
                user.Bio = root.TryGetProperty("description", out var ds) ? ds.GetString() : null;
                user.FollowersCount = root.TryGetProperty("followersCount", out var fc) && fc.TryGetInt32(out var followersCount) ? followersCount : (user.FollowersCount ?? 0);
                user.FollowingCount =
                    root.TryGetProperty("followsCount", out var followsCountProp) && followsCountProp.TryGetInt32(out var followsCount)
                        ? followsCount
                        : (root.TryGetProperty("followingCount", out var fgc) && fgc.TryGetInt32(out var followingCount)
                            ? followingCount
                            : (user.FollowingCount ?? 0));
                user.PostsCount = root.TryGetProperty("postsCount", out var pc) && pc.TryGetInt32(out var postsCount) ? postsCount : (user.PostsCount ?? 0);
                user.IsVerified = true;

                _unitOfWork.Users.Update(user);

                // Interactions (Mute/Block/Follow)
                if (viewerId.HasValue && root.TryGetProperty("viewer", out var viewerProp))
                {
                    await SyncRelationshipStatusWithAtProtoAsync(viewerId.Value, user, viewerProp);
                }

                await _unitOfWork.CompleteAsync();
                await _cacheService.SetAsync(cacheKey, user, TimeSpan.FromMinutes(30));
                return user;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving remote profile for {Actor}", identifier);
        }

        return cached;
    }

    public async Task<User?> GetProfileByDidAsync(string did)
    {
        return await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
    }

    // --- Interaction Implementation ---
    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId) => await _unitOfWork.Follows.IsFollowingAsync(followerId, followingId);
    public async Task<bool> IsBlockedAsync(Guid userId, Guid targetUserId) => await _unitOfWork.Blocks.IsBlockedAsync(userId, targetUserId);
    public async Task<bool> IsBlockedByAsync(Guid userId, Guid targetUserId) => await _unitOfWork.Blocks.IsBlockedAsync(targetUserId, userId);
    public async Task<bool> IsMutedAsync(Guid userId, Guid targetUserId) => await _unitOfWork.Mutes.IsMutedAsync(userId, targetUserId);

    public async Task<(List<User> Users, string? Cursor)> GetFollowingAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null)
    {
        User? user = null;
        if (Guid.TryParse(actor, out var targetUserId))
            user = await GetUserByIdAsync(targetUserId);

        if (user == null)
            user = await GetUserByHandleAsync(actor);

        if (user == null)
            user = await ResolveRemoteProfileAsync(actor, viewerId: viewerId);

        if (user == null) return (new List<User>(), null);

        // Identify if this is a remote ATProto user (Bluesky) vs a local-only user
        bool isRemoteATProto = !string.IsNullOrEmpty(user.Did) && !(user.Handle?.EndsWith($".{_config["DomainName"]}") ?? false);
        
        if (isRemoteATProto)
        {
            _logger.LogInformation("[GetFollowingAsync] Triggering remote fetch for {Actor}", actor);
            return await GetRemoteFollowingAsync(user.Did, limit, cursor, viewerId);
        }

        var skip = int.TryParse(cursor, out var parsedSkip) ? Math.Max(parsedSkip, 0) : 0;
        var follows = await _unitOfWork.Follows.GetFollowingAsync(user.Id, skip, limit + 1);
        var hasMore = follows.Count > limit;
        var page = hasMore ? follows.Take(limit).ToList() : follows;
        var nextCursor = hasMore ? (skip + limit).ToString() : null;

        return (page.Select(f => f.Following).ToList(), nextCursor);
    }

    public async Task<(List<User> Users, string? Cursor)> GetFollowersAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null)
    {
        User? user = null;
        if (Guid.TryParse(actor, out var targetUserId))
            user = await GetUserByIdAsync(targetUserId);

        if (user == null)
            user = await GetUserByHandleAsync(actor);

        if (user == null)
            user = await ResolveRemoteProfileAsync(actor, viewerId: viewerId);

        if (user == null) return (new List<User>(), null);

        bool isRemoteATProto = !string.IsNullOrEmpty(user.Did) && !(user.Handle?.EndsWith($".{_config["DomainName"]}") ?? false);
        
        if (isRemoteATProto)
        {
            return await GetRemoteFollowersAsync(user.Did, limit, cursor, viewerId);
        }

        var skip = int.TryParse(cursor, out var parsedSkip) ? Math.Max(parsedSkip, 0) : 0;
        var follows = await _unitOfWork.Follows.GetFollowersAsync(user.Id, skip, limit + 1);
        var hasMore = follows.Count > limit;
        var page = hasMore ? follows.Take(limit).ToList() : follows;
        var nextCursor = hasMore ? (skip + limit).ToString() : null;

        return (page.Select(f => f.Follower).ToList(), nextCursor);
    }

    public async Task<(List<UserDto> Users, string? Cursor)> GetRemoteFollowingDtosAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null)
    {
        return await GetRemoteGraphDtosAsync(actor, limit, cursor, viewerId, "app.bsky.graph.getFollows", "follows");
    }

    public async Task<(List<UserDto> Users, string? Cursor)> GetRemoteFollowersDtosAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null)
    {
        return await GetRemoteGraphDtosAsync(actor, limit, cursor, viewerId, "app.bsky.graph.getFollowers", "followers");
    }

    private async Task<List<UserDto>> MapUsersToDtosAsync(List<User> users, Guid? viewerId)
    {
        var statuses = viewerId.HasValue
            ? await GetInteractionStatusesAsync(viewerId.Value, users.Select(user => user.Id), refreshRemote: false)
            : new Dictionary<Guid, UserRelationshipStatusDto>();

        return users.Select(user =>
        {
            statuses.TryGetValue(user.Id, out var status);

            return new UserDto(
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
                status?.FollowingReference
            )
            {
                IsFollowing = status?.IsFollowing,
                IsFollowedBy = status?.IsFollowedBy,
                IsBlocking = status?.IsBlocking,
                IsBlockedBy = status?.IsBlockedBy,
                BlockingReference = status?.BlockingReference,
                IsMuted = status?.IsMuted,
            };
        }).ToList();
    }

    private async Task<(List<UserDto> Users, string? Cursor)> GetRemoteGraphDtosAsync(
        string actor,
        int limit,
        string? cursor,
        Guid? viewerId,
        string endpoint,
        string arrayProperty)
    {
        var targetUser = await ResolveRemoteProfileAsync(actor, viewerId: viewerId)
            ?? await GetUserByHandleAsync(actor)
            ?? await GetUserByDidAsync(actor);

        var targetDid = targetUser?.Did ?? actor;
        if (string.IsNullOrWhiteSpace(targetDid))
        {
            return (new List<UserDto>(), null);
        }

        async Task<HttpResponseMessage?> SendRequestAsync(string baseApiUrl, string? token)
        {
            var url = $"{baseApiUrl}/xrpc/{endpoint}?actor={Uri.EscapeDataString(targetDid)}&limit={limit}";
            if (!string.IsNullOrWhiteSpace(cursor))
            {
                url += $"&cursor={Uri.EscapeDataString(cursor)}";
            }

            _logger.LogInformation("[GetRemoteGraphDtosAsync] Requesting: {Url} (Auth: {HasAuth})", url, !string.IsNullOrWhiteSpace(token));

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            if (!string.IsNullOrWhiteSpace(token))
            {
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }

            return await client.GetAsync(url);
        }

        var token = viewerId.HasValue ? await GetOrRefreshBlueskyTokenAsync(viewerId.Value) : null;
        var response = await SendRequestAsync("https://public.api.bsky.app", null);
        string? content = null;

        // If public API returns no data or fails, and we have a token, try the authenticated API
        bool hasNoData = response == null || !response.IsSuccessStatusCode;
        
        if (!hasNoData && response != null)
        {
            content = await response.Content.ReadAsStringAsync();
            try
            {
                using var initialDoc = JsonDocument.Parse(content);
                var root = initialDoc.RootElement;
                if (root.TryGetProperty(arrayProperty, out var list) && list.GetArrayLength() == 0)
                {
                    hasNoData = true; // Signal retry if authenticated
                    _logger.LogInformation("[GetRemoteGraphDtosAsync] Public API returned 0 {ArrayProperty} for {Actor}. Content: {ContentSnippet}", arrayProperty, actor, content.Substring(0, Math.Min(content.Length, 100)));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[GetRemoteGraphDtosAsync] Failed to parse public API response. Retrying...");
                hasNoData = true;
            }
        }

        if (hasNoData && !string.IsNullOrWhiteSpace(token))
        {
            _logger.LogInformation("[GetRemoteGraphDtosAsync] Public API failed or empty. Retrying {Endpoint} with authenticated API for {Actor}.", endpoint, actor);
            response = await SendRequestAsync("https://api.bsky.app", token);
            content = null; // Clear out the old content so we re-read the new response
        }

        if (response == null || !response.IsSuccessStatusCode)
        {
            if (response != null)
            {
                var errContent = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[GetRemoteGraphDtosAsync] {Endpoint} failed: {StatusCode} - {ErrContent}", endpoint, response.StatusCode, errContent);
            }
            return (new List<UserDto>(), null);
        }

        if (content == null)
        {
            content = await response.Content.ReadAsStringAsync();
        }
        
        _logger.LogInformation("[GetRemoteGraphDtosAsync] Successful response from {Endpoint} for {Actor}. Items: {ContentSnippet}", endpoint, actor, content.Substring(0, Math.Min(content.Length, 200)));
        using var doc = JsonDocument.Parse(content);
        if (!doc.RootElement.TryGetProperty(arrayProperty, out var actorsProp) || actorsProp.ValueKind != JsonValueKind.Array)
        {
            return (new List<UserDto>(), null);
        }

        var nextCursor = doc.RootElement.TryGetProperty("cursor", out var cursorProp) ? cursorProp.GetString() : null;
        var actorEntries = actorsProp.EnumerateArray().ToList();
        var actorDids = actorEntries
            .Where(actorEntry => actorEntry.TryGetProperty("did", out var didProp) && !string.IsNullOrWhiteSpace(didProp.GetString()))
            .Select(actorEntry => actorEntry.GetProperty("did").GetString()!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (actorDids.Count > 0)
        {
            try
            {
                await MergeDuplicateUsersBatchAsync(actorDids);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[GetRemoteGraphDtosAsync] Database error during MergeDuplicateUsersBatchAsync. Continuing with remote data.");
            }
        }

        var users = new List<User>();
        var dtos = new List<UserDto>();
        var statusesByDid = new Dictionary<string, UserRelationshipStatusDto>(StringComparer.OrdinalIgnoreCase);
        var stubCache = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);

        if (viewerId.HasValue && actorDids.Count > 0)
        {
            try
            {
                statusesByDid = await FetchRemoteInteractionStatusesByDidAsync(viewerId.Value, actorDids);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[GetRemoteGraphDtosAsync] Database error during FetchRemoteInteractionStatusesByDidAsync. Interaction statuses may be missing.");
            }
        }

        foreach (var actorEntry in actorEntries)
        {
            try
            {
                var actorDid = actorEntry.TryGetProperty("did", out var didProp) ? didProp.GetString() : null;
                if (string.IsNullOrWhiteSpace(actorDid))
                {
                    continue;
                }

                UserRelationshipStatusDto? status = null;
                if (actorEntry.TryGetProperty("viewer", out var viewerProp) && viewerProp.ValueKind == JsonValueKind.Object)
                {
                    status = BuildInteractionStatusFromViewer(viewerProp);
                }
                else if (statusesByDid.TryGetValue(actorDid, out var fetchedStatus))
                {
                    status = fetchedStatus;
                }

                User? user = null;
                try
                {
                    user = await ResolveStubRemoteProfileAsync(actorEntry, stubCache, viewerId: viewerId, mergeDuplicates: false);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[GetRemoteGraphDtosAsync] Database error during ResolveStubRemoteProfileAsync for {Did}. Falling back to DTO-only mode.", actorDid);
                }
                if (user == null)
                {
                    dtos.Add(BuildRemoteGraphUserDto(actorEntry, status));
                    continue;
                }

                users.Add(user);
                dtos.Add(BuildRemoteGraphUserDto(user, actorEntry, status));
            }
            catch (Exception ex)
            {
                var actorDid = actorEntry.TryGetProperty("did", out var didProp) ? didProp.GetString() : null;
                _logger.LogWarning(ex, "Skipping remote graph actor {Did} while loading {Endpoint} for {TargetDid}", actorDid, endpoint, targetDid);
                try
                {
                    var actorDidFallback = actorEntry.TryGetProperty("did", out var didFallbackProp) ? didFallbackProp.GetString() : null;
                    if (!string.IsNullOrWhiteSpace(actorDidFallback))
                    {
                        statusesByDid.TryGetValue(actorDidFallback, out var fallbackStatus);
                        dtos.Add(BuildRemoteGraphUserDto(actorEntry, fallbackStatus));
                    }
                }
                catch
                {
                    // Ignore fallback DTO creation failures and keep the rest of the list.
                }
            }
        }

        try
        {
            await _unitOfWork.CompleteAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[GetRemoteGraphDtosAsync] Failed to complete unit of work. Remote users may not be fully cached locally.");
        }

        return (dtos, nextCursor);
    }

    private async Task<Dictionary<string, UserRelationshipStatusDto>> FetchRemoteInteractionStatusesByDidAsync(Guid viewerId, IEnumerable<string> dids)
    {
        var normalizedDids = dids
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (!normalizedDids.Any())
        {
            return new Dictionary<string, UserRelationshipStatusDto>(StringComparer.OrdinalIgnoreCase);
        }

        var token = await GetOrRefreshBlueskyTokenAsync(viewerId);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new Dictionary<string, UserRelationshipStatusDto>(StringComparer.OrdinalIgnoreCase);
        }

        using var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var result = new Dictionary<string, UserRelationshipStatusDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var batch in normalizedDids.Chunk(25))
        {
            var url = "https://api.bsky.app/xrpc/app.bsky.actor.getProfiles?" + string.Join("&", batch.Select(d => $"actors={Uri.EscapeDataString(d)}"));

            try
            {
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    continue;
                }

                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                if (!doc.RootElement.TryGetProperty("profiles", out var profilesProp) || profilesProp.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var profile in profilesProp.EnumerateArray())
                {
                    if (!profile.TryGetProperty("did", out var didProp))
                    {
                        continue;
                    }

                    var did = didProp.GetString();
                    if (string.IsNullOrWhiteSpace(did))
                    {
                        continue;
                    }

                    if (profile.TryGetProperty("viewer", out var viewerProp) && viewerProp.ValueKind == JsonValueKind.Object)
                    {
                        result[did] = BuildInteractionStatusFromViewer(viewerProp);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[FetchRemoteInteractionStatusesByDidAsync] Failed to fetch viewer statuses for viewer {ViewerId}", viewerId);
            }
        }

        return result;
    }

    private static UserDto BuildRemoteGraphUserDto(User user, JsonElement actorEntry, UserRelationshipStatusDto? status)
    {
        var handle = actorEntry.TryGetProperty("handle", out var handleProp) ? handleProp.GetString() : user.Handle;
        var displayName = actorEntry.TryGetProperty("displayName", out var displayNameProp) ? displayNameProp.GetString() : user.DisplayName;
        var avatar = actorEntry.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : user.AvatarUrl;
        var description = actorEntry.TryGetProperty("description", out var descriptionProp) ? descriptionProp.GetString() : user.Bio;
        var followersCount = TryGetActorCount(actorEntry, "followersCount") ?? user.FollowersCount;
        var followingCount = TryGetActorCount(actorEntry, "followsCount") ?? TryGetActorCount(actorEntry, "followingCount") ?? user.FollowingCount;
        var postsCount = TryGetActorCount(actorEntry, "postsCount") ?? user.PostsCount;
        var isVerified = actorEntry.TryGetProperty("associated", out var associatedProp)
            ? associatedProp.ValueKind == JsonValueKind.Object
            : user.IsVerified;

        return new UserDto(
            user.Id,
            user.Username,
            handle ?? user.Handle ?? user.Username,
            user.Email,
            displayName ?? user.DisplayName,
            avatar ?? user.AvatarUrl,
            user.CoverImageUrl,
            description ?? user.Bio,
            user.Location,
            user.Website,
            user.DateOfBirth,
            followersCount,
            followingCount,
            postsCount,
            user.Role,
            null,
            isVerified,
            user.Did,
            status?.FollowingReference
        )
        {
            IsFollowing = status?.IsFollowing,
            IsFollowedBy = status?.IsFollowedBy,
            IsBlocking = status?.IsBlocking,
            IsBlockedBy = status?.IsBlockedBy,
            IsMuted = status?.IsMuted,
            BlockingReference = status?.BlockingReference,
        };
    }

    private static UserDto BuildRemoteGraphUserDto(JsonElement actorEntry, UserRelationshipStatusDto? status)
    {
        var did = actorEntry.TryGetProperty("did", out var didProp) ? didProp.GetString() : null;
        var handle = actorEntry.TryGetProperty("handle", out var handleProp) ? handleProp.GetString() : null;
        var displayName = actorEntry.TryGetProperty("displayName", out var displayNameProp) ? displayNameProp.GetString() : null;
        var avatar = actorEntry.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : null;
        var description = actorEntry.TryGetProperty("description", out var descriptionProp) ? descriptionProp.GetString() : null;
        var followersCount = TryGetActorCount(actorEntry, "followersCount");
        var followingCount = TryGetActorCount(actorEntry, "followsCount") ?? TryGetActorCount(actorEntry, "followingCount");
        var postsCount = TryGetActorCount(actorEntry, "postsCount");
        var username = !string.IsNullOrWhiteSpace(handle) ? handle.Split('.')[0] : (did ?? Guid.NewGuid().ToString("N"));
        var stableIdSource = did ?? handle ?? username;

        return new UserDto(
            CreateDeterministicGuid(stableIdSource),
            username,
            handle ?? username,
            $"{stableIdSource}@remote.bsky.social",
            displayName ?? handle ?? username,
            avatar,
            null,
            description,
            null,
            null,
            null,
            followersCount,
            followingCount,
            postsCount,
            "user",
            null,
            actorEntry.TryGetProperty("associated", out var associatedProp) && associatedProp.ValueKind == JsonValueKind.Object,
            did,
            status?.FollowingReference
        )
        {
            IsFollowing = status?.IsFollowing,
            IsFollowedBy = status?.IsFollowedBy,
            IsBlocking = status?.IsBlocking,
            IsBlockedBy = status?.IsBlockedBy,
            IsMuted = status?.IsMuted,
            BlockingReference = status?.BlockingReference,
        };
    }

    private static int? TryGetActorCount(JsonElement actorEntry, string propertyName)
    {
        if (!actorEntry.TryGetProperty(propertyName, out var countProp))
        {
            return null;
        }

        if (countProp.ValueKind == JsonValueKind.Number && countProp.TryGetInt32(out var count))
        {
            return count;
        }

        return null;
    }

    private static Guid CreateDeterministicGuid(string value)
    {
        using var md5 = MD5.Create();
        var bytes = md5.ComputeHash(Encoding.UTF8.GetBytes(value));
        return new Guid(bytes);
    }

    private async Task<(List<User> Users, string? Cursor)> GetRemoteFollowingAsync(string did, int limit, string? cursor, Guid? viewerId = null)
    {
        var cacheKey = $"remote_follows:{did}:{limit}:{cursor}";
        var cached = await _cacheService.GetAsync<RemoteFollowsResult>(cacheKey);
        
        if (cached == null)
        {
            string baseApiUrl = "https://api.bsky.app";
            var token = viewerId.HasValue ? await GetOrRefreshBlueskyTokenAsync(viewerId.Value) : null;
            if (string.IsNullOrEmpty(token)) baseApiUrl = "https://public.api.bsky.app";

            var url = $"{baseApiUrl}/xrpc/app.bsky.graph.getFollows?actor={did}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            using var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            if (!string.IsNullOrEmpty(token)) client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var follows = doc.RootElement.GetProperty("follows");
                var nextCursor = doc.RootElement.TryGetProperty("cursor", out var cp) ? cp.GetString() : null;

                var actorEntries = follows.EnumerateArray().ToList();
                var actorDids = actorEntries
                    .Where(actor => actor.TryGetProperty("did", out var didProp) && !string.IsNullOrWhiteSpace(didProp.GetString()))
                    .Select(actor => actor.GetProperty("did").GetString()!)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (actorDids.Count > 0)
                {
                    await MergeDuplicateUsersBatchAsync(actorDids);
                }

                var users = new List<User>();
                var stubCache = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);
                foreach (var actor in actorEntries)
                {
                    try
                    {
                        var u = await ResolveStubRemoteProfileAsync(actor, stubCache, viewerId: viewerId, mergeDuplicates: false);
                        if (u != null) users.Add(u);
                    }
                    catch (Exception ex)
                    {
                        var actorDid = actor.TryGetProperty("did", out var didProp) ? didProp.GetString() : null;
                        _logger.LogWarning(ex, "Skipping remote following actor {Did} while loading follows for {TargetDid}", actorDid, did);
                    }
                }

                await _unitOfWork.CompleteAsync();

                cached = new RemoteFollowsResult
                {
                    Users = users,
                    Cursor = nextCursor,
                    Dids = users
                        .Select(u => u.Did)
                        .Where(d => !string.IsNullOrWhiteSpace(d))
                        .Cast<string>()
                        .ToList()
                };
                await _cacheService.SetAsync(cacheKey, cached, TimeSpan.FromMinutes(10));
            }
        }

        if (cached != null)
        {
            if (viewerId.HasValue)
            {
                var cachedDids = cached.Dids
                    .Where(d => !string.IsNullOrWhiteSpace(d))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (!cachedDids.Any())
                {
                    return (cached.Users.Where(u => !string.IsNullOrWhiteSpace(u.Did)).ToList(), cached.Cursor);
                }

                await MergeDuplicateUsersBatchAsync(cachedDids);
                var refreshedUsers = await _unitOfWork.Users.GetByDidsAsync(cachedDids);
                var refreshedMap = refreshedUsers
                    .Where(u => !string.IsNullOrEmpty(u.Did))
                    .GroupBy(u => u.Did.ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.OrderBy(u => u.CreatedAt).First());
                var orderedUsers = cachedDids
                    .Where(d => !string.IsNullOrEmpty(d))
                    .Select(d => refreshedMap.GetValueOrDefault(d.ToLowerInvariant()))
                    .Where(u => u != null)
                    .Cast<User>()
                    .ToList();
                return (orderedUsers, cached.Cursor);
            }
            return (cached.Users, cached.Cursor);
        }

        return (new List<User>(), null);
    }

    private async Task<(List<User> Users, string? Cursor)> GetRemoteFollowersAsync(string did, int limit, string? cursor, Guid? viewerId = null)
    {
        var cacheKey = $"remote_followers:{did}:{limit}:{cursor}";
        var cached = await _cacheService.GetAsync<RemoteFollowsResult>(cacheKey);

        if (cached == null)
        {
            string baseApiUrl = "https://api.bsky.app";
            var token = viewerId.HasValue ? await GetOrRefreshBlueskyTokenAsync(viewerId.Value) : null;
            if (string.IsNullOrEmpty(token)) baseApiUrl = "https://public.api.bsky.app";

            var url = $"{baseApiUrl}/xrpc/app.bsky.graph.getFollowers?actor={did}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            using var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            if (!string.IsNullOrEmpty(token)) client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await client.GetAsync(url);
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var followers = doc.RootElement.GetProperty("followers");
                var nextCursor = doc.RootElement.TryGetProperty("cursor", out var cp) ? cp.GetString() : null;

                var actorEntries = followers.EnumerateArray().ToList();
                var actorDids = actorEntries
                    .Where(actor => actor.TryGetProperty("did", out var didProp) && !string.IsNullOrWhiteSpace(didProp.GetString()))
                    .Select(actor => actor.GetProperty("did").GetString()!)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (actorDids.Count > 0)
                {
                    await MergeDuplicateUsersBatchAsync(actorDids);
                }

                var users = new List<User>();
                var stubCache = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);
                foreach (var actor in actorEntries)
                {
                    try
                    {
                        var u = await ResolveStubRemoteProfileAsync(actor, stubCache, viewerId: viewerId, mergeDuplicates: false);
                        if (u != null) users.Add(u);
                    }
                    catch (Exception ex)
                    {
                        var actorDid = actor.TryGetProperty("did", out var didProp) ? didProp.GetString() : null;
                        _logger.LogWarning(ex, "Skipping remote follower actor {Did} while loading followers for {TargetDid}", actorDid, did);
                    }
                }

                await _unitOfWork.CompleteAsync();

                cached = new RemoteFollowsResult
                {
                    Users = users,
                    Cursor = nextCursor,
                    Dids = users
                        .Select(u => u.Did)
                        .Where(d => !string.IsNullOrWhiteSpace(d))
                        .Cast<string>()
                        .ToList()
                };
                await _cacheService.SetAsync(cacheKey, cached, TimeSpan.FromMinutes(10));
            }
        }

        if (cached != null)
        {
            if (viewerId.HasValue)
            {
                var cachedDids = cached.Dids
                    .Where(d => !string.IsNullOrWhiteSpace(d))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                if (!cachedDids.Any())
                {
                    return (cached.Users.Where(u => !string.IsNullOrWhiteSpace(u.Did)).ToList(), cached.Cursor);
                }

                await MergeDuplicateUsersBatchAsync(cachedDids);
                var refreshedUsers = await _unitOfWork.Users.GetByDidsAsync(cachedDids);
                var refreshedMap = refreshedUsers
                    .Where(u => !string.IsNullOrEmpty(u.Did))
                    .GroupBy(u => u.Did.ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.OrderBy(u => u.CreatedAt).First());
                var orderedUsers = cachedDids
                    .Where(d => !string.IsNullOrEmpty(d))
                    .Select(d => refreshedMap.GetValueOrDefault(d.ToLowerInvariant()))
                    .Where(u => u != null)
                    .Cast<User>()
                    .ToList();
                return (orderedUsers, cached.Cursor);
            }
            return (cached.Users, cached.Cursor);
        }

        return (new List<User>(), null);
    }

    public async Task<User?> ResolveStubRemoteProfileAsync(JsonElement actorData, Dictionary<string, User> cache, bool complete = true, Guid? viewerId = null, bool mergeDuplicates = true)
    {
        if (!actorData.TryGetProperty("did", out var didProp))
        {
            return null;
        }

        var did = didProp.GetString();
        if (string.IsNullOrEmpty(did)) return null;

        if (cache.TryGetValue(did, out var cached)) return cached;

        if (mergeDuplicates)
        {
            await MergeDuplicateUsersAsync(did);
        }
        var user = await _unitOfWork.Users.Query()
            .Where(u => u.Did == did)
            .OrderBy(u => u.CreatedAt)
            .FirstOrDefaultAsync();
        var handle = actorData.TryGetProperty("handle", out var handleProp) ? handleProp.GetString() : null;
        var displayName = actorData.TryGetProperty("displayName", out var displayNameProp) ? displayNameProp.GetString() : null;
        var avatar = actorData.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : null;
        var description = actorData.TryGetProperty("description", out var descriptionProp) ? descriptionProp.GetString() : null;

        if (user == null)
        {
            var username = handle?.Split('.')[0] ?? did;
            user = new User
            {
                Id = Guid.NewGuid(),
                Did = did,
                Username = username,
                CreatedAt = DateTime.UtcNow,
                PasswordHash = "REMOTE_USER",
                Salt = "REMOTE_USER",
                Email = $"{did}@remote.bsky.social"
            };
            await _unitOfWork.Users.AddAsync(user);
        }

        if (!string.IsNullOrWhiteSpace(handle))
        {
            user.Handle = handle;
        }

        if (string.IsNullOrWhiteSpace(user.Username))
        {
            user.Username = handle?.Split('.')[0] ?? did;
        }

        user.DisplayName = displayName;
        user.AvatarUrl = avatar;
        user.Bio = description;
        if (actorData.TryGetProperty("followersCount", out var followersCountProp) && followersCountProp.TryGetInt32(out var followersCount))
        {
            user.FollowersCount = followersCount;
        }
        if (actorData.TryGetProperty("followsCount", out var followsCountProp) && followsCountProp.TryGetInt32(out var followingCount))
        {
            user.FollowingCount = followingCount;
        }
        else if (actorData.TryGetProperty("followingCount", out var followingCountProp) && followingCountProp.TryGetInt32(out followingCount))
        {
            user.FollowingCount = followingCount;
        }
        if (actorData.TryGetProperty("postsCount", out var postsCountProp) && postsCountProp.TryGetInt32(out var postsCount))
        {
            user.PostsCount = postsCount;
        }
        user.IsVerified = true;

        _unitOfWork.Users.Update(user);

        if (viewerId.HasValue && actorData.TryGetProperty("viewer", out var viewerProp))
        {
            await SyncRelationshipStatusWithAtProtoAsync(viewerId.Value, user, viewerProp);
        }

        cache[did] = user;
        return user;
    }

    public async Task<UserFollow?> GetFollowAsync(Guid followerId, Guid followingId) => await _unitOfWork.Follows.GetAsync(followerId, followingId);
    public async Task<BlockedAccount?> GetBlockAsync(Guid userId, Guid blockedUserId) => await _unitOfWork.Blocks.Query().FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);
    public async Task<MutedByListDto?> GetMutingListAsync(Guid viewerId, Guid targetUserId) => null; // Placeholder
    public async Task<IEnumerable<User>> SearchActorsRemoteAsync(string query, string token, int skip = 0, int take = 20, Guid? viewerId = null) => new List<User>();
    public async Task<List<MutedWord>> GetMutedWordsAsync(Guid userId) => await _unitOfWork.MutedWords.Query()
        .Where(m => m.UserId == userId)
        .OrderByDescending(m => m.CreatedAt)
        .ThenByDescending(m => m.Id)
        .ToListAsync();
    
    public async Task<MutedWord> AddMutedWordAsync(Guid userId, string word, string behavior, string targets = "content", DateTime? expiresAt = null, bool excludeFollowing = false) {
        var normalizedWord = word.Trim();
        var normalizedBehavior = string.Equals(behavior, "warn", StringComparison.OrdinalIgnoreCase) ? "warn" : "hide";
        var normalizedTargets = string.IsNullOrWhiteSpace(targets) ? "content" : targets.Trim().ToLowerInvariant();

        var mw = new MutedWord { 
            UserId = userId, 
            Word = normalizedWord, 
            MuteBehavior = normalizedBehavior, 
            Targets = normalizedTargets, 
            ExpiresAt = expiresAt,
            ExcludeFollowing = excludeFollowing,
            CreatedAt = DateTime.UtcNow 
        };
        await _unitOfWork.MutedWords.AddAsync(mw);
        await _unitOfWork.CompleteAsync();
        return mw;
    }
    
    public async Task<bool> DeleteMutedWordAsync(Guid userId, int mutedWordId) {
        var mw = await _unitOfWork.MutedWords.Query().FirstOrDefaultAsync(m => m.Id == mutedWordId && m.UserId == userId);
        if (mw == null) return false;
        _unitOfWork.MutedWords.Remove(mw);
        await _unitOfWork.CompleteAsync();
        return true;
    }
    
    public async Task<bool> UpdateHandleAsync(Guid userId, string newHandle) {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return false;
        user.Handle = newHandle;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();
        return true;
    }
    
    public async Task<List<User>> GetSuggestedUsersAsync(int limit = 10) => await _unitOfWork.Users.Query().Take(limit).ToListAsync();
    public async Task SyncMutedWordsWithAtProtoAsync(Guid userId) { }


    public async Task<string?> FollowUserAsync(Guid followerId, Guid followingId)
    {
        var followerUser = await _unitOfWork.Users.GetByIdAsync(followerId);
        var targetUser = await _unitOfWork.Users.GetByIdAsync(followingId);
        if (followerUser == null || targetUser == null) return null;

        var existing = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (existing != null)
        {
            if (string.IsNullOrWhiteSpace(existing.Tid))
            {
                existing.Tid = existing.Uri?.Split('/').Last() ?? GenerateTid();
                _unitOfWork.Follows.Update(existing);
                await _unitOfWork.CompleteAsync();
            }

            if (string.IsNullOrWhiteSpace(existing.Uri) && !string.IsNullOrWhiteSpace(followerUser.Did))
            {
                existing.Uri = $"at://{followerUser.Did}/app.bsky.graph.follow/{existing.Tid}";
                _unitOfWork.Follows.Update(existing);
                await _unitOfWork.CompleteAsync();
            }

            return existing.Uri;
        }

        var follow = new UserFollow
        {
            FollowerId = followerId,
            FollowingId = followingId,
            CreatedAt = DateTime.UtcNow,
            Tid = GenerateTid()
        };

        var shouldSyncToAtProto =
            !string.IsNullOrWhiteSpace(followerUser.Did) &&
            !followerUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(targetUser.Did) &&
            !targetUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (shouldSyncToAtProto)
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(followerId);
                if (string.IsNullOrWhiteSpace(token))
                {
                    _logger.LogWarning("[FollowUserAsync] Missing Bluesky token for follower {FollowerId}", followerId);
                    return null;
                }

                var requestBody = new Dictionary<string, object?>
                {
                    ["repo"] = followerUser.Did,
                    ["collection"] = "app.bsky.graph.follow",
                    ["record"] = new Dictionary<string, object?>
                    {
                        ["$type"] = "app.bsky.graph.follow",
                        ["subject"] = targetUser.Did,
                        ["createdAt"] = follow.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O")
                    }
                };

                var result = await _xrpcProxy.ProxyRequestAsync(
                    followerUser.Did,
                    "com.atproto.repo.createRecord",
                    new Dictionary<string, string?>(),
                    token,
                    "POST",
                    requestBody,
                    followerId
                );

                if (!result.Success)
                {
                    _logger.LogWarning(
                        "[FollowUserAsync] Bluesky follow createRecord failed for follower {FollowerDid} -> target {TargetDid}. Status: {Status}, Body: {Body}",
                        followerUser.Did,
                        targetUser.Did,
                        result.StatusCode,
                        result.Content
                    );
                    return null;
                }

                using var doc = JsonDocument.Parse(result.Content);
                follow.Uri = doc.RootElement.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() : null;
                follow.Cid = doc.RootElement.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() : null;
                follow.Tid = follow.Uri?.Split('/').Last() ?? follow.Tid;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[FollowUserAsync] Error creating Bluesky follow for follower {FollowerId} and target {TargetId}", followerId, followingId);
                return null;
            }
        }
        else if (!string.IsNullOrWhiteSpace(followerUser.Did))
        {
            follow.Uri = $"at://{followerUser.Did}/app.bsky.graph.follow/{follow.Tid}";
        }

        await _unitOfWork.Follows.AddOrUpdateAsync(follow);
        
        // Update counts
        followerUser.FollowingCount = (followerUser.FollowingCount ?? 0) + 1;
        targetUser.FollowersCount = (targetUser.FollowersCount ?? 0) + 1;

        await _unitOfWork.CompleteAsync();
        return follow.Uri ?? (!string.IsNullOrWhiteSpace(followerUser.Did) ? $"at://{followerUser.Did}/app.bsky.graph.follow/{follow.Tid}" : null);
    }

    public async Task<bool> UnfollowUserAsync(Guid followerId, Guid followingId)
    {
        var follow = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (follow == null) return true;

        var followerUser = await _unitOfWork.Users.GetByIdAsync(followerId);
        var targetUser = await _unitOfWork.Users.GetByIdAsync(followingId);
        var shouldSyncToAtProto =
            followerUser != null &&
            !string.IsNullOrWhiteSpace(followerUser.Did) &&
            !followerUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase) &&
            targetUser != null &&
            !string.IsNullOrWhiteSpace(targetUser.Did) &&
            !targetUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (shouldSyncToAtProto)
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(followerId);
                if (string.IsNullOrWhiteSpace(token))
                {
                    _logger.LogWarning("[UnfollowUserAsync] Missing Bluesky token for follower {FollowerId}", followerId);
                    return false;
                }

                var followTid = follow.Tid;
                if (string.IsNullOrWhiteSpace(followTid) && !string.IsNullOrWhiteSpace(follow.Uri))
                {
                    followTid = follow.Uri.Split('/').Last();
                }

                if (string.IsNullOrWhiteSpace(followTid))
                {
                    _logger.LogWarning("[UnfollowUserAsync] Missing follow record key for follower {FollowerId} and target {TargetId}", followerId, followingId);
                    return false;
                }

                var result = await _xrpcProxy.ProxyRequestAsync(
                    followerUser!.Did,
                    "com.atproto.repo.deleteRecord",
                    new Dictionary<string, string?>(),
                    token,
                    "POST",
                    new Dictionary<string, object?>
                    {
                        ["repo"] = followerUser.Did,
                        ["collection"] = "app.bsky.graph.follow",
                        ["rkey"] = followTid
                    },
                    followerId
                );

                if (!result.Success)
                {
                    _logger.LogWarning(
                        "[UnfollowUserAsync] Bluesky follow deleteRecord failed for follower {FollowerDid} -> target {TargetDid}. Status: {Status}, Body: {Body}",
                        followerUser.Did,
                        targetUser!.Did,
                        result.StatusCode,
                        result.Content
                    );
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[UnfollowUserAsync] Error deleting Bluesky follow for follower {FollowerId} and target {TargetId}", followerId, followingId);
                return false;
            }
        }

        _unitOfWork.Follows.Remove(follow);
        
        if (followerUser != null) followerUser.FollowingCount = Math.Max(0, (followerUser.FollowingCount ?? 0) - 1);
        if (targetUser != null) targetUser.FollowersCount = Math.Max(0, (targetUser.FollowersCount ?? 0) - 1);

        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> BlockUserAsync(Guid userId, Guid targetUserId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        var target = await _unitOfWork.Users.GetByIdAsync(targetUserId);

        if (user == null || target == null) return false;

        var existing = await _unitOfWork.Blocks.Query()
            .FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == targetUserId);
        
        if (existing != null) return true;

        var block = new BlockedAccount 
        { 
            UserId = userId, 
            BlockedUserId = targetUserId, 
            CreatedAt = DateTime.UtcNow,
            Tid = GenerateTid()
        };

        var shouldSyncToAtProto =
            !string.IsNullOrWhiteSpace(user.Did) &&
            !user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(target.Did) &&
            !target.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (shouldSyncToAtProto)
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(userId);
                if (!string.IsNullOrWhiteSpace(token))
                {
                    var requestBody = new Dictionary<string, object?>
                    {
                        ["repo"] = user.Did,
                        ["collection"] = "app.bsky.graph.block",
                        ["record"] = new Dictionary<string, object?>
                        {
                            ["$type"] = "app.bsky.graph.block",
                            ["subject"] = target.Did,
                            ["createdAt"] = block.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O")
                        }
                    };

                    var result = await _xrpcProxy.ProxyRequestAsync(
                        user.Did,
                        "com.atproto.repo.createRecord",
                        new Dictionary<string, string?>(),
                        token,
                        "POST",
                        requestBody,
                        userId
                    );

                    if (result.Success)
                    {
                        using var doc = JsonDocument.Parse(result.Content);
                        block.Uri = doc.RootElement.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() : null;
                        block.Cid = doc.RootElement.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() : null;
                        block.Tid = block.Uri?.Split('/').Last() ?? block.Tid;
                    }
                    else
                    {
                        _logger.LogWarning("[BlockUserAsync] ATProto block failed: {Status}, {Body}", result.StatusCode, result.Content);
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[BlockUserAsync] Error syncing block for user {UserId} -> {TargetId}", userId, targetUserId);
                return false;
            }
        }
        else if (!string.IsNullOrWhiteSpace(user.Did))
        {
            block.Uri = $"at://{user.Did}/app.bsky.graph.block/{block.Tid}";
        }

        await _unitOfWork.Blocks.AddAsync(block);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UnblockUserAsync(Guid userId, Guid targetUserId)
    {
        var block = await _unitOfWork.Blocks.Query()
            .FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == targetUserId);
        
        if (block == null) return true;

        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        var target = await _unitOfWork.Users.GetByIdAsync(targetUserId);

        var shouldSyncToAtProto =
            user != null && !string.IsNullOrWhiteSpace(user.Did) &&
            !user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase) &&
            target != null && !string.IsNullOrWhiteSpace(target.Did) &&
            !target.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (shouldSyncToAtProto)
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(userId);
                var rkey = block.Tid ?? block.Uri?.Split('/').Last();

                if (!string.IsNullOrWhiteSpace(token) && !string.IsNullOrWhiteSpace(rkey))
                {
                    var result = await _xrpcProxy.ProxyRequestAsync(
                        user!.Did,
                        "com.atproto.repo.deleteRecord",
                        new Dictionary<string, string?>(),
                        token,
                        "POST",
                        new Dictionary<string, object?>
                        {
                            ["repo"] = user.Did,
                            ["collection"] = "app.bsky.graph.block",
                            ["rkey"] = rkey
                        },
                        userId
                    );

                    if (!result.Success)
                    {
                        _logger.LogWarning("[UnblockUserAsync] ATProto unblock failed: {Status}, {Body}", result.StatusCode, result.Content);
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[UnblockUserAsync] Error syncing unblock for user {UserId} -> {TargetId}", userId, targetUserId);
                return false;
            }
        }

        _unitOfWork.Blocks.Remove(block);
        await _unitOfWork.CompleteAsync();
        return true;
    }


    public async Task<bool> MuteUserAsync(Guid userId, Guid targetUserId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        var target = await _unitOfWork.Users.GetByIdAsync(targetUserId);

        if (user == null || target == null) return false;

        var existing = await _unitOfWork.Mutes.IsMutedAsync(userId, targetUserId);
        if (existing) return true;

        var shouldSyncToAtProto =
            !string.IsNullOrWhiteSpace(user.Did) &&
            !user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(target.Did) &&
            !target.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (shouldSyncToAtProto)
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(userId);
                if (!string.IsNullOrWhiteSpace(token))
                {
                    var result = await _xrpcProxy.ProxyRequestAsync(
                        user.Did,
                        "app.bsky.graph.muteActor",
                        new Dictionary<string, string?>(),
                        token,
                        "POST",
                        new Dictionary<string, object?> { ["actor"] = target.Did }
                    );

                    if (!result.Success)
                    {
                        _logger.LogWarning("[MuteUserAsync] ATProto mute failed: {Status}, {Body}", result.StatusCode, result.Content);
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[MuteUserAsync] Error syncing mute for user {UserId} -> {TargetId}", userId, targetUserId);
                return false;
            }
        }

        var mute = new MutedAccount { UserId = userId, MutedUserId = targetUserId, CreatedAt = DateTime.UtcNow };
        await _unitOfWork.Mutes.AddAsync(mute);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UnmuteUserAsync(Guid userId, Guid targetUserId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        var target = await _unitOfWork.Users.GetByIdAsync(targetUserId);

        if (user == null || target == null) return false;

        var mute = await _unitOfWork.Mutes.Query().FirstOrDefaultAsync(m => m.UserId == userId && m.MutedUserId == targetUserId);
        if (mute == null) return true;

        var shouldSyncToAtProto =
            !string.IsNullOrWhiteSpace(user.Did) &&
            !user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase) &&
            !string.IsNullOrWhiteSpace(target.Did) &&
            !target.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (shouldSyncToAtProto)
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(userId);
                if (!string.IsNullOrWhiteSpace(token))
                {
                    var result = await _xrpcProxy.ProxyRequestAsync(
                        user.Did,
                        "app.bsky.graph.unmuteActor",
                        new Dictionary<string, string?>(),
                        token,
                        "POST",
                        new Dictionary<string, object?> { ["actor"] = target.Did }
                    );

                    if (!result.Success)
                    {
                        _logger.LogWarning("[UnmuteUserAsync] ATProto unmute failed: {Status}, {Body}", result.StatusCode, result.Content);
                        return false;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[UnmuteUserAsync] Error syncing unmute for user {UserId} -> {TargetId}", userId, targetUserId);
                return false;
            }
        }

        _unitOfWork.Mutes.Remove(mute);
        await _unitOfWork.CompleteAsync();
        return true;
    }


    public async Task<(List<User> Users, string? Cursor)> GetMutedUsersAsync(Guid userId, int limit = 50, string? cursor = null)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user != null && !string.IsNullOrWhiteSpace(user.Did) && !user.Did.StartsWith("did:local:"))
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(userId);
                if (!string.IsNullOrWhiteSpace(token))
                {
                    var url = $"https://api.bsky.app/xrpc/app.bsky.graph.getMutes?limit={limit}";
                    if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

                    using var client = _httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var response = await client.GetAsync(url);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(content);
                        var mutes = doc.RootElement.GetProperty("mutes");
                        var nextCursor = doc.RootElement.TryGetProperty("cursor", out var cp) ? cp.GetString() : null;

                        var users = new List<User>();
                        var stubCache = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);
                        foreach (var actor in mutes.EnumerateArray())
                        {
                            var u = await ResolveStubRemoteProfileAsync(actor, stubCache, viewerId: userId);
                            if (u != null) users.Add(u);
                        }
                        await _unitOfWork.CompleteAsync();
                        return (users, nextCursor);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GetMutedUsersAsync] Error fetching remote mutes for user {UserId}", userId);
            }
        }

        var localMutes = await _unitOfWork.Mutes.Query()
            .Include(m => m.MutedUser)
            .Where(m => m.UserId == userId)
            .Take(limit)
            .ToListAsync();
        return (localMutes.Select(m => m.MutedUser).ToList(), null);
    }

    public async Task<(List<User> Users, string? Cursor)> GetBlockedUsersAsync(Guid userId, int limit = 50, string? cursor = null)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user != null && !string.IsNullOrWhiteSpace(user.Did) && !user.Did.StartsWith("did:local:"))
        {
            try
            {
                var token = await GetOrRefreshBlueskyTokenAsync(userId);
                if (!string.IsNullOrWhiteSpace(token))
                {
                    var url = $"https://api.bsky.app/xrpc/app.bsky.graph.getBlocks?limit={limit}";
                    if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

                    using var client = _httpClientFactory.CreateClient();
                    client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                    client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    var response = await client.GetAsync(url);
                    if (response.IsSuccessStatusCode)
                    {
                        var content = await response.Content.ReadAsStringAsync();
                        using var doc = JsonDocument.Parse(content);
                        var blocks = doc.RootElement.GetProperty("blocks");
                        var nextCursor = doc.RootElement.TryGetProperty("cursor", out var cp) ? cp.GetString() : null;

                        var users = new List<User>();
                        var stubCache = new Dictionary<string, User>(StringComparer.OrdinalIgnoreCase);
                        foreach (var actor in blocks.EnumerateArray())
                        {
                            var u = await ResolveStubRemoteProfileAsync(actor, stubCache, viewerId: userId);
                            if (u != null) users.Add(u);
                        }
                        await _unitOfWork.CompleteAsync();
                        return (users, nextCursor);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[GetBlockedUsersAsync] Error fetching remote blocks for user {UserId}", userId);
            }
        }

        var localBlocks = await _unitOfWork.Blocks.Query()
            .Include(b => b.BlockedUser)
            .Where(b => b.UserId == userId)
            .Take(limit)
            .ToListAsync();
        return (localBlocks.Select(b => b.BlockedUser).ToList(), null);
    }


    public async Task<Dictionary<Guid, UserRelationshipStatusDto>> GetInteractionStatusesAsync(Guid viewerId, IEnumerable<Guid> targetIds, bool refreshRemote = true)
    {
        var targetIdList = targetIds.Distinct().ToList();
        if (!targetIdList.Any()) return new Dictionary<Guid, UserRelationshipStatusDto>();

        var targetUsers = await _unitOfWork.Users.Query()
            .Where(u => targetIdList.Contains(u.Id))
            .Select(u => new User
            {
                Id = u.Id,
                Did = u.Did,
                Handle = u.Handle
            })
            .ToListAsync();

        var remoteStatusMap = refreshRemote
            ? await FetchRemoteInteractionStatusesAsync(viewerId, targetUsers)
            : new Dictionary<Guid, UserRelationshipStatusDto>();

        // 1. Fetch Follows (viewer follows target)
        var follows = await _unitOfWork.Follows.Query()
            .Where(f => f.FollowerId == viewerId && targetIdList.Contains(f.FollowingId))
            .ToListAsync();

        var followsMap = follows
        .GroupBy(f => f.FollowingId)
        .ToDictionary(g => g.Key, g => g.First());

        // 2. Fetch Blocks (viewer blocks target)
        var blocking = await _unitOfWork.Blocks.Query()
            .Where(b => b.UserId == viewerId && targetIdList.Contains(b.BlockedUserId))
            .ToListAsync();
            
        var blockingMap = blocking
        .GroupBy(b => b.BlockedUserId)
        .ToDictionary(g => g.Key, g => g.First());

        // 3. Fetch BlockedBy (target blocks viewer)
        var blockedBy = await _unitOfWork.Blocks.Query()
            .Where(b => b.BlockedUserId == viewerId && targetIdList.Contains(b.UserId))
            .Select(b => b.UserId)
            .ToListAsync();

        // 4. Fetch FollowedBy (target follows viewer)
        var followedBy = await _unitOfWork.Follows.Query()
            .Where(f => f.FollowingId == viewerId && targetIdList.Contains(f.FollowerId))
            .Select(f => f.FollowerId)
            .ToListAsync();

        // 5. Fetch Mutes (viewer mutes target)
        var mutes = await _unitOfWork.Mutes.Query()
            .Where(m => m.UserId == viewerId && targetIdList.Contains(m.MutedUserId))
            .Select(m => m.MutedUserId)
            .ToListAsync();

        var result = new Dictionary<Guid, UserRelationshipStatusDto>();
        foreach (var id in targetIdList)
        {
            var dbStatus = new UserRelationshipStatusDto(
                IsFollowing: followsMap.ContainsKey(id),
                IsFollowedBy: followedBy.Contains(id),
                IsBlocking: blockingMap.ContainsKey(id),
                IsBlockedBy: blockedBy.Contains(id),
                IsMuted: mutes.Contains(id),
                FollowingReference: followsMap.TryGetValue(id, out var f) ? f.Uri : null,
                BlockingReference: blockingMap.TryGetValue(id, out var b) ? b.Uri : null
            );

            result[id] = remoteStatusMap.TryGetValue(id, out var remoteStatus)
                ? remoteStatus
                : dbStatus;
        }

        return result;
    }

    public async Task<Dictionary<string, UserRelationshipStatusDto>> GetInteractionStatusesByDidsAsync(Guid viewerId, IEnumerable<string> dids)
    {
        var didList = dids
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var result = new Dictionary<string, UserRelationshipStatusDto>(StringComparer.OrdinalIgnoreCase);
        if (!didList.Any()) return result;

        // Try to enrich from AppView if viewer has a token
        var token = await GetOrRefreshBlueskyTokenAsync(viewerId);
        if (!string.IsNullOrWhiteSpace(token))
        {
            using var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            foreach (var batch in didList.Chunk(25))
            {
                var url = "https://api.bsky.app/xrpc/app.bsky.actor.getProfiles?" +
                          string.Join("&", batch.Select(d => $"actors={Uri.EscapeDataString(d)}"));
                try
                {
                    var response = await client.GetAsync(url);
                    if (!response.IsSuccessStatusCode) continue;
                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = System.Text.Json.JsonDocument.Parse(content);
                    if (!doc.RootElement.TryGetProperty("profiles", out var profilesProp)) continue;
                    foreach (var profile in profilesProp.EnumerateArray())
                    {
                        if (!profile.TryGetProperty("did", out var didProp)) continue;
                        var did = didProp.GetString();
                        if (string.IsNullOrEmpty(did)) continue;
                        var status = profile.TryGetProperty("viewer", out var viewerProp)
                            ? BuildInteractionStatusFromViewer(viewerProp)
                            : new UserRelationshipStatusDto(false, false, false, false, false, null, null);
                        result[did] = status;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[GetInteractionStatusesByDidsAsync] Batch fetch failed for viewer {ViewerId}", viewerId);
                }
            }
        }

        // For DIDs not returned by AppView, fall back to local DB
        var missing = didList.Where(d => !result.ContainsKey(d)).ToList();
        if (missing.Any())
        {
            var localUsers = await _unitOfWork.Users.Query()
                .Where(u => missing.Contains(u.Did!))
                .Select(u => new { u.Id, u.Did })
                .ToListAsync();

            if (localUsers.Any())
            {
                var localIds = localUsers.Select(u => u.Id).ToList();
                var localStatuses = await GetInteractionStatusesAsync(viewerId, localIds, refreshRemote: false);
                foreach (var lu in localUsers)
                {
                    if (!string.IsNullOrEmpty(lu.Did) && localStatuses.TryGetValue(lu.Id, out var s))
                        result[lu.Did] = s;
                }
            }
        }

        return result;
    }

    private async Task<Dictionary<Guid, UserRelationshipStatusDto>> FetchRemoteInteractionStatusesAsync(Guid viewerId, IEnumerable<User> targetUsers)
    {
        var remoteTargets = targetUsers
            .Where(u =>
                u.Id != viewerId &&
                !string.IsNullOrWhiteSpace(u.Did) &&
                !(u.Handle?.EndsWith($".{_config["DomainName"]}", StringComparison.OrdinalIgnoreCase) ?? false))
            .GroupBy(u => u.Did!, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        if (!remoteTargets.Any())
        {
            return new Dictionary<Guid, UserRelationshipStatusDto>();
        }

        var token = await GetOrRefreshBlueskyTokenAsync(viewerId);
        if (string.IsNullOrWhiteSpace(token))
        {
            return new Dictionary<Guid, UserRelationshipStatusDto>();
        }

        using var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var result = new Dictionary<Guid, UserRelationshipStatusDto>();

        foreach (var batch in remoteTargets.Keys.Chunk(25))
        {
            var url = "https://api.bsky.app/xrpc/app.bsky.actor.getProfiles?" + string.Join("&", batch.Select(d => $"actors={Uri.EscapeDataString(d)}"));
            try
            {
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    continue;
                }

                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                if (!doc.RootElement.TryGetProperty("profiles", out var profilesProp))
                {
                    continue;
                }

                foreach (var profile in profilesProp.EnumerateArray())
                {
                    if (!profile.TryGetProperty("did", out var didProp))
                    {
                        continue;
                    }

                    var did = didProp.GetString();
                    if (string.IsNullOrWhiteSpace(did) || !remoteTargets.TryGetValue(did, out var targetUser))
                    {
                        continue;
                    }

                    if (!profile.TryGetProperty("viewer", out var viewerProp))
                    {
                        continue;
                    }

                    var remoteStatus = BuildInteractionStatusFromViewer(viewerProp);
                    result[targetUser.Id] = remoteStatus;
                    await SyncRelationshipStatusWithAtProtoAsync(viewerId, targetUser, viewerProp);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[FetchRemoteInteractionStatusesAsync] Failed to refresh remote viewer statuses for viewer {ViewerId}", viewerId);
            }
        }

        if (result.Count > 0)
        {
            await _unitOfWork.CompleteAsync();
        }

        return result;
    }

    private static UserRelationshipStatusDto BuildInteractionStatusFromViewer(JsonElement viewerProp)
    {
        string? followingReference = null;
        string? blockingReference = null;
        var isFollowing = false;
        var isFollowedBy = false;
        var isBlocking = false;
        var isBlockedBy = false;
        var isMuted = false;

        if (viewerProp.ValueKind == JsonValueKind.Object)
        {
            if (viewerProp.TryGetProperty("following", out var followingProp) && followingProp.ValueKind == JsonValueKind.String)
            {
                followingReference = followingProp.GetString();
                isFollowing = !string.IsNullOrWhiteSpace(followingReference);
            }

            if (viewerProp.TryGetProperty("blocking", out var blockingProp) && blockingProp.ValueKind == JsonValueKind.String)
            {
                blockingReference = blockingProp.GetString();
                isBlocking = !string.IsNullOrWhiteSpace(blockingReference);
            }

            if (viewerProp.TryGetProperty("followedBy", out var followedByProp))
            {
                if (followedByProp.ValueKind == JsonValueKind.True)
                {
                    isFollowedBy = true;
                }
                else if (followedByProp.ValueKind == JsonValueKind.String)
                {
                    isFollowedBy = !string.IsNullOrWhiteSpace(followedByProp.GetString());
                }
            }

            if (viewerProp.TryGetProperty("blockedBy", out var blockedByProp) && blockedByProp.ValueKind == JsonValueKind.True)
            {
                isBlockedBy = true;
            }

            if (viewerProp.TryGetProperty("muted", out var mutedProp) && mutedProp.ValueKind == JsonValueKind.True)
            {
                isMuted = true;
            }
        }

        return new UserRelationshipStatusDto(
            IsFollowing: isFollowing,
            IsFollowedBy: isFollowedBy,
            IsBlocking: isBlocking,
            IsBlockedBy: isBlockedBy,
            IsMuted: isMuted,
            FollowingReference: followingReference,
            BlockingReference: blockingReference
        );
    }

    public async Task SyncInteractionsBatchAsync(Guid viewerId, IEnumerable<string> dids)
    {
        if (dids == null) return;

        var normalizedDids = dids
            .Where(d => !string.IsNullOrWhiteSpace(d))
            .Select(d => d.ToLowerInvariant())
            .Distinct()
            .ToList();
        if (!normalizedDids.Any()) return;
        
        // Keep this short so external Bluesky follow changes appear quickly after navigation.
        var syncCacheKey = $"viewer_sync_batch:{viewerId}:{string.Join(",", normalizedDids.OrderBy(d => d)).GetHashCode()}";
        if (await _cacheService.GetAsync<bool>(syncCacheKey)) return;

        _logger.LogInformation("[SyncInteractionsBatchAsync] Refreshing statuses for {Count} users for viewer {ViewerId}", normalizedDids.Count, viewerId);

        try
        {
            var token = await GetOrRefreshBlueskyTokenAsync(viewerId);
            if (string.IsNullOrEmpty(token)) return;

            using var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            // getProfiles takes up to 25 actors
            for (int i = 0; i < normalizedDids.Count; i += 25)
            {
                var batch = normalizedDids.Skip(i).Take(25).ToList();
                var url = "https://api.bsky.app/xrpc/app.bsky.actor.getProfiles?" + string.Join("&", batch.Select(d => $"actors={d}"));

                var response = await client.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);
                    if (doc.RootElement.TryGetProperty("profiles", out var profilesProp))
                    {
                        // Merge before fetching to ensure only primary ones are fetched
                        await MergeDuplicateUsersBatchAsync(batch);

                        var usersFromDb = await _unitOfWork.Users.GetByDidsAsync(batch);
                        var usersMap = usersFromDb
                            .Where(u => !string.IsNullOrEmpty(u.Did))
                            .GroupBy(u => u.Did.ToLowerInvariant())
                            .ToDictionary(g => g.Key, g => g.OrderBy(u => u.CreatedAt).First());

                        foreach (var profile in profilesProp.EnumerateArray())
                        {
                            if (profile.TryGetProperty("did", out var didProp) && 
                                usersMap.TryGetValue(didProp.GetString()?.ToLowerInvariant() ?? "", out var user))
                            {
                                if (profile.TryGetProperty("viewer", out var viewerProp))
                                {
                                    await SyncRelationshipStatusWithAtProtoAsync(viewerId, user, viewerProp);
                                }
                            }
                        }
                    }
                }
            }

            await _unitOfWork.CompleteAsync();
            await _cacheService.SetAsync(syncCacheKey, true, TimeSpan.FromSeconds(30));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SyncInteractionsBatchAsync] Error during batch sync");
        }
    }

    private async Task SyncRelationshipStatusWithAtProtoAsync(Guid viewerId, User targetUser, JsonElement viewerProp)
    {
        try
        {
            // 1. Sync Follow Status
            if (viewerProp.TryGetProperty("following", out var followingProp) && followingProp.ValueKind == JsonValueKind.String)
            {
                var followingUri = followingProp.GetString();
                if (!string.IsNullOrEmpty(followingUri))
                {
                    var existingFollow = await _unitOfWork.Follows.GetAsync(viewerId, targetUser.Id);
                    if (existingFollow == null)
                    {
                        await _unitOfWork.Follows.AddAsync(new UserFollow
                        {
                            FollowerId = viewerId,
                            FollowingId = targetUser.Id,
                            Uri = followingUri,
                            CreatedAt = DateTime.UtcNow,
                            Tid = followingUri.Split('/').Last()
                        });
                    }
                    else if (existingFollow.Uri != followingUri)
                    {
                        existingFollow.Uri = followingUri;
                        existingFollow.Tid = followingUri.Split('/').Last();
                        _unitOfWork.Follows.Update(existingFollow);
                    }
                }
                else
                {
                    var existingFollow = await _unitOfWork.Follows.GetAsync(viewerId, targetUser.Id);
                    if (existingFollow != null && !string.IsNullOrEmpty(existingFollow.Uri) && (existingFollow.Uri.Contains(".bsky.") || existingFollow.Uri.Contains("at://")))
                    {
                        _unitOfWork.Follows.Remove(existingFollow);
                    }
                }
            }

            // 2. Sync Mute Status
            if (viewerProp.TryGetProperty("muted", out var mutedProp) && mutedProp.ValueKind == JsonValueKind.True)
            {
                if (!await _unitOfWork.Mutes.IsMutedAsync(viewerId, targetUser.Id))
                {
                    await _unitOfWork.Mutes.AddAsync(new MutedAccount
                    {
                        UserId = viewerId,
                        MutedUserId = targetUser.Id,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }
            else
            {
                var existingMute = await _unitOfWork.Mutes.Query()
                    .FirstOrDefaultAsync(m => m.UserId == viewerId && m.MutedUserId == targetUser.Id);
                if (existingMute != null)
                {
                    _unitOfWork.Mutes.Remove(existingMute);
                }
            }

            // 3. Sync Block Status
            if (viewerProp.TryGetProperty("blocking", out var blockingProp) && blockingProp.ValueKind == JsonValueKind.String)
            {
                var blockingUri = blockingProp.GetString();
                if (!string.IsNullOrEmpty(blockingUri))
                {
                    var existingBlock = await _unitOfWork.Blocks.Query()
                        .FirstOrDefaultAsync(b => b.UserId == viewerId && b.BlockedUserId == targetUser.Id);
                    if (existingBlock == null)
                    {
                        await _unitOfWork.Blocks.AddAsync(new BlockedAccount
                        {
                            UserId = viewerId,
                            BlockedUserId = targetUser.Id,
                            CreatedAt = DateTime.UtcNow,
                            Uri = blockingUri
                        });
                    }
                    else if (existingBlock.Uri != blockingUri)
                    {
                        existingBlock.Uri = blockingUri;
                        _unitOfWork.Blocks.Update(existingBlock);
                    }
                }
            }
            else
            {
                var existingBlock = await _unitOfWork.Blocks.Query()
                    .FirstOrDefaultAsync(b => b.UserId == viewerId && b.BlockedUserId == targetUser.Id);
                if (existingBlock != null)
                {
                    _unitOfWork.Blocks.Remove(existingBlock);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SyncRelationshipStatusWithAtProtoAsync] Error syncing relationship for {Did}", targetUser.Did);
        }
    }

    public async Task<bool> MergeDuplicateUsersAsync(string did)
    {
        if (string.IsNullOrEmpty(did)) return false;
        var users = await _unitOfWork.Users.Query()
            .Where(u => u.Did == did)
            .OrderBy(u => u.CreatedAt)
            .ToListAsync();

        if (users.Count <= 1) return false;

        var primary = users.First();
        var duplicates = users.Skip(1).ToList();

        _logger.LogInformation("[MergeDuplicateUsersAsync] Merging {Count} duplicates for DID {Did} into Primary {Id}", duplicates.Count, did, primary.Id);

        foreach (var dup in duplicates)
        {
            // Reassign Followers
            var followers = await _unitOfWork.Follows.Query().Where(f => f.FollowingId == dup.Id).ToListAsync();
            foreach (var f in followers)
            {
                if (!await _unitOfWork.Follows.IsFollowingAsync(f.FollowerId, primary.Id))
                {
                    f.FollowingId = primary.Id;
                    _unitOfWork.Follows.Update(f);
                }
                else _unitOfWork.Follows.Remove(f);
            }

            // Reassign Following
            var following = await _unitOfWork.Follows.Query().Where(f => f.FollowerId == dup.Id).ToListAsync();
            foreach (var f in following)
            {
                if (!await _unitOfWork.Follows.IsFollowingAsync(primary.Id, f.FollowingId))
                {
                    f.FollowerId = primary.Id;
                    _unitOfWork.Follows.Update(f);
                }
                else _unitOfWork.Follows.Remove(f);
            }

            // Reassign Posts
            var posts = await _unitOfWork.Posts.Query().Where(p => p.AuthorId == dup.Id).ToListAsync();
            foreach (var p in posts) { p.AuthorId = primary.Id; _unitOfWork.Posts.Update(p); }

            _unitOfWork.Users.Remove(dup);
        }

        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> MergeDuplicateUsersBatchAsync(IEnumerable<string> dids)
    {
        var normalizedDids = dids.Select(d => d.ToLowerInvariant()).Distinct().ToList();
        if (!normalizedDids.Any()) return false;

        var allUsers = await _unitOfWork.Users.Query()
            .Where(u => !string.IsNullOrEmpty(u.Did) && normalizedDids.Contains(u.Did))
            .ToListAsync();

        var groups = allUsers.GroupBy(u => u.Did?.ToLower());
        bool anyMerged = false;

        foreach (var group in groups.Where(g => g.Count() > 1))
        {
            var did = group.Key;
            if (did != null && await MergeDuplicateUsersAsync(did)) anyMerged = true;
        }

        return anyMerged;
    }

    public async Task<string?> GetOrRefreshBlueskyTokenAsync(Guid userId)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token)) return token;

        var refreshToken = await _distributedCache.GetStringAsync($"BlueskyRefreshToken_{userId}");
        if (string.IsNullOrEmpty(refreshToken)) return null;

        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", refreshToken);

            var response = await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.server.refreshSession", null);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("[GetOrRefreshBlueskyTokenAsync] Failed to refresh Bluesky token for {UserId}. Status: {Status}. Body: {Body}", userId, response.StatusCode, errorBody);
                return null;
            }

            await using var stream = await response.Content.ReadAsStreamAsync();
            var session = await JsonSerializer.DeserializeAsync<JsonElement>(stream);
            var nextAccessJwt = session.GetProperty("accessJwt").GetString();
            var nextRefreshJwt = session.GetProperty("refreshJwt").GetString();

            if (string.IsNullOrEmpty(nextAccessJwt) || string.IsNullOrEmpty(nextRefreshJwt))
            {
                return null;
            }

            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
            };

            await _distributedCache.SetStringAsync($"BlueskyToken_{userId}", nextAccessJwt, cacheOptions);
            await _distributedCache.SetStringAsync($"BlueskyRefreshToken_{userId}", nextRefreshJwt, cacheOptions);
            return nextAccessJwt;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GetOrRefreshBlueskyTokenAsync] Error refreshing Bluesky token for {UserId}", userId);
            return null;
        }
    }

    private void CreatePasswordHash(string password, out byte[] passwordHash, out byte[] passwordSalt)
    {
        using (var hmac = new HMACSHA512())
        {
            passwordSalt = hmac.Key;
            passwordHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        }
    }

    private bool VerifyPasswordHash(string password, byte[] storedHash, byte[] storedSalt)
    {
        using (var hmac = new HMACSHA512(storedSalt))
        {
            var computedHash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
            return computedHash.SequenceEqual(storedHash);
        }
    }

    private string GenerateTid()
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var random = RandomNumberGenerator.GetInt32(1000, 9999);
        return $"{timestamp}{random}";
    }
}

public class RemoteFollowsResult
{
    public List<User> Users { get; set; } = new();
    public List<string> Dids { get; set; } = new();
    public string? Cursor { get; set; }
}
