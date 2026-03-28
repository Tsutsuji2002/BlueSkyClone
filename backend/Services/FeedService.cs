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
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Globalization;

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
    private const string FollowingFeedKey = "following";
    private const string DiscoverFeedKey = "discover";
    private const string DiscoverFeedName = "Discover";
    private const string DiscoverFeedDid = "did:web:discover.bsky.app";
    private const string DiscoverFeedHandle = "discover.bsky.app";
    private const string DiscoverFeedUri = "at://did:web:discover.bsky.app/app.bsky.feed.generator/whats-hot";

    public FeedService(
        IUnitOfWork unitOfWork, 
        IPostService postService, 
        ILogger<FeedService> logger,
        IXrpcProxyService xrpcProxy,
        IDistributedCache cache,
        IHttpClientFactory httpClientFactory)
    {
        _unitOfWork = unitOfWork;
        _postService = postService;
        _logger = logger;
        _xrpcProxy = xrpcProxy;
        _cache = cache;
        _httpClientFactory = httpClientFactory;
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
            _logger.LogWarning(ex, "[FeedService] Failed to fetch popular remote feeds for discovery.");
        }

        // NO FALLBACK to local database feeds, but we use hardcoded official remote feeds as a safety net.
        return await GetHardcodedOfficialFeedsAsync(userId);
    }

    private async Task<List<FeedDto>> GetPopularRemoteFeedsAsync(Guid userId)
    {
        try
        {
            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.Did) || string.IsNullOrEmpty(token))
            {
                // Unauthenticated or no DID, but we still want discovery. 
                // We'll fall back to hardcoded official feeds.
                return new List<FeedDto>();
            }

            // Route discovery through the authenticated proxy to bypass network blocks
            var response = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.unspecced.getPopularFeedGenerators", 
                queryParams: new Dictionary<string, string?> { ["limit"] = "10" }, 
                token: token);
            
            if (!response.Success)
            {
                _logger.LogWarning("[FeedService] getPopularFeedGenerators failed via proxy: {Content}", response.Content);
                return new List<FeedDto>();
            }

            using var doc = JsonDocument.Parse(response.Content);
            if (!doc.RootElement.TryGetProperty("feeds", out var feedsArray)) return new List<FeedDto>();

            // Get user preferences to mark subscription status
            var savedUris = new HashSet<string>();
            try 
            {
                // Shadowing fix: 'user' is already declared at line 59
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
                                         foreach (var s in saved.EnumerateArray())
                    {
                        var raw = s.GetString()!;
                        savedUris.Add(raw);
                        savedUris.Add(CanonicalizeFeedValue(raw));
                    }
                                }
                            }
                        }
                    }
                }
            } catch { /* subscription status fallback to false */ }

            var result = new List<FeedDto>();
            foreach (var gen in feedsArray.EnumerateArray())
            {
                var dto = MapGeneratorViewToDto(gen, savedUris, new HashSet<string>());
                result.Add(dto);
            }
            return MergeFeedsByKey(result);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[FeedService] Error in GetPopularRemoteFeedsAsync");
            return new List<FeedDto>();
        }
    }

    private async Task<List<FeedDto>> GetHardcodedOfficialFeedsAsync(Guid userId)
    {
        // Guaranteed official feeds to show if discovery fails
        var officialUris = new List<string>
        {
            "at://did:plc:z72i7hdynmk606gofuc7fs6p/app.bsky.feed.generator/whats-hot",
            "at://did:plc:z72i7hdynmk606gofuc7fs6p/app.bsky.feed.generator/bsky-team",
            "at://did:plc:z72i7hdynmk606gofuc7fs6p/app.bsky.feed.generator/with-friends"
        };
        
        return await ResolveFeedsMetadataAsync(officialUris, userId);
    }

    private async Task<List<FeedDto>> ResolveFeedsMetadataAsync(List<string> uris, Guid userId)
    {
        if (!uris.Any()) return new List<FeedDto>();
        
        try
        {
            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            var savedUris = new HashSet<string>();
            var pinnedUris = new HashSet<string>();
            
            // Try to get user preferences to mark sub/pin status
            try
            {
                var userObj = await _unitOfWork.Users.GetByIdAsync(userId);
                if (userObj != null && !string.IsNullOrEmpty(userObj.Did) && !string.IsNullOrEmpty(token))
                {
                    var pref = await GetUserPreferencesAsync(userObj.Did, token);
                    if (pref != null)
                    {
                        savedUris = pref.SavedUris;
                        pinnedUris = pref.PinnedUris;
                    }
                }
            } catch { }

            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.Did) || string.IsNullOrEmpty(token))
            {
                // If not authenticated, we can't use the proxy for specific DID. 
                // We'll use a direct call to the public AppView as a final fallback.
                return await ResolveMetadataDirectAsync(uris, savedUris, pinnedUris);
            }

            // Use the proxy for metadata resolution to ensure consistent network access via PDS
            var resultList = new List<FeedDto>();
            foreach (var uri in uris)
            {
                var resp = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.feed.getFeedGenerator", 
                    new Dictionary<string, string?> { ["generator"] = uri }, token);
                
                if (resp.Success)
                {
                    using var gDoc = JsonDocument.Parse(resp.Content);
                    if (gDoc.RootElement.TryGetProperty("view", out var gen))
                    {
                         resultList.Add(MapGeneratorViewToDto(gen, savedUris, pinnedUris));
                    }
                }
            }
            return resultList;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] Error resolving feeds metadata via proxy");
            return new List<FeedDto>();
        }
    }

    private async Task<List<FeedDto>> ResolveMetadataDirectAsync(List<string> uris, HashSet<string> saved, HashSet<string> pinned)
    {
        var result = new List<FeedDto>();
        try {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend/1.0");
            foreach (var uri in uris)
            {
                 var response = await httpClient.GetAsync($"https://public.api.bsky.app/xrpc/app.bsky.feed.getFeedGenerator?generator={Uri.EscapeDataString(uri)}");
                 if (response.IsSuccessStatusCode)
                 {
                     var content = await response.Content.ReadAsStringAsync();
                     using var doc = JsonDocument.Parse(content);
                     if (doc.RootElement.TryGetProperty("view", out var gen))
                         result.Add(MapGeneratorViewToDto(gen, saved, pinned));
                 }
            }
        } catch {}
        return result;
    }

    private FeedDto MapGeneratorViewToDto(JsonElement gen, HashSet<string> saved, HashSet<string> pinned)
    {
        var uri = gen.GetProperty("uri").GetString()!;
        var creator = gen.GetProperty("creator");
        var creatorDid = creator.GetProperty("did").GetString()!;
        var creatorHandle = creator.GetProperty("handle").GetString()!;
        var isDiscover = IsOfficialDiscoverFeed(gen.GetProperty("displayName").GetString(), creatorDid, creatorHandle);

        var dto = new FeedDto
        {
            Id = StableFeedIdFromKey(isDiscover ? DiscoverFeedKey : uri),
            Uri = isDiscover ? DiscoverFeedKey : uri,
            Tid = isDiscover ? DiscoverFeedKey : uri.Split('/').Last(),
            Name = isDiscover ? DiscoverFeedName : gen.GetProperty("displayName").GetString()!,
            Description = gen.TryGetProperty("description", out var ds) ? ds.GetString() : null,
            AvatarUrl = gen.TryGetProperty("avatar", out var av) ? av.GetString() : null,
            IsSubscribed = saved.Contains(uri) || (isDiscover && saved.Contains(DiscoverFeedKey)),
            IsPinned = pinned.Contains(uri) || (isDiscover && pinned.Contains(DiscoverFeedKey)),
            SubscribersCount = gen.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0,
            Handle = isDiscover ? DiscoverFeedKey : creatorHandle,
            Creator = new AuthorDto
            {
                Did = creatorDid,
                Handle = creatorHandle,
                DisplayName = creator.TryGetProperty("displayName", out var dname) ? dname.GetString() : null,
                AvatarUrl = creator.TryGetProperty("avatar", out var cav) ? cav.GetString() : null
            }
        };

        return NormalizeSpecialFeed(dto, creatorDid, creatorHandle);
    }

    private class UserPrefs { public HashSet<string> SavedUris { get; set; } = new(); public HashSet<string> PinnedUris { get; set; } = new(); }

    private async Task<UserPrefs?> GetUserPreferencesAsync(string did, string token)
    {
        var response = await _xrpcProxy.ProxyRequestAsync(did, "app.bsky.actor.getPreferences", queryParams: new Dictionary<string, string?>(), token: token);
        if (!response.Success) return null;

        var prefs = new UserPrefs();
        using var doc = JsonDocument.Parse(response.Content);
        if (doc.RootElement.TryGetProperty("preferences", out var items))
        {
            foreach (var pref in items.EnumerateArray())
            {
                var type = pref.TryGetProperty("$type", out var t) ? t.GetString() : "";
                if (type == "app.bsky.actor.defs#savedFeedsPrefV2")
                {
                    if (pref.TryGetProperty("items", out var its))
                        foreach (var it in its.EnumerateArray()) {
                            var uri = it.GetProperty("value").GetString()!;
                            var canonical = CanonicalizeFeedValue(uri);
                            prefs.SavedUris.Add(uri);
                            prefs.SavedUris.Add(canonical);
                            if (it.TryGetProperty("pinned", out var p) && p.GetBoolean())
                            {
                                prefs.PinnedUris.Add(uri);
                                prefs.PinnedUris.Add(canonical);
                            }
                        }
                }
                else if (type == "app.bsky.actor.defs#savedFeedsPref")
                {
                    if (pref.TryGetProperty("saved", out var s))
                    {
                        foreach (var x in s.EnumerateArray())
                        {
                            var raw = x.GetString()!;
                            prefs.SavedUris.Add(raw);
                            prefs.SavedUris.Add(CanonicalizeFeedValue(raw));
                        }
                    }
                    if (pref.TryGetProperty("pinned", out var p))
                    {
                        foreach (var x in p.EnumerateArray())
                        {
                            var raw = x.GetString()!;
                            prefs.PinnedUris.Add(raw);
                            prefs.PinnedUris.Add(CanonicalizeFeedValue(raw));
                        }
                    }
                }
            }
        }
        return prefs;
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
        var pinnedOrderKeys = new List<string>();

        foreach (var pref in prefs.EnumerateArray())
        {
            // Handle V2 Saved Feeds (Modern)
            if (pref.TryGetProperty("$type", out var type) && type.GetString() == "app.bsky.actor.defs#savedFeedsPrefV2")
            {
                if (pref.TryGetProperty("items", out var items))
                {
                    foreach (var item in items.EnumerateArray())
                    {
                        if (!item.TryGetProperty("value", out var val)) continue;
                        var uri = val.GetString();
                        if (string.IsNullOrEmpty(uri)) continue;
                        var canonical = CanonicalizeFeedValue(uri);
                        savedUris.Add(uri);
                        savedUris.Add(canonical);
                        if (item.TryGetProperty("pinned", out var pinned) && pinned.GetBoolean())
                        {
                            pinnedUris.Add(uri);
                            pinnedUris.Add(canonical);
                            if (!pinnedOrderKeys.Any(x => MatchesFeedValue(x, canonical)))
                            {
                                pinnedOrderKeys.Add(canonical);
                            }
                        }
                    }
                }
            }
            // Handle V1 Saved Feeds (Legacy Fallback)
            else if (pref.TryGetProperty("$type", out var typeV1) && typeV1.GetString() == "app.bsky.actor.defs#savedFeedsPref")
            {
                if (pref.TryGetProperty("saved", out var saved))
                {
                    foreach (var s in saved.EnumerateArray())
                    {
                        var raw = s.GetString()!;
                        savedUris.Add(raw);
                        savedUris.Add(CanonicalizeFeedValue(raw));
                    }
                }
                if (pref.TryGetProperty("pinned", out var pinned))
                {
                    foreach (var p in pinned.EnumerateArray())
                    {
                        var raw = p.GetString()!;
                        var canonical = CanonicalizeFeedValue(raw);
                        pinnedUris.Add(raw);
                        pinnedUris.Add(canonical);
                        if (!pinnedOrderKeys.Any(x => MatchesFeedValue(x, canonical)))
                        {
                            pinnedOrderKeys.Add(canonical);
                        }
                    }
                }
            }
        }

        if (!savedUris.Any()) return new List<FeedDto>();

        int ResolvePinnedOrder(string? uri)
        {
            if (string.IsNullOrWhiteSpace(uri))
                return 0;

            for (var i = 0; i < pinnedOrderKeys.Count; i++)
            {
                if (MatchesFeedValue(uri, pinnedOrderKeys[i]))
                    return i + 1;
            }

            return 0;
        }

        // 2. Resolve Feed Metadata (Batch)
        var feeds = new List<FeedDto>();
        var atUris = savedUris
            .Where(u => u.StartsWith("at://", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (atUris.Count > 0)
        {
            var resolvedFeeds = await ResolveFeedsMetadataAsync(atUris, userId);
            foreach (var dto in resolvedFeeds)
            {
                dto.IsSubscribed = true;
                if (pinnedUris.Any(x => MatchesFeedValue(dto.Uri, x)))
                    dto.IsPinned = true;
                dto.PinnedOrder = ResolvePinnedOrder(dto.Uri);
                feeds.Add(dto);
            }
        }

        var hasFollowingSaved = savedUris.Any(u => string.Equals(u, FollowingFeedKey, StringComparison.OrdinalIgnoreCase));
        var hasDiscoverSaved = savedUris.Any(IsDiscoverFeedValue);
        var isFollowingPinned = pinnedUris.Any(u => string.Equals(u, FollowingFeedKey, StringComparison.OrdinalIgnoreCase));
        var isDiscoverPinned = pinnedUris.Any(IsDiscoverFeedValue);

        // Add back synthetic feeds if they were pinned/saved.
        if (hasFollowingSaved && !feeds.Any(f => string.Equals(f.Uri, FollowingFeedKey, StringComparison.OrdinalIgnoreCase)))
        {
            var following = CreateSyntheticTimelineFeed(FollowingFeedKey, isFollowingPinned);
            following.PinnedOrder = ResolvePinnedOrder(FollowingFeedKey);
            feeds.Insert(0, following);
        }

        if (hasDiscoverSaved && !feeds.Any(f => string.Equals(f.Uri, DiscoverFeedKey, StringComparison.OrdinalIgnoreCase) || IsDiscoverFeedValue(f.Uri)))
        {
            var insertIndex = feeds.Any(f => string.Equals(f.Uri, FollowingFeedKey, StringComparison.OrdinalIgnoreCase)) ? 1 : 0;
            var discover = CreateSyntheticTimelineFeed(DiscoverFeedKey, isDiscoverPinned);
            discover.PinnedOrder = ResolvePinnedOrder(DiscoverFeedKey);
            feeds.Insert(insertIndex, discover);
        }

        // Ensure all saved AT URI feeds still show in My Feeds, even if metadata resolution fails.
        var unresolvedAtUris = atUris
            .Where(uri => !IsDiscoverFeedValue(uri) && !feeds.Any(f => MatchesFeedValue(f.Uri, uri)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var unresolvedUri in unresolvedAtUris)
        {
            var fallback = CreateFallbackRemoteFeed(unresolvedUri);
            fallback.IsSubscribed = true;
            fallback.IsPinned = pinnedUris.Any(x => MatchesFeedValue(unresolvedUri, x));
            fallback.PinnedOrder = ResolvePinnedOrder(unresolvedUri);
            feeds.Add(fallback);
        }

        return MergeFeedsByKey(feeds);
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

        if (feedId == Guid.Empty)
        {
            _logger.LogWarning("[FeedService] SaveFeedAsync: empty GUID without remote uri.");
            return false;
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

        if (feedId == Guid.Empty)
            return false;

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

        if (feedId == Guid.Empty)
        {
            _logger.LogWarning("[FeedService] PinFeedAsync: empty GUID without remote uri (avoid EF FK error).");
            return false;
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

        if (feedId == Guid.Empty)
            return false;

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

            var normalizedFeedUri = CanonicalizeFeedValue(feedUri);

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
                var matchedItems = items
                    .Where(i => MatchesFeedValue(i?["value"]?.GetValue<string>(), normalizedFeedUri))
                    .ToList();

                if (save)
                {
                    var prefType = normalizedFeedUri.StartsWith("at://", StringComparison.OrdinalIgnoreCase) ? "feed" : "timeline";
                    if (matchedItems.Count == 0)
                    {
                        items.Add(new JsonObject {
                            ["id"] = Guid.NewGuid().ToString().Substring(0, 8),
                            ["type"] = prefType,
                            ["value"] = normalizedFeedUri,
                            ["pinned"] = pinAction ?? false
                        });
                    }
                    else
                    {
                        var primary = matchedItems[0];
                        primary["type"] = prefType;
                        primary["value"] = normalizedFeedUri;
                        if (pinAction.HasValue)
                            primary["pinned"] = pinAction.Value;

                        foreach (var extra in matchedItems.Skip(1).ToList())
                            items.Remove(extra);
                    }
                }
                else
                {
                    foreach (var item in matchedItems)
                        items.Remove(item);
                }
            }

            // 3. Put Preferences (Send the whole list back)
            // No need for 'preferences' wrapper if the body itself is the request object conventionally,
            // but app.bsky.actor.putPreferences expects { "preferences": [...] }
            var putResponse = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.actor.putPreferences", queryParams: new Dictionary<string, string?>(), token: token, method: "POST", body: new { preferences = prefs });
            
            if (putResponse.Success)
            {
                _logger.LogInformation("[FeedService] Successfully updated remote feed preferences for {UserId} (Feed: {Uri}, Save: {Save}, Pin: {Pin})", userId, normalizedFeedUri, save, pinAction);
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

    public async Task<bool> ReorderRemotePinnedFeedsAsync(Guid userId, List<string> orderedPinnedKeys)
    {
        if (orderedPinnedKeys == null || orderedPinnedKeys.Count == 0)
            return true;

        var keys = orderedPinnedKeys
            .Select(k => k.Trim())
            .Where(k => k.Length > 0)
            .Select(CanonicalizeFeedValue)
            .ToList();

        try
        {
            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            if (string.IsNullOrEmpty(token)) return false;

            var user = await _unitOfWork.Users.GetByIdAsync(userId);
            if (user == null || string.IsNullOrEmpty(user.Did)) return false;

            var prefResponse = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.actor.getPreferences", queryParams: new Dictionary<string, string?>(), token: token);
            if (!prefResponse.Success) return false;

            var root = JsonNode.Parse(prefResponse.Content);
            if (root == null || root["preferences"] == null) return false;

            var prefs = root["preferences"]!.AsArray();
            var v2Pref = prefs.FirstOrDefault(p => p?["$type"]?.GetValue<string>() == "app.bsky.actor.defs#savedFeedsPrefV2");
            if (v2Pref == null) return false;

            if (v2Pref["items"] is not JsonArray itemsArray)
                return false;

            var all = new List<JsonNode>();
            foreach (var n in itemsArray)
            {
                if (n != null)
                    all.Add(n.DeepClone());
            }

            var pinned = all.Where(n => n["pinned"]?.GetValue<bool>() == true).ToList();
            var unpinned = all.Where(n => n["pinned"]?.GetValue<bool>() != true).ToList();

            var reorderedPinned = new List<JsonNode>();
            var remainingPinned = new List<JsonNode>(pinned);
            foreach (var k in keys)
            {
                var idx = remainingPinned.FindIndex(n =>
                    MatchesFeedValue(n["value"]?.GetValue<string>(), k));

                if (idx >= 0)
                {
                    var node = remainingPinned[idx];
                    reorderedPinned.Add(node);
                    remainingPinned.RemoveAt(idx);
                }
            }

            foreach (var node in remainingPinned)
                reorderedPinned.Add(node);

            var newArr = new JsonArray();
            foreach (var n in reorderedPinned)
                newArr.Add(n);
            foreach (var n in unpinned)
                newArr.Add(n);

            v2Pref["items"] = newArr;

            var putResponse = await _xrpcProxy.ProxyRequestAsync(user.Did, "app.bsky.actor.putPreferences", queryParams: new Dictionary<string, string?>(), token: token, method: "POST", body: new { preferences = prefs });

            if (putResponse.Success)
                _logger.LogInformation("[FeedService] Reordered remote pinned feeds for {UserId}", userId);

            return putResponse.Success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] ReorderRemotePinnedFeedsAsync failed for {UserId}", userId);
            return false;
        }
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

    private static Guid StableFeedIdFromKey(string feedKey)
    {
        var bytes = MD5.HashData(Encoding.UTF8.GetBytes(feedKey));
        return new Guid(bytes);
    }

    private static bool IsOfficialDiscoverFeed(string? name, string? creatorDid, string? creatorHandle)
    {
        if (!string.Equals(name, DiscoverFeedName, StringComparison.OrdinalIgnoreCase))
            return false;

        return string.Equals(creatorDid, DiscoverFeedDid, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(creatorHandle, DiscoverFeedDid, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(creatorHandle, DiscoverFeedHandle, StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsDiscoverFeedValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return false;

        var v = value.Trim();
        return string.Equals(v, DiscoverFeedKey, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(v, DiscoverFeedUri, StringComparison.OrdinalIgnoreCase) ||
               v.StartsWith("at://did:web:discover.bsky.app/app.bsky.feed.generator/", StringComparison.OrdinalIgnoreCase);
    }

    private static string CanonicalizeFeedValue(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return value;

        if (string.Equals(value, FollowingFeedKey, StringComparison.OrdinalIgnoreCase))
            return FollowingFeedKey;

        if (IsDiscoverFeedValue(value))
            return DiscoverFeedUri;

        return value.Trim();
    }

    private static bool MatchesFeedValue(string? existingValue, string targetFeedValue)
    {
        if (string.IsNullOrWhiteSpace(existingValue))
            return false;

        if (string.Equals(existingValue, targetFeedValue, StringComparison.OrdinalIgnoreCase))
            return true;

        return IsDiscoverFeedValue(existingValue) && IsDiscoverFeedValue(targetFeedValue);
    }

    private static FeedDto CreateSyntheticTimelineFeed(string feedKey, bool isPinned = false, bool isSubscribed = true, string? description = null, string? avatarUrl = null, int subscribersCount = 0)
    {
        var normalizedKey = feedKey.ToLowerInvariant();
        var name = normalizedKey == DiscoverFeedKey ? DiscoverFeedName : "Following";

        return new FeedDto
        {
            Id = StableFeedIdFromKey(normalizedKey),
            Tid = normalizedKey,
            Name = name,
            Description = description,
            Handle = normalizedKey,
            Uri = normalizedKey,
            AvatarUrl = avatarUrl,
            IsPinned = isPinned,
            IsSubscribed = isSubscribed,
            SubscribersCount = subscribersCount
        };
    }

    private static FeedDto NormalizeSpecialFeed(FeedDto dto, string? creatorDid = null, string? creatorHandle = null)
    {
        if (!IsOfficialDiscoverFeed(dto.Name, creatorDid ?? dto.Creator?.Did, creatorHandle ?? dto.Creator?.Handle ?? dto.Handle))
            return dto;

        var normalized = CreateSyntheticTimelineFeed(DiscoverFeedKey, dto.IsPinned, dto.IsSubscribed, dto.Description, dto.AvatarUrl, dto.SubscribersCount);
        normalized.Creator = dto.Creator;
        return normalized;
    }

    private static FeedDto CreateFallbackRemoteFeed(string uri)
    {
        var tid = uri.Split('/').LastOrDefault() ?? uri;
        var handlePart = uri.Split('/').Skip(2).FirstOrDefault() ?? "feed";
        var textInfo = CultureInfo.InvariantCulture.TextInfo;
        var normalizedName = tid.Replace('-', ' ').Replace('_', ' ').Trim();
        var friendlyName = string.IsNullOrWhiteSpace(normalizedName)
            ? "Saved Feed"
            : textInfo.ToTitleCase(normalizedName.ToLowerInvariant());

        return new FeedDto
        {
            Id = StableFeedIdFromKey(uri),
            Uri = uri,
            Tid = tid,
            Name = friendlyName,
            Description = "Remote feed metadata is temporarily unavailable.",
            Handle = handlePart,
            IsSubscribed = true,
            IsPinned = false,
            SubscribersCount = 0
        };
    }

    private static List<FeedDto> MergeFeedsByKey(IEnumerable<FeedDto> feeds)
    {
        var merged = new Dictionary<string, FeedDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var feed in feeds)
        {
            var key = feed.Uri ?? feed.Id.ToString();
            if (!merged.TryGetValue(key, out var existing))
            {
                merged[key] = feed;
                continue;
            }

            existing.IsPinned = existing.IsPinned || feed.IsPinned;
            existing.IsSubscribed = existing.IsSubscribed || feed.IsSubscribed;
            existing.SubscribersCount = Math.Max(existing.SubscribersCount, feed.SubscribersCount);
            if (existing.PinnedOrder == 0 && feed.PinnedOrder != 0)
                existing.PinnedOrder = feed.PinnedOrder;
            existing.Description ??= feed.Description;
            existing.AvatarUrl ??= feed.AvatarUrl;
            existing.Creator ??= feed.Creator;
        }

        return merged.Values
            .OrderByDescending(f => f.IsPinned)
            .ThenBy(f => f.PinnedOrder == 0 ? int.MaxValue : f.PinnedOrder)
            .ThenBy(f => f.Name)
            .ToList();
    }

    public async Task<FeedDto?> GetFeedMetadataByUriAsync(string uri)
    {
        if (string.IsNullOrWhiteSpace(uri)) return null;

        if (uri.Equals(FollowingFeedKey, StringComparison.OrdinalIgnoreCase) || uri.Equals(DiscoverFeedKey, StringComparison.OrdinalIgnoreCase))
        {
            return CreateSyntheticTimelineFeed(uri);
        }

        if (!uri.StartsWith("at://", StringComparison.OrdinalIgnoreCase)) return null;

        var noPrefs = new HashSet<string>();
        try
        {
            using var httpClient = _httpClientFactory.CreateClient();
            httpClient.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");

            foreach (var host in new[] { "https://api.bsky.app", "https://public.api.bsky.app" })
            {
                try
                {
                    var batch = await httpClient.GetAsync(
                        $"{host}/xrpc/app.bsky.feed.getFeedGenerators?uris={Uri.EscapeDataString(uri)}");
                    if (batch.IsSuccessStatusCode)
                    {
                        using var genDoc = JsonDocument.Parse(await batch.Content.ReadAsStringAsync());
                        if (genDoc.RootElement.TryGetProperty("feeds", out var feedsArr) && feedsArr.GetArrayLength() > 0)
                            return MapFeedGeneratorRowToDto(feedsArr[0]);
                    }

                    var one = await httpClient.GetAsync(
                        $"{host}/xrpc/app.bsky.feed.getFeedGenerator?feed={Uri.EscapeDataString(uri)}");
                    if (one.IsSuccessStatusCode)
                    {
                        using var doc = JsonDocument.Parse(await one.Content.ReadAsStringAsync());
                        if (doc.RootElement.TryGetProperty("view", out var view))
                            return MapGeneratorViewToDto(view, noPrefs, noPrefs);
                    }
                }
                catch (Exception inner)
                {
                    _logger.LogDebug(inner, "[FeedService] Metadata attempt failed on {Host} for {Uri}", host, uri);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] GetFeedMetadataByUriAsync failed for {Uri}", uri);
        }

        return null;
    }

    private static FeedDto MapFeedGeneratorRowToDto(JsonElement gen)
    {
        var outUri = gen.GetProperty("uri").GetString()!;
        var creatorDid = gen.GetProperty("did").GetString()!;
        var name = gen.GetProperty("displayName").GetString()!;
        if (!gen.TryGetProperty("creator", out var creator))
        {
            var dtoWithoutCreator = new FeedDto
            {
                Id = StableFeedIdFromKey(outUri),
                Uri = outUri,
                Tid = outUri.Split('/').Last(),
                Name = name,
                Description = gen.TryGetProperty("description", out var d0) ? d0.GetString() : null,
                AvatarUrl = gen.TryGetProperty("avatar", out var a0) ? a0.GetString() : null,
                Handle = creatorDid,
                SubscribersCount = gen.TryGetProperty("likeCount", out var lc0) ? lc0.GetInt32() : 0,
                Creator = new AuthorDto { Did = creatorDid, Handle = creatorDid }
            };

            return NormalizeSpecialFeed(dtoWithoutCreator, creatorDid, creatorDid);
        }

        var creatorHandle = creator.TryGetProperty("handle", out var h) ? h.GetString()! : creatorDid;
        var dto = new FeedDto
        {
            Id = StableFeedIdFromKey(outUri),
            Uri = outUri,
            Tid = outUri.Split('/').Last(),
            Name = name,
            Description = gen.TryGetProperty("description", out var desc) ? desc.GetString() : null,
            AvatarUrl = gen.TryGetProperty("avatar", out var av) ? av.GetString() : null,
            Handle = creatorHandle,
            SubscribersCount = gen.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0,
            Creator = new AuthorDto
            {
                Did = creator.GetProperty("did").GetString()!,
                Handle = creator.GetProperty("handle").GetString()!,
                DisplayName = creator.TryGetProperty("displayName", out var dn) ? dn.GetString() : null,
                AvatarUrl = creator.TryGetProperty("avatar", out var cav) ? cav.GetString() : null
            }
        };

        return NormalizeSpecialFeed(dto, creatorDid, creatorHandle);
    }


    public async Task<IEnumerable<PostDto>> GetFeedPostsAsync(Guid feedId, Guid? userId, int skip, int take, string? uri = null)
    {
        try
        {
            // 1. Prioritize Remote Feed URI
            if (!string.IsNullOrEmpty(uri) && (uri.StartsWith("at://") || uri == FollowingFeedKey || uri == DiscoverFeedKey))
            {
                if (uri == FollowingFeedKey && userId.HasValue)
                {
                    return await _postService.GetTimelineAsync(userId.Value, skip, take);
                }

                if (uri == DiscoverFeedKey)
                {
                    if (userId.HasValue)
                    {
                        return await _postService.GetDiscoverPostsAsync(userId.Value, take, skip);
                    }

                    return await _postService.GetTrendingPosts24hAsync(null, take, skip);
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
                    httpClient.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            }

            var fetchLimit = Math.Clamp(take + skip, Math.Max(take, 1), 100);
            List<PostDto>? fallback = null;

            foreach (var host in new[] { "https://api.bsky.app", "https://public.api.bsky.app" })
            {
                try
                {
                    var response = await httpClient.GetAsync(
                        $"{host}/xrpc/app.bsky.feed.getFeed?feed={Uri.EscapeDataString(uri)}&limit={fetchLimit}");

                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("[FeedService] getFeed {Status} on {Host} for {Uri}", response.StatusCode, host, uri);
                        continue;
                    }

                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);
                    if (!doc.RootElement.TryGetProperty("feed", out var feedArray))
                        continue;

                    var posts = _postService.MapBlueskyFeed(feedArray);
                    fallback ??= posts;
                    if (posts.Count > 0)
                    {
                        _logger.LogInformation("[FeedService] getFeed returned {Count} posts from {Host} for {Uri}", posts.Count, host, uri);
                        return posts.Skip(skip).Take(take);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "[FeedService] getFeed error on {Host} for {Uri}", host, uri);
                }
            }

            _logger.LogInformation("[FeedService] getFeed returned no posts for {Uri} (both app views).", uri);
            return (fallback ?? new List<PostDto>()).Skip(skip).Take(take);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] Error fetching remote feed posts for {Uri}", uri);
            return new List<PostDto>();
        }
    }


    public async Task<IEnumerable<FeedDto>> GetActorFeedsAsync(string actor, Guid? viewerId = null)
    {
        try
        {
            string? token = null;
            string? viewerDid = null;

            if (viewerId.HasValue)
            {
                token = await _cache.GetStringAsync($"BlueskyToken_{viewerId.Value}");
                var viewer = await _unitOfWork.Users.GetByIdAsync(viewerId.Value);
                viewerDid = viewer?.Did;
            }

            var queryParams = new Dictionary<string, string?> { ["actor"] = actor };
            
            // 1. Fetch from BlueSky
            XrpcResponse resp;
            if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(viewerDid))
            {
                resp = await _xrpcProxy.ProxyRequestAsync(viewerDid, "app.bsky.feed.getActorFeeds", queryParams, token);
            }
            else
            {
                // Fallback to public if no viewer
                using var client = _httpClientFactory.CreateClient();
                var url = $"https://public.api.bsky.app/xrpc/app.bsky.feed.getActorFeeds?actor={Uri.EscapeDataString(actor)}";
                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode) return new List<FeedDto>();
                resp = new XrpcResponse { Success = true, Content = await response.Content.ReadAsStringAsync() };
            }

            if (!resp.Success) return new List<FeedDto>();

            // 2. Parse and Map
            using var doc = JsonDocument.Parse(resp.Content);
            if (!doc.RootElement.TryGetProperty("feeds", out var feedsArray)) return new List<FeedDto>();

            var savedUris = new HashSet<string>();
            var pinnedUris = new HashSet<string>();
            if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(viewerDid))
            {
                var prefs = await GetUserPreferencesAsync(viewerDid, token);
                if (prefs != null)
                {
                    savedUris = prefs.SavedUris;
                    pinnedUris = prefs.PinnedUris;
                }
            }

            var result = new List<FeedDto>();
            foreach (var gen in feedsArray.EnumerateArray())
            {
                result.Add(MapGeneratorViewToDto(gen, savedUris, pinnedUris));
            }
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[FeedService] Error in GetActorFeedsAsync for {Actor}", actor);
            return new List<FeedDto>();
        }
    }

    public Task PreSeedFeedsAsync()
    {
        return Task.CompletedTask;
    }
}




















