using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using BSkyClone.Constants;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Distributed;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace BSkyClone.Services;

public class FeedService : IFeedService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPostService _postService;
    private readonly ILogger<FeedService> _logger;
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly IDistributedCache _cache;
    private readonly IHttpClientFactory _httpClientFactory;
    private static bool _isSeeded = true;
    private static readonly SemaphoreSlim _seedSemaphore = new(1, 1);

    public FeedService(IUnitOfWork unitOfWork, IPostService postService, ILogger<FeedService> logger)
    {
        _unitOfWork = unitOfWork;
        _postService = postService;
        _logger = logger;
    }

    public async Task<IEnumerable<FeedDto>> GetTrendingFeedsAsync(Guid userId)
    {
        try
        {
            var popularFeeds = await GetPopularRemoteFeedsAsync(userId);
            if (popularFeeds.Any())
            {
                _logger.LogInformation("[FeedService] GetTrendingFeedsAsync: Returning {Count} popular remote feeds.", popularFeeds.Count());
                return popularFeeds;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[FeedService] Failed to fetch popular remote feeds for recommendation fallback.");
        }

        var feeds = await _unitOfWork.Feeds.GetTrendingFeedsAsync();
        
        var userSubscribedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId)
            .Select(s => s.FeedId)
            .ToListAsync();

        var userPinnedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .Select(s => s.FeedId)
            .ToListAsync();

        return feeds.Select(f => MapToDto(
            f, 
            userPinnedFeedIds.Contains(f.Id), 
            0, 
            userSubscribedFeedIds.Contains(f.Id)
        ));
    }

    private async Task<List<FeedDto>> GetPopularRemoteFeedsAsync(Guid userId)
    {
        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");

            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            if (!string.IsNullOrEmpty(token))
                httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

            var response = await httpClient.GetAsync("https://api.bsky.app/xrpc/app.bsky.unspecced.getPopularFeedGenerators?limit=10");
            if (!response.IsSuccessStatusCode) return new List<FeedDto>();

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            if (!doc.RootElement.TryGetProperty("feeds", out var feedsArray)) return new List<FeedDto>();

            // Get user preferences to mark subscription status
            var savedUris = new HashSet<string>();
            try 
            {
                var user = await _unitOfWork.Users.GetByIdAsync(userId);
                if (user != null && !string.IsNullOrEmpty(user.Did) && !string.IsNullOrEmpty(token))
                {
                    var prefResponse = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.actor.getPreferences", queryParams: new Dictionary<string, string?>(), token: token);
                    if (prefResponse.Success)
                    {
                        using var prefDoc = JsonDocument.Parse(prefResponse.Content);
                        if (prefDoc.RootElement.TryGetProperty("preferences", out var prefs))
                        {
                            foreach (var pref in prefs.EnumerateArray())
                            {
                                if (pref.TryGetProperty("$type", out var type) && 
                                   (type.GetString() == "app.bsky.actor.defs#savedFeedsPrefV2" || type.GetString() == "app.bsky.actor.defs#savedFeedsPref"))
                                {
                                     if (type.GetString() == "app.bsky.actor.defs#savedFeedsPrefV2" && pref.TryGetProperty("items", out var items))
                                         foreach (var it in items.EnumerateArray()) savedUris.Add(it.GetProperty("value").GetString()!);
                                     else if (pref.TryGetProperty("saved", out var saved))
                                         foreach (var s in saved.EnumerateArray()) savedUris.Add(s.GetString()!);
                                }
                            }
                        }
                    }
                }
            } catch { /* subscription status fallback to false */ }

            var result = new List<FeedDto>();
            foreach (var gen in feedsArray.EnumerateArray())
            {
                var uri = gen.GetProperty("uri").GetString()!;
                var creator = gen.GetProperty("creator");
                result.Add(new FeedDto
                {
                    Id = Guid.NewGuid(),
                    Uri = uri,
                    Tid = uri.Split('/').Last(),
                    Name = gen.GetProperty("displayName").GetString()!,
                    Description = gen.TryGetProperty("description", out var desc) ? desc.GetString() : null,
                    AvatarUrl = gen.TryGetProperty("avatar", out var av) ? av.GetString() : null,
                    IsSubscribed = savedUris.Contains(uri),
                    SubscribersCount = gen.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0,
                    Handle = gen.GetProperty("did").GetString()!,
                    Creator = new AuthorDto
                    {
                        Did = creator.GetProperty("did").GetString()!,
                        Handle = creator.GetProperty("handle").GetString()!,
                        DisplayName = creator.TryGetProperty("displayName", out var dname) ? dname.GetString() : null,
                        AvatarUrl = creator.TryGetProperty("avatar", out var cav) ? cav.GetString() : null
                    }
                });
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[FeedService] Error in GetPopularRemoteFeedsAsync");
            return new List<List<FeedDto>>().FirstOrDefault()!; // Return empty list safely
        }
    }



    public async Task<IEnumerable<FeedDto>> GetUserFeedsAsync(Guid userId)
    {
        try
        {
            var remoteFeeds = await GetRemoteFeedsAsync(userId);
            if (remoteFeeds.Any())
            {
                _logger.LogInformation("[FeedService] GetUserFeedsAsync for User {UserId}: Found {Count} remote feeds.", userId, remoteFeeds.Count);
                return remoteFeeds;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] Failed to fetch remote feeds for {UserId}", userId);
        }

        // Fallback to local subscriptions if remote fails or returns none
        var subscriptions = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId)
            .Include(s => s.Feed)
            .ThenInclude(f => f.Creator)
            .OrderByDescending(s => s.IsPinned)
            .ThenBy(s => s.PinnedOrder)
            .ToListAsync();

        _logger.LogInformation("[FeedService] GetUserFeedsAsync for User {UserId}: Falling back to {Count} local subscriptions.", userId, subscriptions.Count);
        return subscriptions.Select(s => MapToDto(s.Feed, s.IsPinned ?? false, s.PinnedOrder ?? 0));
    }

    private async Task<List<FeedDto>> GetRemoteFeedsAsync(Guid userId)
    {
        var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
        if (string.IsNullOrEmpty(token)) return new List<FeedDto>();

        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.Did)) return new List<FeedDto>();

        // 1. Get Preferences
        var prefResponse = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.actor.getPreferences", queryParams: new Dictionary<string, string?>(), token: token);
        if (!prefResponse.Success) return new List<FeedDto>();

        using var doc = JsonDocument.Parse(prefResponse.Content);
        if (!doc.RootElement.TryGetProperty("preferences", out var prefs)) return new List<FeedDto>();
        
        var savedUris = new List<string>();
        var pinnedUris = new List<string>();

        foreach (var pref in prefs.EnumerateArray())
        {
            // Handle V2 Saved Feeds (Modern)
            if (pref.TryGetProperty("$type", out var type) && type.GetString() == "app.bsky.actor.defs#savedFeedsPrefV2")
            {
                if (pref.TryGetProperty("items", out var items))
                {
                    foreach (var item in items.EnumerateArray())
                    {
                        if (item.TryGetProperty("value", out var val) && item.TryGetProperty("type", out var t))
                        {
                            var uri = val.GetString()!;
                            savedUris.Add(uri);
                            if (item.TryGetProperty("pinned", out var pinned) && pinned.GetBoolean())
                                pinnedUris.Add(uri);
                        }
                    }
                }
            }
            // Handle V1 Saved Feeds (Legacy Fallback)
            else if (type.GetString() == "app.bsky.actor.defs#savedFeedsPref")
            {
                if (pref.TryGetProperty("saved", out var saved))
                {
                    foreach (var s in saved.EnumerateArray()) savedUris.Add(s.GetString()!);
                }
                if (pref.TryGetProperty("pinned", out var pinned))
                {
                    foreach (var p in pinned.EnumerateArray()) pinnedUris.Add(p.GetString()!);
                }
            }
        }

        if (!savedUris.Any()) return new List<FeedDto>();

        // 2. Resolve Feed Metadata (Batch)
        var feeds = new List<FeedDto>();
        // Filter out synthetic types that aren't AT URIs (like 'timeline')
        var atUris = savedUris.Where(u => u.StartsWith("at://")).Distinct().ToList();

        for (int i = 0; i < atUris.Count; i += 25)
        {
            var chunk = atUris.Skip(i).Take(25);
            var query = string.Join("&", chunk.Select(u => $"uris={Uri.EscapeDataString(u)}"));
            
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
            var genResponse = await httpClient.GetAsync($"https://api.bsky.app/xrpc/app.bsky.feed.getFeedGenerators?{query}");
            
            if (genResponse.IsSuccessStatusCode)
            {
                var genContent = await genResponse.Content.ReadAsStringAsync();
                using var genDoc = JsonDocument.Parse(genContent);
                foreach (var gen in genDoc.RootElement.GetProperty("feeds").EnumerateArray())
                {
                    var uri = gen.GetProperty("uri").GetString()!;
                    var creatorDid = gen.GetProperty("did").GetString()!;
                    
                    var dto = new FeedDto
                    {
                        Id = Guid.NewGuid(), 
                        Uri = uri,
                        Tid = uri.Split('/').Last(),
                        Name = gen.GetProperty("displayName").GetString()!,
                        Description = gen.TryGetProperty("description", out var desc) ? desc.GetString() : null,
                        AvatarUrl = gen.TryGetProperty("avatar", out var av) ? av.GetString() : null,
                        IsPinned = pinnedUris.Contains(uri),
                        IsSubscribed = true,
                        SubscribersCount = gen.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0,
                        Handle = creatorDid,
                        Creator = new AuthorDto
                        {
                             Did = creatorDid,
                             Handle = creatorDid,
                             DisplayName = gen.GetProperty("creator").GetProperty("displayName").GetString(),
                             AvatarUrl = gen.GetProperty("creator").TryGetProperty("avatar", out var cav) ? cav.GetString() : null
                        }
                    };
                    feeds.Add(dto);
                }
            }
        }

        // Add back synthetic feeds if they were pinned/saved (e.g. Following)
        if (savedUris.Contains("following"))
        {
             feeds.Insert(0, new FeedDto 
             { 
                 Id = Guid.Empty, 
                 Name = "Following", 
                 Uri = "following", 
                 IsPinned = pinnedUris.Contains("following"), 
                 IsSubscribed = true 
             });
        }

        return feeds;
    }

    public async Task<FeedDto?> GetFeedByTidAsync(string tid)
    {
        var feed = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .FirstOrDefaultAsync(f => f.Tid == tid);

        return feed != null ? MapToDto(feed, false, 0, false) : null;
    }

    public async Task<bool> SaveFeedAsync(Guid userId, Guid feedId, string? uri = null)
    {
        if (!string.IsNullOrEmpty(uri))
        {
            return await UpdateRemoteFeedPreferenceAsync(userId, uri, true, false);
        }

        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);
        if (existing != null) return true;

        var sub = new UserFeedSubscription
        {
            UserId = userId,
            FeedId = feedId,
            CreatedAt = DateTime.UtcNow,
            IsPinned = false,
            PinnedOrder = 0
        };

        await _unitOfWork.UserFeedSubscriptions.AddAsync(sub);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> UnsaveFeedAsync(Guid userId, Guid feedId, string? uri = null)
    {
        if (!string.IsNullOrEmpty(uri))
        {
            return await UpdateRemoteFeedPreferenceAsync(userId, uri, false);
        }

        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);
        if (existing == null) return true;

        _unitOfWork.UserFeedSubscriptions.Remove(existing);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> PinFeedAsync(Guid userId, Guid feedId, string? uri = null)
    {
        if (!string.IsNullOrEmpty(uri))
        {
            return await UpdateRemoteFeedPreferenceAsync(userId, uri, true, true);
        }

        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);

        var maxOrder = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .MaxAsync(s => (int?)s.PinnedOrder) ?? 0;

        if (existing == null)
        {
            var sub = new UserFeedSubscription
            {
                UserId = userId,
                FeedId = feedId,
                CreatedAt = DateTime.UtcNow,
                IsPinned = true,
                PinnedOrder = maxOrder + 1
            };
            await _unitOfWork.UserFeedSubscriptions.AddAsync(sub);
        }
        else
        {
            existing.IsPinned = true;
            existing.PinnedOrder = maxOrder + 1;
            _unitOfWork.UserFeedSubscriptions.Update(existing);
        }

        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> UnpinFeedAsync(Guid userId, Guid feedId, string? uri = null)
    {
        if (!string.IsNullOrEmpty(uri))
        {
            return await UpdateRemoteFeedPreferenceAsync(userId, uri, true, false);
        }

        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);
        if (existing == null) return false;

        existing.IsPinned = false;
        existing.PinnedOrder = 0;

        return await _unitOfWork.CompleteAsync() > 0;
    }

    private async Task<bool> UpdateRemoteFeedPreferenceAsync(Guid userId, string feedUri, bool save, bool? pinAction = null)
    {
        try
        {
            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            if (string.IsNullOrEmpty(token)) return false;

            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.Did)) return false;

            // 1. Get current preferences
            var prefResponse = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.actor.getPreferences", queryParams: new Dictionary<string, string?>(), token: token);
            if (!prefResponse.Success) return false;

            var root = JsonNode.Parse(prefResponse.Content);
            if (root == null || root["preferences"] == null) return false;
            
            var prefs = root["preferences"]!.AsArray();
            
            // 2. Find and modify savedFeedsPrefV2
            var v2Pref = prefs.FirstOrDefault(p => p?["$type"]?.GetValue<string>() == "app.bsky.actor.defs#savedFeedsPrefV2");
            if (v2Pref == null && save) {
                v2Pref = new JsonObject { ["$type"] = "app.bsky.actor.defs#savedFeedsPrefV2", ["items"] = new JsonArray() };
                prefs.Add(v2Pref);
            }

            if (v2Pref != null)
            {
                var items = v2Pref["items"]!.AsArray();
                var item = items.FirstOrDefault(i => i?["value"]?.GetValue<string>() == feedUri);

                if (save) {
                    if (item == null) {
                        items.Add(new JsonObject {
                            ["id"] = Guid.NewGuid().ToString().Substring(0, 8),
                            ["type"] = feedUri.StartsWith("at://") ? "feed" : "timeline",
                            ["value"] = feedUri,
                            ["pinned"] = pinAction ?? false
                        });
                    } else if (pinAction.HasValue) {
                        item["pinned"] = pinAction.Value;
                    }
                } else {
                    if (item != null) items.Remove(item);
                }
            }

            // 3. Put Preferences (Send the whole list back)
            // No need for 'preferences' wrapper if the body itself is the request object conventionally,
            // but app.bsky.actor.putPreferences expects { "preferences": [...] }
            var putResponse = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.actor.putPreferences", queryParams: new Dictionary<string, string?>(), token: token, method: "POST", body: new { preferences = prefs });
            
            if (putResponse.Success)
            {
                _logger.LogInformation("[FeedService] Successfully updated remote feed preferences for {UserId} (Feed: {Uri}, Save: {Save}, Pin: {Pin})", userId, feedUri, save, pinAction);
            }
            
            return putResponse.Success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] Error updating remote feed preferences for {FeedUri}", feedUri);
            return false;
        }
    }

    public async Task<bool> ReorderFeedsAsync(Guid userId, List<Guid> feedIds)
    {
        var subs = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .ToListAsync();

        for (int i = 0; i < feedIds.Count; i++)
        {
            var sub = subs.FirstOrDefault(s => s.FeedId == feedIds[i]);
            if (sub != null)
            {
                sub.PinnedOrder = i;
            }
        }

        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<IEnumerable<FeedDto>> SearchFeedsAsync(Guid userId, string query, int skip, int take)
    {
        var feeds = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .Where(f => (f.IsDeleted == false || f.IsDeleted == null) && 
                        (f.Name.Contains(query) || (f.Description != null && f.Description.Contains(query))))
            .OrderByDescending(f => f.SubscribersCount)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var userSubscribedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId)
            .Select(s => s.FeedId)
            .ToListAsync();

        var userPinnedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .Select(s => s.FeedId)
            .ToListAsync();

        return feeds.Select(f => MapToDto(f, userPinnedFeedIds.Contains(f.Id), 0, userSubscribedFeedIds.Contains(f.Id)));
    }

    private FeedDto MapToDto(Feed feed, bool isPinned = false, int pinnedOrder = 0, bool isSubscribed = true)
    {
        return new FeedDto
        {
            Id = feed.Id,
            Tid = feed.Tid,
            Name = feed.Name,
            Description = feed.Description,
            Handle = feed.Handle,
            AvatarUrl = feed.AvatarUrl,
            IsPinned = isPinned,
            PinnedOrder = pinnedOrder,
            IsSubscribed = isSubscribed,
            SubscribersCount = feed.SubscribersCount ?? 0,
            Creator = feed.Creator != null ? new AuthorDto
            {
                Id = feed.Creator.Id,
                Username = feed.Creator.Username,
                DisplayName = feed.Creator.DisplayName,
                AvatarUrl = feed.Creator.AvatarUrl,
                IsVerified = feed.Creator.IsVerified
            } : null
        };
    }

    public async Task<FeedDto?> GetFeedByIdAsync(Guid feedId, Guid userId)
    {
        await PreSeedFeedsAsync();
        var feed = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .FirstOrDefaultAsync(f => f.Id == feedId && (f.IsDeleted == false || f.IsDeleted == null));

        if (feed == null) 
        {
            _logger.LogWarning("[FeedService] GetFeedByIdAsync: Feed {Id} NOT FOUND in database after seeding.", feedId);
            return null;
        }

        var subscription = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);

        return MapToDto(
            feed, 
            subscription?.IsPinned ?? false, 
            subscription?.PinnedOrder ?? 0, 
            subscription != null
        );
    }


    public async Task<IEnumerable<PostDto>> GetFeedPostsAsync(Guid feedId, Guid? userId, int skip, int take, string? uri = null)
    {
        try
        {
            // 1. Prioritize Remote Feed URI
            if (!string.IsNullOrEmpty(uri) && (uri.StartsWith("at://") || uri == "following"))
            {
                if (uri == "following" && userId.HasValue)
                {
                    return await _postService.GetTimelineAsync(userId.Value, skip, take);
                }
                return await GetRemoteFeedPostsAsync(uri, userId, skip, take);
            }
            
            // 2. Legacy/Local feed resolution
            var feed = await _unitOfWork.Feeds.Query().FirstOrDefaultAsync(f => f.Id == feedId);

            // Redirect all local/official legacy feeds to "What's Hot" in Bluesky
            _logger.LogInformation("[FeedService] Redirecting legacy/local feed '{Name}' to remote 'What's Hot' discovering.", feed?.Name ?? "Unknown");
            return await GetRemoteFeedPostsAsync("at://did:plc:z72i7hdynmk606gofuc7fs6p/app.bsky.feed.generator/whats-hot", userId, skip, take);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] GetFeedPostsAsync: Outer error");
            return new List<PostDto>();
        }
    }

    private async Task<IEnumerable<PostDto>> GetRemoteFeedPostsAsync(string uri, Guid? userId, int skip, int take)
    {
        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
            
            if (userId.HasValue)
            {
                var token = await _cache.GetStringAsync($"BlueskyToken_{userId.Value}");
                if (!string.IsNullOrEmpty(token))
                    httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            var limit = Math.Min(take, 100);
            var response = await httpClient.GetAsync($"https://api.bsky.app/xrpc/app.bsky.feed.getFeed?feed={Uri.EscapeDataString(uri)}&limit={limit}");
            
            if (!response.IsSuccessStatusCode) 
            {
                _logger.LogWarning("[FeedService] getFeed failed for {Uri}: {Status}", uri, response.StatusCode);
                return new List<PostDto>();
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            if (!doc.RootElement.TryGetProperty("feed", out var feedArray)) return new List<PostDto>();

            var posts = _postService.MapBlueskyFeed(feedArray);
            return posts; // getFeed doesn't support offset pagination, usually cursor-based
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] Error fetching remote feed posts for {Uri}", uri);
            return new List<PostDto>();
        }
    }


    public Task PreSeedFeedsAsync()
    {
        return Task.CompletedTask;
    }
}

