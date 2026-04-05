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
using BSkyClone.UnitOfWork;


namespace BSkyClone.Services;



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
                    await SyncFollowStatusWithAtProtoAsync(viewerId.Value, user, viewerProp);
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
                    try
                    {
                        var u = await ResolveStubRemoteProfileAsync(actor, stubCache, viewerId: viewerId);
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

                var refreshedUsers = await _unitOfWork.Users.GetByDidsAsync(cachedDids);
                var refreshedMap = refreshedUsers
                    .Where(u => !string.IsNullOrEmpty(u.Did))
                    .GroupBy(u => u.Did.ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.First());
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

                var users = new List<User>();
                var stubCache = new Dictionary<string, User>();
                foreach (var actor in followers.EnumerateArray())
                {
                    try
                    {
                        var u = await ResolveStubRemoteProfileAsync(actor, stubCache, viewerId: viewerId);
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

                var refreshedUsers = await _unitOfWork.Users.GetByDidsAsync(cachedDids);
                var refreshedMap = refreshedUsers
                    .Where(u => !string.IsNullOrEmpty(u.Did))
                    .GroupBy(u => u.Did.ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.First());
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

    public async Task<User?> ResolveStubRemoteProfileAsync(JsonElement actorData, Dictionary<string, User> cache, bool complete = true, Guid? viewerId = null)
    {
        if (!actorData.TryGetProperty("did", out var didProp))
        {
            return null;
        }

        var did = didProp.GetString();
        if (string.IsNullOrEmpty(did)) return null;

        if (cache.TryGetValue(did, out var cached)) return cached;

        var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
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
            await SyncFollowStatusWithAtProtoAsync(viewerId.Value, user, viewerProp);
        }

        cache[did] = user;
        return user;
    }

    public async Task<UserFollow?> GetFollowAsync(Guid followerId, Guid followingId) => await _unitOfWork.Follows.GetAsync(followerId, followingId);
    public async Task<BlockedAccount?> GetBlockAsync(Guid userId, Guid blockedUserId) => await _unitOfWork.Blocks.Query().FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);
    public async Task<MutedByListDto?> GetMutingListAsync(Guid viewerId, Guid targetUserId) => null; // Placeholder
    public async Task<IEnumerable<User>> SearchActorsRemoteAsync(string query, string token, int skip = 0, int take = 20, Guid? viewerId = null) => new List<User>();
    public async Task<List<MutedWord>> GetMutedWordsAsync(Guid userId) => await _unitOfWork.MutedWords.Query().Where(m => m.UserId == userId).ToListAsync();
    
    public async Task<MutedWord> AddMutedWordAsync(Guid userId, string word, string behavior, string targets = "content") {
        var mw = new MutedWord { UserId = userId, Word = word, MuteBehavior = behavior, Targets = targets, CreatedAt = DateTime.UtcNow };
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
        var targetUser = await _unitOfWork.Users.GetByIdAsync(followingId);
        if (targetUser == null) return null;

        var existing = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (existing != null) return existing.Uri;

        var follow = new UserFollow
        {
            FollowerId = followerId,
            FollowingId = followingId,
            CreatedAt = DateTime.UtcNow
        };

        // If target is remote, trigger remote follow
        if (!string.IsNullOrEmpty(targetUser.Did) && !(targetUser.Handle?.EndsWith($".{_config["DomainName"]}") ?? false))
        {
            try {
                var token = await GetOrRefreshBlueskyTokenAsync(followerId);
                if (!string.IsNullOrEmpty(token)) {
                    var result = await _xrpcProxy.ProxyRequestAsync(targetUser.Did, "app.bsky.graph.follow", new Dictionary<string, string?>(), token, "POST", new { subject = targetUser.Did });
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
        return follow.Uri;
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
                    await _xrpcProxy.ProxyRequestAsync(followerId.ToString(), "com.atproto.repo.deleteRecord", new Dictionary<string, string?>(), token, "POST", new { repo = followerId, collection = "app.bsky.graph.follow", rkey = follow.Tid });
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
        var existing = await _unitOfWork.Blocks.IsBlockedAsync(userId, targetUserId);
        if (existing) return true;

        var block = new BlockedAccount { UserId = userId, BlockedUserId = targetUserId, CreatedAt = DateTime.UtcNow };
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

        var mute = new MutedAccount { UserId = userId, MutedUserId = targetUserId, CreatedAt = DateTime.UtcNow };
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

    public async Task<(List<User> Users, string? Cursor)> GetMutedUsersAsync(Guid userId, int limit = 50, string? cursor = null)
    {
        var mutes = await _unitOfWork.Mutes.Query()
            .Include(m => m.MutedUser)
            .Where(m => m.UserId == userId)
            .Take(limit)
            .ToListAsync();
        return (mutes.Select(m => m.MutedUser).ToList(), null);
    }

    public async Task<(List<User> Users, string? Cursor)> GetBlockedUsersAsync(Guid userId, int limit = 50, string? cursor = null)
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

        var targetUsers = await _unitOfWork.Users.Query()
            .Where(u => targetIdList.Contains(u.Id))
            .Select(u => new User
            {
                Id = u.Id,
                Did = u.Did,
                Handle = u.Handle
            })
            .ToListAsync();

        var remoteStatusMap = await FetchRemoteInteractionStatusesAsync(viewerId, targetUsers);

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
            var dbStatus = new UserRelationshipStatusDto(
                IsFollowing: followsMap.ContainsKey(id),
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
                        result[targetUser.Id] = new UserRelationshipStatusDto(false, false, false, false, null, null);
                        continue;
                    }

                    var remoteStatus = BuildInteractionStatusFromViewer(viewerProp);
                    result[targetUser.Id] = remoteStatus;
                    await SyncFollowStatusWithAtProtoAsync(viewerId, targetUser, viewerProp);
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
                                    await SyncFollowStatusWithAtProtoAsync(viewerId, user, viewerProp);
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

    private async Task<string?> GetOrRefreshBlueskyTokenAsync(Guid userId)
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
