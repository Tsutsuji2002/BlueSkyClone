using BSkyClone.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Threading;
using Microsoft.AspNetCore.OutputCaching;
using BSkyClone.Services;
using System.Linq;
using System.Linq;
using BSkyClone.Services;
using System.Linq;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class TrendingController : ControllerBase
{
    private readonly BSkyDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<TrendingController> _logger;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);
    private const string TrendingCacheKey = "trending_topics";
    private static readonly SemaphoreSlim _cacheLock = new SemaphoreSlim(1, 1);

    public TrendingController(BSkyDbContext context, IMemoryCache cache, IXrpcProxyService xrpcProxy, IHttpClientFactory httpClientFactory, ILogger<TrendingController> logger)
    {
        _context = context;
        _cache = cache;
        _xrpcProxy = xrpcProxy;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> GetTrending()
    {
        try
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            Guid? currentUserId = Guid.TryParse(userIdStr, out var cid) ? cid : null;

            _logger.LogInformation("[Trending] GetTrending called for user: {UserId}", currentUserId);

            // Load muted words for user (small query, fine to run per-user)
            var mutedWordsSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (currentUserId.HasValue)
            {
                try
                {
                    var mutedWords = await _context.MutedWords
                        .AsNoTracking()
                        .Where(m => m.UserId == currentUserId.Value)
                        .Select(m => m.Word)
                        .ToListAsync();
                    foreach (var w in mutedWords) mutedWordsSet.Add(w);
                    _logger.LogInformation("[Trending] Loaded {Count} muted words for user {UserId}", mutedWords.Count);
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[Trending] Error fetching muted words: {ex.Message}");
                }
            }

            // Try to get cached trending topics (shared for all users)
            if (!_cache.TryGetValue(TrendingCacheKey, out TrendingCache? cached) || cached == null)
            {
                _logger.LogInformation("[Trending] Cache miss, computing trending data");
                await _cacheLock.WaitAsync();
                try
                {
                    if (!_cache.TryGetValue(TrendingCacheKey, out cached) || cached == null)
                    {
                        cached = await ComputeTrendingFromAtprotoAsync();
                        _cache.Set(TrendingCacheKey, cached, CacheDuration);
                        _logger.LogInformation("[Trending] Computed and cached trending data: {Count} topics", cached.Topics.Count);
                    }
                }
                finally
                {
                    _cacheLock.Release();
                }
            }
            else
            {
                _logger.LogInformation("[Trending] Cache hit, returning cached data: {Count} topics", cached.Topics.Count);
            }

            // Filter by muted words per-user
            var topics = cached.Topics
                .Where(t => !mutedWordsSet.Contains(t.Hashtag.Replace("#", "")))
                .Take(15)
                .ToList();

            var accounts = cached.Accounts;

            _logger.LogInformation("[Trending] Returning {Count} topics and {Count} accounts", topics.Count, accounts.Count);

            return Ok(new { topics, accounts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Trending] Error fetching trending topics");
            return StatusCode(500, new { message = "Error fetching trending topics", details = ex.Message });
        }
    }

    private async Task<TrendingCache> ComputeTrendingFromAtprotoAsync()
    {
        var result = new TrendingCache();

        try
        {
            // Use Bluesky's public API to get trending posts
            // We'll use the "What's Hot" feed which shows trending content
            using var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");

            // Try multiple approaches to get trending data
            var trendingData = await TryGetTrendingFromBlueskyAsync(client);

            if (trendingData != null && trendingData.Count > 0)
            {
                result.Topics = trendingData
                    .Take(15)
                    .Select((item, index) => new TrendingTopic
                    {
                        Id = index.ToString(),
                        Hashtag = item.Hashtag,
                        PostsCount = item.PostsCount,
                        Category = "Trending"
                    })
                    .ToList();

                _logger.LogInformation("[Trending] Successfully fetched {Count} trending topics from Bluesky", result.Topics.Count);
            }
            else
            {
                _logger.LogWarning("[Trending] No trending data from Bluesky, falling back to local");
                result = await ComputeTrendingFromLocalAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Trending] Error fetching trending from Bluesky API");
            result = await ComputeTrendingFromLocalAsync();
        }

        // Get popular accounts from local database
        try
        {
            var accounts = await _context.Users
                .AsNoTracking()
                .Where(u => u.IsDeleted != true && u.IsBanned != true)
                .OrderByDescending(u => u.FollowersCount)
                .Take(5)
                .Select(u => new
                {
                    Id = u.Id.ToString(),
                    DisplayName = u.DisplayName ?? u.Username,
                    Handle = u.Handle,
                    Avatar = u.AvatarUrl,
                    PostsCount = (u.PostsCount ?? 0),
                    Category = "Popular",
                    Type = "account",
                    FollowersAvatars = new List<string> { u.AvatarUrl ?? "" }
                })
                .ToListAsync();

            result.Accounts = accounts.Cast<object>().ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Trending] Error fetching popular accounts");
        }

        return result;
    }

    private async Task<List<TrendingTopic>> TryGetTrendingFromBlueskyAsync(HttpClient client)
    {
        try
        {
            // Try to get trending posts from Bluesky's public API
            var url = "https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrendingTopics";

            _logger.LogInformation("[Trending] Trying to fetch trending from Bluesky API: {Url}", url);

            var response = await client.GetAsync(url);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(content);

                _logger.LogInformation("[Trending] Bluesky trending response received, parsing topics");

                if (doc.RootElement.TryGetProperty("topics", out var topicsArray) && topicsArray.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    var topics = new List<TrendingTopic>();
                    
                    foreach (var item in topicsArray.EnumerateArray())
                    {
                        var topicStr = item.TryGetProperty("topic", out var tEl) ? tEl.GetString() : "";
                        if (!string.IsNullOrEmpty(topicStr))
                        {
                            var hashtag = topicStr.StartsWith("#") ? topicStr : "#" + topicStr.Replace(" ", "");
                            topics.Add(new TrendingTopic
                            {
                                Id = topics.Count.ToString(),
                                Hashtag = hashtag,
                                PostsCount = 1000 - topics.Count, // API doesn't provide count, visually sort by creating decaying dummy count
                                Category = "Trending"
                            });
                        }
                    }

                    if (topics.Count > 0)
                    {
                        _logger.LogInformation("[Trending] Extracted {Count} trending topics from Bluesky", topics.Count);
                        return topics;
                    }
                }
            }
            else
            {
                _logger.LogWarning("[Trending] Bluesky trending API request failed: {Status}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Trending] Error fetching trending from Bluesky timeline");
        }

        return null;
    }

    private async Task<TrendingCache> ComputeTrendingFromLocalAsync()
    {
        var result = new TrendingCache();
        var since = DateTime.UtcNow.AddDays(-3);

        try
        {
            // Limit to 100 top-liked recent posts for expensive phrase analysis (was 300)
            // This ensures we only scan high-engagement content for trending topics.
            var recentPosts = await _context.Posts
                .AsNoTracking()
                .Where(p => p.CreatedAt >= since && p.IsDeleted != true && p.Content != null && p.Content.Length > 5)
                .OrderByDescending(p => p.LikesCount)
                .Take(100)
                .Select(p => p.Content)
                .ToListAsync();

            var phraseCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var nounPhraseRegex = new Regex(@"\b([A-Z0-9]{2,}[a-z0-9]*(?:\s+[A-Z0-9][a-z0-9]*){0,3})\b",
                RegexOptions.Compiled, TimeSpan.FromMilliseconds(100));

            foreach (var content in recentPosts)
            {
                if (string.IsNullOrEmpty(content)) continue;
                try
                {
                    var matches = nounPhraseRegex.Matches(content);
                    foreach (Match match in matches)
                    {
                        var phrase = match.Value.Trim();
                        if (phrase.Length < 4 || IsCommonWord(phrase)) continue;
                        phrase = phrase.TrimEnd('.', ',', '!', '?', ':');
                        phraseCounts[phrase] = phraseCounts.GetValueOrDefault(phrase) + 1;
                    }
                }
                catch (RegexMatchTimeoutException) { /* Skip */ }
            }

            try
            {
                var topHashtags = await _context.Hashtags
                    .AsNoTracking()
                    .OrderByDescending(h => h.PostsCount)
                    .Take(20)
                    .ToListAsync();

                foreach (var tag in topHashtags)
                {
                    var key = "#" + tag.Name;
                    var tagCount = tag.PostsCount ?? 1;
                    phraseCounts[key] = phraseCounts.GetValueOrDefault(key) + tagCount * 2;
                }
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[Trending] Hashtag aggregation failed: {ex.Message}");
            }

            result.Topics = phraseCounts
                .OrderByDescending(kvp => kvp.Value)
                .Take(15)
                .Select((kvp, index) => new TrendingTopic
                {
                    Id = index.ToString(),
                    Hashtag = kvp.Key,
                    PostsCount = kvp.Value,
                    Category = kvp.Key.StartsWith("#") ? "Trending" : "Topic"
                }).ToList();

            if (!result.Topics.Any())
            {
                // Fallback inside the cache generation!
                var fallbackTags = await _context.Hashtags
                    .AsNoTracking()
                    .OrderByDescending(h => h.PostsCount)
                    .Take(15)
                    .ToListAsync();

                result.Topics = fallbackTags.Select(t => new TrendingTopic
                {
                    Id = t.Id.ToString(),
                    Hashtag = "#" + t.Name,
                    PostsCount = t.PostsCount ?? 1,
                    Category = "Global"
                }).ToList();
            }
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[Trending] Compute topics failed: {ex.Message}");
        }

        return result;
    }

    private bool IsCommonWord(string word)
    {
        var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "Then", "This", "That", "There", "Here", "What", "When", "Where", "How",
            "Why", "And", "But", "For", "With", "From", "Very", "Good", "Great", "About",
            "Just", "More", "Some", "Your", "Their", "Should", "Would", "Could"
        };
        return stopWords.Contains(word);
    }

    private class TrendingCache
    {
        public List<TrendingTopic> Topics { get; set; } = new();
        public List<object> Accounts { get; set; } = new();
    }

    private class TrendingTopic
    {
        public string Id { get; set; } = "";
        public string Hashtag { get; set; } = "";
        public int PostsCount { get; set; }
        public string Category { get; set; } = "";
    }

    [HttpGet("debug")]
    [AllowAnonymous]
    public async Task<IActionResult> GetTrendingDebug()
    {
        try
        {
            _logger.LogInformation("[Trending] GetTrendingDebug called");

            // Check cache status
            var cacheExists = _cache.TryGetValue(TrendingCacheKey, out TrendingCache? cached);
            _logger.LogInformation("[Trending] Cache exists: {Exists}, Topics count: {Count}", cacheExists, cached?.Topics?.Count ?? 0);

            // Get fresh data without cache
            var freshData = await ComputeTrendingFromAtprotoAsync();
            _logger.LogInformation("[Trending] Fresh data computed: {Count} topics", freshData.Topics.Count);

            // Get local data
            var localData = await ComputeTrendingFromLocalAsync();
            _logger.LogInformation("[Trending] Local data computed: {Count} topics", localData.Topics.Count);

            // Convert to lists for JSON serialization
            var freshTopicsList = freshData.Topics.Take(5).Select(t => new { t.Hashtag, t.PostsCount, t.Category }).ToList();
            var localTopicsList = localData.Topics.Take(5).Select(t => new { t.Hashtag, t.PostsCount, t.Category }).ToList();

            var freshTopicsListResult = freshTopicsList;
            var localTopicsListResult = localTopicsList;

            return Ok(new
            {
                cacheExists,
                cachedTopics = cached?.Topics?.Count ?? 0,
                freshTopicsCount = freshData.Topics.Count,
                localTopicsCount = localData.Topics.Count,
                freshTopics = freshTopicsListResult,
                localTopics = localTopicsListResult
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Trending] Error in GetTrendingDebug");
            return StatusCode(500, new { message = "Error in debug endpoint", details = ex.Message });
        }
    }
}
