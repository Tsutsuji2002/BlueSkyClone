using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.Http; // For QueryCollection

namespace BSkyClone.Services;

public interface IUserService
{
    Task<User?> GetUserByIdAsync(Guid id);
    Task<User?> GetUserByUsernameAsync(string username);
    Task<User?> GetUserByHandleAsync(string handle);
    Task<User?> GetUserByEmailAsync(string email);
    Task<User> CreateUserAsync(RegisterRequest request);
    Task<User?> AuthenticateAsync(string identifier, string password);
    Task<IEnumerable<User>> SearchUsersAsync(string query, int limit);
    Task<User> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<User> UpdateAccountAsync(Guid userId, UpdateAccountRequest request);
    Task<UserSetting> UpdateSettingsAsync(Guid userId, UserSettingDto request);
    Task<UserSetting> GetSettingsAsync(Guid userId);
    Task<bool> VerifyDomainAsync(Guid userId, string handle);
    Task<List<string>> GetSelectedInterestsAsync(Guid userId);
    Task SaveSelectedInterestsAsync(Guid userId, List<string> interests);
    
    // Remote Identity
    Task<User?> ResolveRemoteProfileAsync(string actor, bool forceRefresh = false, Guid? viewerId = null);
    Task<User?> GetProfileByDidAsync(string did);
    
    // Interactions
    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
    Task<bool> IsBlockedAsync(Guid userId, Guid targetUserId);
    Task<bool> IsBlockedByAsync(Guid userId, Guid targetUserId);
    Task<bool> IsMutedAsync(Guid userId, Guid targetUserId);
    Task<(List<User> Users, string? Cursor)> GetFollowingAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null);
    Task<(List<User> Users, string? Cursor)> GetFollowersAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null);
    Task<bool> FollowUserAsync(Guid followerId, Guid followingId);
    Task<bool> UnfollowUserAsync(Guid followerId, Guid followingId);
    Task<bool> BlockUserAsync(Guid userId, Guid targetUserId);
    Task<bool> UnblockUserAsync(Guid userId, Guid targetUserId);
    Task<bool> MuteUserAsync(Guid userId, Guid targetUserId);
    Task<bool> UnmuteUserAsync(Guid userId, Guid targetUserId);
    Task<(List<User> Users, string? Cursor)> GetMutedUsersAsync(Guid userId, int limit, string? cursor);
    Task<(List<User> Users, string? Cursor)> GetBlockedUsersAsync(Guid userId, int limit, string? cursor);
    
    // Batching
    Task<Dictionary<Guid, UserRelationshipStatusDto>> GetInteractionStatusesAsync(Guid viewerId, IEnumerable<Guid> targetIds);
    Task SyncInteractionsBatchAsync(Guid viewerId, IEnumerable<string> dids);
    Task<User?> ResolveStubRemoteProfileAsync(JsonElement actorData, Dictionary<string, User> cache);
    Task<bool> MergeDuplicateUsersAsync(string did);
    Task<bool> MergeDuplicateUsersBatchAsync(IEnumerable<string> dids);
}

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _config;
    private readonly IDistributedCache _distributedCache;
    private readonly ICacheService _cacheService;
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly ILogger<UserService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IServiceScopeFactory _scopeFactory;

    public UserService(
        IUnitOfWork unitOfWork, 
        IConfiguration config, 
        IDistributedCache distributedCache,
        ICacheService cacheService,
        IXrpcProxyService xrpcProxy,
        ILogger<UserService> logger,
        IHttpClientFactory httpClientFactory,
        IServiceScopeFactory scopeFactory)
    {
        _unitOfWork = unitOfWork;
        _config = config;
        _distributedCache = distributedCache;
        _cacheService = cacheService;
        _xrpcProxy = xrpcProxy;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _scopeFactory = scopeFactory;
    }

    public async Task<User?> GetUserByIdAsync(Guid id) => await _unitOfWork.Users.GetByIdAsync(id);
    public async Task<User?> GetUserByUsernameAsync(string username) => await _unitOfWork.Users.GetByUsernameAsync(username);
    public async Task<User?> GetUserByHandleAsync(string handle) => await _unitOfWork.Users.GetByHandleAsync(handle);
    public async Task<User?> GetUserByEmailAsync(string email) => await _unitOfWork.Users.GetByEmailAsync(email);

    public async Task<User> CreateUserAsync(RegisterRequest request)
    {
        CreatePasswordHash(request.Password, out byte[] passwordHash, out byte[] passwordSalt);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = request.Username,
            Handle = $"{request.Handle}.{_config["DomainName"]}",
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

    public async Task<IEnumerable<User>> SearchUsersAsync(string query, int limit)
    {
        return await _unitOfWork.Users.SearchAsync(query, limit);
    }

    public async Task<User> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) throw new Exception("User not found");

        if (request.DisplayName != null) user.DisplayName = request.DisplayName;
        if (request.Bio != null) user.Bio = request.Bio;
        if (request.Location != null) user.Location = request.Location;
        if (request.Website != null) user.Website = request.Website;

        // Note: Avatar and Cover handling usually involves storage, here we set URLs
        if (request.Avatar != null) user.AvatarUrl = "/uploads/avatars/" + request.Avatar.FileName;
        if (request.CoverImage != null) user.CoverImageUrl = "/uploads/covers/" + request.CoverImage.FileName;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();
        return user;
    }

    public async Task<User> UpdateAccountAsync(Guid userId, UpdateAccountRequest request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) throw new Exception("User not found");

        if (request.Handle != null) user.Handle = $"{request.Handle}.{_config["DomainName"]}";
        if (request.Email != null) user.Email = request.Email;
        if (request.Username != null) user.Username = request.Username;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();
        return user;
    }

    public async Task<UserSetting> UpdateSettingsAsync(Guid userId, UserSettingDto request)
    {
        var settings = await _unitOfWork.UserSettings.GetByUserIdAsync(userId);
        if (settings == null)
        {
            settings = new UserSetting { UserId = userId };
            await _unitOfWork.UserSettings.AddAsync(settings);
        }

        // Map DTO to Model
        settings.AdultContentFilter = request.AdultContentFilter;
        settings.EnableAdultContent = request.EnableAdultContent;
        settings.SexuallyExplicitFilter = request.SexuallyExplicitFilter;
        settings.GraphicMediaFilter = request.GraphicMediaFilter;
        settings.NonSexualNudityFilter = request.NonSexualNudityFilter;
        settings.SortReplies = request.SortReplies;
        settings.RequireAltText = request.RequireAltText;
        settings.AutoplayVideoGif = request.AutoplayVideoGif;
        settings.AppLanguage = request.AppLanguage;
        settings.ThemeMode = request.ThemeMode;
        settings.NotifyLikes = request.NotifyLikes;
        settings.NotifyFollowers = request.NotifyFollowers;
        settings.NotifyReplies = request.NotifyReplies;
        settings.NotifyMentions = request.NotifyMentions;
        settings.NotifyQuotes = request.NotifyQuotes;
        settings.NotifyReposts = request.NotifyReposts;
        settings.PushNotifyLikes = request.PushNotifyLikes;
        settings.PushNotifyFollowers = request.PushNotifyFollowers;
        settings.PushNotifyReplies = request.PushNotifyReplies;
        settings.PushNotifyMentions = request.PushNotifyMentions;
        settings.PushNotifyQuotes = request.PushNotifyQuotes;
        settings.PushNotifyReposts = request.PushNotifyReposts;
        settings.InAppNotifyLikes = request.InAppNotifyLikes;
        settings.InAppNotifyFollowers = request.InAppNotifyFollowers;
        settings.InAppNotifyReplies = request.InAppNotifyReplies;
        settings.InAppNotifyMentions = request.InAppNotifyMentions;
        settings.InAppNotifyQuotes = request.InAppNotifyQuotes;
        settings.InAppNotifyReposts = request.InAppNotifyReposts;
        settings.NotifyActivity = request.NotifyActivity;
        settings.PushNotifyActivity = request.PushNotifyActivity;
        settings.InAppNotifyActivity = request.InAppNotifyActivity;
        settings.NotifyLikesOfReposts = request.NotifyLikesOfReposts;
        settings.PushNotifyLikesOfReposts = request.PushNotifyLikesOfReposts;
        settings.InAppNotifyLikesOfReposts = request.InAppNotifyLikesOfReposts;
        settings.NotifyRepostsOfReposts = request.NotifyRepostsOfReposts;
        settings.PushNotifyRepostsOfReposts = request.PushNotifyRepostsOfReposts;
        settings.InAppNotifyRepostsOfReposts = request.InAppNotifyRepostsOfReposts;
        settings.NotifyOthers = request.NotifyOthers;
        settings.PushNotifyOthers = request.PushNotifyOthers;
        settings.InAppNotifyOthers = request.InAppNotifyOthers;
        settings.DefaultReplyRestriction = request.DefaultReplyRestriction;
        settings.DefaultAllowQuotes = request.DefaultAllowQuotes;
        settings.FontSize = request.FontSize;
        settings.EnableTrending = request.EnableTrending;
        settings.EnableDiscoverVideo = request.EnableDiscoverVideo;
        settings.EnableTreeView = request.EnableTreeView;
        settings.RequireLogoutVisibility = request.RequireLogoutVisibility;
        settings.LargerAltBadge = request.LargerAltBadge;
        settings.ShowReplies = request.ShowReplies;
        settings.ShowReposts = request.ShowReposts;
        settings.ShowQuotePosts = request.ShowQuotePosts;
        settings.ShowSampleSavedFeeds = request.ShowSampleSavedFeeds;
        settings.EnabledMediaProviders = request.EnabledMediaProviders;

        _unitOfWork.UserSettings.Update(settings);
        await _unitOfWork.CompleteAsync();
        return settings;
    }

    public async Task<UserSetting> GetSettingsAsync(Guid userId)
    {
        var settings = await _unitOfWork.UserSettings.GetByUserIdAsync(userId);
        if (settings == null)
        {
            settings = new UserSetting { UserId = userId };
            await _unitOfWork.UserSettings.AddAsync(settings);
            await _unitOfWork.CompleteAsync();
        }
        return settings;
    }

    public async Task<bool> VerifyDomainAsync(Guid userId, string handle)
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
        var interests = await _unitOfWork.UserInterests.GetByUserIdAsync(userId);
        return interests.Select(i => i.InterestName).ToList();
    }

    public async Task SaveSelectedInterestsAsync(Guid userId, List<string> interests)
    {
        var existing = await _unitOfWork.UserInterests.GetByUserIdAsync(userId);
        foreach (var item in existing) _unitOfWork.UserInterests.Remove(item);

        foreach (var name in interests)
        {
            await _unitOfWork.UserInterests.AddAsync(new UserInterest { UserId = userId, InterestName = name });
        }
        await _unitOfWork.CompleteAsync();
    }

    public async Task<User?> ResolveRemoteProfileAsync(string actor, bool forceRefresh = false, Guid? viewerId = null)
    {
        var cacheKey = $"remote_profile:{actor}";
        if (!forceRefresh)
        {
            var cached = await _cacheService.GetAsync<User>(cacheKey);
            if (cached != null) return cached;
        }

        try
        {
            string baseApiUrl = "https://api.bsky.app";
            var token = viewerId.HasValue ? await GetOrRefreshBlueskyTokenAsync(viewerId.Value) : null;
            
            // Use public API for unauthenticated requests
            if (string.IsNullOrEmpty(token)) {
                baseApiUrl = "https://public.api.bsky.app";
            }

            var url = $"{baseApiUrl}/xrpc/app.bsky.actor.getProfile?actor={Uri.EscapeDataString(actor)}";
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
                 return await ResolveRemoteProfileAsync(actor, forceRefresh, null);
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
                    user = new User
                    {
                        Id = Guid.NewGuid(),
                        Did = did,
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
                user.FollowersCount = root.TryGetProperty("followersCount", out var fc) ? fc.GetInt32() : 0;
                user.FollowingCount = root.TryGetProperty("followingCount", out var fgc) ? fgc.GetInt32() : 0;
                user.PostsCount = root.TryGetProperty("postsCount", out var pc) ? pc.GetInt32() : 0;
                user.IsVerified = true;

                _unitOfWork.Users.Update(user);

                // Interactions (Mute/Block/Follow)
                if (viewerId.HasValue && root.TryGetProperty("viewer", out var viewerProp))
                {
                    await SyncFollowStatusWithAtProtoAsync(viewerId.Value, user, viewerProp);
                }

                await _unitOfWork.CompleteAsync();
                await _cacheService.SetAsync(cacheKey, user, TimeSpan.FromMinutes(30));
                return user;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving remote profile for {Actor}", actor);
        }

        return null;
    }

    public async Task<User?> GetProfileByDidAsync(string did)
    {
        return await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
    }

    // --- Interaction Implementation ---
    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId) => await _unitOfWork.Follows.ExistsAsync(followerId, followingId);
    public async Task<bool> IsBlockedAsync(Guid userId, Guid targetUserId) => await _unitOfWork.Blocks.IsBlockingAsync(userId, targetUserId);
    public async Task<bool> IsBlockedByAsync(Guid userId, Guid targetUserId) => await _unitOfWork.Blocks.IsBlockingAsync(targetUserId, userId);
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
        bool isRemoteATProto = !string.IsNullOrEmpty(user.Did) && !user.Handle.EndsWith($".{_config["DomainName"]}");
        
        if (isRemoteATProto)
        {
            _logger.LogInformation("[GetFollowingAsync] Triggering remote fetch for {Actor}", actor);
            return await GetRemoteFollowingAsync(user.Did, limit, cursor, viewerId);
        }

        var follows = await _unitOfWork.Follows.GetFollowingAsync(user.Id, 0, limit); // Note: Simplified skipping for now
        return (follows.Select(f => f.Following).ToList(), null);
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

        bool isRemoteATProto = !string.IsNullOrEmpty(user.Did) && !user.Handle.EndsWith($".{_config["DomainName"]}");
        
        if (isRemoteATProto)
        {
            return await GetRemoteFollowersAsync(user.Did, limit, cursor, viewerId);
        }

        var follows = await _unitOfWork.Follows.GetFollowersAsync(user.Id, 0, limit);
        return (follows.Select(f => f.Follower).ToList(), null);
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

                var users = new List<User>();
                var stubCache = new Dictionary<string, User>();
                foreach (var actor in follows.EnumerateArray())
                {
                    var u = await ResolveStubRemoteProfileAsync(actor, stubCache);
                    if (u != null) users.Add(u);
                }

                cached = new RemoteFollowsResult { Users = users, Cursor = nextCursor, Dids = users.Select(u => u.Did).ToList() };
                await _cacheService.SetAsync(cacheKey, cached, TimeSpan.FromMinutes(10));
            }
        }

        if (cached != null)
        {
            if (viewerId.HasValue)
            {
                await SyncInteractionsBatchAsync(viewerId.Value, cached.Dids);
                // Re-fetch users from DB to get updated interaction properties if any
                var refreshedUsers = await _unitOfWork.Users.GetByDidsAsync(cached.Dids);
                return (refreshedUsers.ToList(), cached.Cursor);
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

                var users = new List<User>();
                var stubCache = new Dictionary<string, User>();
                foreach (var actor in followers.EnumerateArray())
                {
                    var u = await ResolveStubRemoteProfileAsync(actor, stubCache);
                    if (u != null) users.Add(u);
                }

                cached = new RemoteFollowsResult { Users = users, Cursor = nextCursor, Dids = users.Select(u => u.Did).ToList() };
                await _cacheService.SetAsync(cacheKey, cached, TimeSpan.FromMinutes(10));
            }
        }

        if (cached != null)
        {
            if (viewerId.HasValue)
            {
                await SyncInteractionsBatchAsync(viewerId.Value, cached.Dids);
                var refreshedUsers = await _unitOfWork.Users.GetByDidsAsync(cached.Dids);
                return (refreshedUsers.ToList(), cached.Cursor);
            }
            return (cached.Users, cached.Cursor);
        }

        return (new List<User>(), null);
    }

    public async Task<User?> ResolveStubRemoteProfileAsync(JsonElement actorData, Dictionary<string, User> cache)
    {
        var did = actorData.GetProperty("did").GetString();
        if (string.IsNullOrEmpty(did)) return null;

        if (cache.TryGetValue(did, out var cached)) return cached;

        var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Did = did,
                CreatedAt = DateTime.UtcNow,
                PasswordHash = "REMOTE_USER",
                Salt = "REMOTE_USER",
                Email = $"{did}@remote.bsky.social"
            };
            await _unitOfWork.Users.AddAsync(user);
        }

        user.Handle = actorData.GetProperty("handle").GetString();
        user.DisplayName = actorData.TryGetProperty("displayName", out var dn) ? dn.GetString() : null;
        user.AvatarUrl = actorData.TryGetProperty("avatar", out var av) ? av.GetString() : null;
        user.Bio = actorData.TryGetProperty("description", out var ds) ? ds.GetString() : null;
        user.IsVerified = true;

        _unitOfWork.Users.Update(user);
        cache[did] = user;
        return user;
    }

    public async Task<bool> FollowUserAsync(Guid followerId, Guid followingId)
    {
        var targetUser = await _unitOfWork.Users.GetByIdAsync(followingId);
        if (targetUser == null) return false;

        var existing = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (existing != null) return true;

        var follow = new UserFollow
        {
            FollowerId = followerId,
            FollowingId = followingId,
            CreatedAt = DateTime.UtcNow
        };

        // If target is remote, trigger remote follow
        if (!string.IsNullOrEmpty(targetUser.Did) && !targetUser.Handle.EndsWith($".{_config["DomainName"]}"))
        {
            try {
                var token = await GetOrRefreshBlueskyTokenAsync(followerId);
                if (!string.IsNullOrEmpty(token)) {
                    var result = await _xrpcProxy.ProxyRequestWithTokenAsync(followerId, "app.bsky.graph.follow", new { subject = targetUser.Did }, token);
                    if (result.Success) {
                        using var doc = JsonDocument.Parse(result.Content);
                        follow.Uri = doc.RootElement.GetProperty("uri").GetString();
                        follow.Tid = follow.Uri?.Split('/').Last();
                    }
                }
            } catch { /* log error */ }
        }

        await _unitOfWork.Follows.AddAsync(follow);
        
        // Update counts
        var follower = await _unitOfWork.Users.GetByIdAsync(followerId);
        if (follower != null) follower.FollowingCount = (follower.FollowingCount ?? 0) + 1;
        targetUser.FollowersCount = (targetUser.FollowersCount ?? 0) + 1;

        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UnfollowUserAsync(Guid followerId, Guid followingId)
    {
        var follow = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (follow == null) return true;

        var targetUser = await _unitOfWork.Users.GetByIdAsync(followingId);
        if (targetUser != null && !string.IsNullOrEmpty(targetUser.Did) && !string.IsNullOrEmpty(follow.Uri))
        {
            try {
                var token = await GetOrRefreshBlueskyTokenAsync(followerId);
                if (!string.IsNullOrEmpty(token)) {
                    await _xrpcProxy.ProxyRequestWithTokenAsync(followerId, "com.atproto.repo.deleteRecord", new { repo = followerId, collection = "app.bsky.graph.follow", rkey = follow.Tid }, token);
                }
            } catch { }
        }

        _unitOfWork.Follows.Remove(follow);
        
        var follower = await _unitOfWork.Users.GetByIdAsync(followerId);
        if (follower != null) follower.FollowingCount = Math.Max(0, (follower.FollowingCount ?? 0) - 1);
        if (targetUser != null) targetUser.FollowersCount = Math.Max(0, (targetUser.FollowersCount ?? 0) - 1);

        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> BlockUserAsync(Guid userId, Guid targetUserId)
    {
        var existing = await _unitOfWork.Blocks.IsBlockingAsync(userId, targetUserId);
        if (existing) return true;

        var block = new UserBlock { UserId = userId, BlockedUserId = targetUserId, CreatedAt = DateTime.UtcNow };
        await _unitOfWork.Blocks.AddAsync(block);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UnblockUserAsync(Guid userId, Guid targetUserId)
    {
        var block = await _unitOfWork.Blocks.Query().FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == targetUserId);
        if (block == null) return true;
        _unitOfWork.Blocks.Remove(block);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> MuteUserAsync(Guid userId, Guid targetUserId)
    {
        var existing = await _unitOfWork.Mutes.IsMutedAsync(userId, targetUserId);
        if (existing) return true;

        var mute = new UserMute { UserId = userId, MutedUserId = targetUserId, CreatedAt = DateTime.UtcNow };
        await _unitOfWork.Mutes.AddAsync(mute);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UnmuteUserAsync(Guid userId, Guid targetUserId)
    {
        var mute = await _unitOfWork.Mutes.Query().FirstOrDefaultAsync(m => m.UserId == userId && m.MutedUserId == targetUserId);
        if (mute == null) return true;
        _unitOfWork.Mutes.Remove(mute);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<(List<User> Users, string? Cursor)> GetMutedUsersAsync(Guid userId, int limit, string? cursor)
    {
        var mutes = await _unitOfWork.Mutes.Query()
            .Include(m => m.MutedUser)
            .Where(m => m.UserId == userId)
            .Take(limit)
            .ToListAsync();
        return (mutes.Select(m => m.MutedUser).ToList(), null);
    }

    public async Task<(List<User> Users, string? Cursor)> GetBlockedUsersAsync(Guid userId, int limit, string? cursor)
    {
        var blocks = await _unitOfWork.Blocks.Query()
            .Include(b => b.BlockedUser)
            .Where(b => b.UserId == userId)
            .Take(limit)
            .ToListAsync();
        return (blocks.Select(b => b.BlockedUser).ToList(), null);
    }

    public async Task<Dictionary<Guid, UserRelationshipStatusDto>> GetInteractionStatusesAsync(Guid viewerId, IEnumerable<Guid> targetIds)
    {
        var targetIdList = targetIds.Distinct().ToList();
        if (!targetIdList.Any()) return new Dictionary<Guid, UserRelationshipStatusDto>();

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

        // 4. Fetch Mutes (viewer mutes target)
        var mutes = await _unitOfWork.Mutes.Query()
            .Where(m => m.UserId == viewerId && targetIdList.Contains(m.MutedUserId))
            .Select(m => m.MutedUserId)
            .ToListAsync();

        var result = new Dictionary<Guid, UserRelationshipStatusDto>();
        foreach (var id in targetIdList)
        {
            result[id] = new UserRelationshipStatusDto(
                IsFollowing: followsMap.ContainsKey(id),
                IsBlocking: blockingMap.ContainsKey(id),
                IsBlockedBy: blockedBy.Contains(id),
                IsMuted: mutes.Contains(id),
                FollowingReference: followsMap.TryGetValue(id, out var f) ? f.Uri : null,
                BlockingReference: blockingMap.TryGetValue(id, out var b) ? b.Uri : null
            );
        }

        return result;
    }

    public async Task SyncInteractionsBatchAsync(Guid viewerId, IEnumerable<string> dids)
    {
        if (dids == null || !dids.Any()) return;
        
        var normalizedDids = dids.Select(d => d.ToLowerInvariant()).Distinct().ToList();
        
        // Use a per-viewer-list cache to avoid syncing too often (TTL 2 mins)
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
                                    await SyncFollowStatusWithAtProtoAsync(viewerId, user, viewerProp);
                                }
                            }
                        }
                    }
                }
            }

            await _unitOfWork.CompleteAsync();
            await _cacheService.SetAsync(syncCacheKey, true, TimeSpan.FromMinutes(2));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SyncInteractionsBatchAsync] Error during batch sync");
        }
    }

    private async Task SyncFollowStatusWithAtProtoAsync(Guid viewerId, User targetUser, JsonElement viewerProp)
    {
        try
        {
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
                    // If confirmed negative, remove local follow if exists
                    var existingFollow = await _unitOfWork.Follows.GetAsync(viewerId, targetUser.Id);
                    if (existingFollow != null && !string.IsNullOrEmpty(existingFollow.Uri) && existingFollow.Uri.Contains(".bsky."))
                    {
                        _unitOfWork.Follows.Remove(existingFollow);
                    }
                }
            }
            else
            {
                // confirming no following on ATProto
                var existingFollow = await _unitOfWork.Follows.GetAsync(viewerId, targetUser.Id);
                if (existingFollow != null && !string.IsNullOrEmpty(existingFollow.Uri) && existingFollow.Uri.Contains(".bsky."))
                {
                    _unitOfWork.Follows.Remove(existingFollow);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[SyncFollowStatusWithAtProtoAsync] Error syncing follow for {Did}", targetUser.Did);
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
                if (!await _unitOfWork.Follows.ExistsAsync(f.FollowerId, primary.Id))
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
                if (!await _unitOfWork.Follows.ExistsAsync(primary.Id, f.FollowingId))
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

    private async Task<string?> GetOrRefreshBlueskyTokenAsync(Guid userId)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token)) return token;

        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.Did)) return null;

        // Try getting from cache if we have a refresh token
        // Implemented in Auth Service normally, but here we can try resolving session
        return null; // Placeholder
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
