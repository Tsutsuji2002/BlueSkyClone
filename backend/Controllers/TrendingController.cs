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
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[Trending] Error fetching muted words: {ex.Message}");
                }
            }

            // Try to get cached trending topics (shared for all users)
            if (!_cache.TryGetValue(TrendingCacheKey, out TrendingCache? cached) || cached == null)
            {
                await _cacheLock.WaitAsync();
                try
                {
                    if (!_cache.TryGetValue(TrendingCacheKey, out cached) || cached == null)
                    {
                        cached = await ComputeTrendingFromAtprotoAsync();
                        _cache.Set(TrendingCacheKey, cached, CacheDuration);
                    }
                }
                finally
                {
                    _cacheLock.Release();
                }
            }

            // Filter by muted words per-user
            var topics = cached.Topics
                .Where(t => !mutedWordsSet.Contains(t.Hashtag.Replace("#", "")))
                .Take(15)
                .ToList();

            var accounts = cached.Accounts;

            return Ok(new { topics, accounts });
        }
        catch (Exception ex)
        {
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

            var url = "https://public.api.bsky.app/xrpc/app.bsky.feed.getFeedGeneratorFeed?feed=at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot&limit=100";

            _logger.LogInformation("[Trending] Fetching trending from Bluesky API: {Url}", url);

            var response = await client.GetAsync(url);

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = System.Text.Json.JsonDocument.Parse(content);

                if (doc.RootElement.TryGetProperty("feed", out var feedArray) && feedArray.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    var hashtagCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

                    // Extract hashtags from trending posts
                    foreach (var item in feedArray.EnumerateArray())
                    {
                        try
                        {
                            if (item.TryGetProperty("post", out var postEl))
                            {
                                var text = postEl.TryGetProperty("record", out var recordEl) &&
                                          recordEl.TryGetProperty("text", out var textEl) ? textEl.GetString() : "";

                                if (!string.IsNullOrEmpty(text))
                                {
                                    // Extract hashtags using regex
                                    var hashtagRegex = new Regex(@"#(\w+)", RegexOptions.Compiled);
                                    var matches = hashtagRegex.Matches(text);

                                    foreach (Match match in matches)
                                    {
                                        var hashtag = match.Groups[1].Value.ToLower();
                                        hashtagCounts[hashtag] = hashtagCounts.GetValueOrDefault(hashtag) + 1;
                                    }
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogDebug(ex, "[Trending] Error processing feed item");
                        }
                    }

                    // Convert to trending topics
                    result.Topics = hashtagCounts
                        .OrderByDescending(kvp => kvp.Value)
                        .Take(15)
                        .Select((kvp, index) => new TrendingTopic
                        {
                            Id = index.ToString(),
                            Hashtag = "#" + kvp.Key,
                            PostsCount = kvp.Value,
                            Category = "Trending"
                        })
                        .ToList();
                }
            }
            else
            {
                _logger.LogWarning("[Trending] Bluesky API request failed: {Status}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Trending] Error fetching trending from Bluesky API");
        }

        // Fallback to local database if atproto fails
        if (result.Topics.Count == 0)
        {
            _logger.LogInformation("[Trending] Falling back to local database trending");
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
}
