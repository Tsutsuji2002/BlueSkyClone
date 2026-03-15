using BSkyClone.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class TrendingController : ControllerBase
{
    private readonly BSkyDbContext _context;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(10);
    private const string TrendingCacheKey = "trending_topics";

    public TrendingController(BSkyDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrending()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        Guid? currentUserId = Guid.TryParse(userIdStr, out var cid) ? cid : null;

        // Load muted words for user (small query, fine to run per-user)
        var mutedWordsSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (currentUserId.HasValue)
        {
            var mutedWords = await _context.MutedWords
                .Where(m => m.UserId == currentUserId.Value)
                .Select(m => m.Word)
                .ToListAsync();
            foreach (var w in mutedWords) mutedWordsSet.Add(w);
        }

        // Try to get cached trending topics (shared for all users)
        if (!_cache.TryGetValue(TrendingCacheKey, out TrendingCache? cached) || cached == null)
        {
            cached = await ComputeTrendingAsync();
            _cache.Set(TrendingCacheKey, cached, CacheDuration);
        }

        // Filter by muted words per-user
        var topics = cached.Topics
            .Where(t => !mutedWordsSet.Contains(t.Hashtag.Replace("#", "")))
            .Take(15)
            .ToList();

        var accounts = cached.Accounts;

        if (!topics.Any())
        {
            // Fallback to DB hashtags if no computed topics
            var fallbackTags = await _context.Hashtags
                .OrderByDescending(h => h.PostsCount)
                .Take(10)
                .ToListAsync();

            topics = fallbackTags
                .Where(t => !mutedWordsSet.Contains(t.Name))
                .Select(t => new TrendingTopic
                {
                    Id = t.Id.ToString(),
                    Hashtag = "#" + t.Name,
                    PostsCount = t.PostsCount ?? 1,
                    Category = "Global"
                }).ToList();
        }

        return Ok(new { topics, accounts });
    }

    private async Task<TrendingCache> ComputeTrendingAsync()
    {
        var since = DateTime.UtcNow.AddDays(-3);

        // Limit to 300 posts for performance (was 1000)
        var recentPosts = await _context.Posts
            .Where(p => p.CreatedAt >= since && p.IsDeleted != true && p.Content != null && p.Content.Length > 3)
            .OrderByDescending(p => p.LikesCount)
            .Take(300)
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
            catch (RegexMatchTimeoutException) { /* Skip this post if regex times out */ }
        }

        var hashtagCounts = await _context.Posts
            .Where(p => p.CreatedAt >= since && p.IsDeleted != true)
            .SelectMany(p => p.Hashtags)
            .GroupBy(h => h.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .ToListAsync();

        foreach (var tag in hashtagCounts)
        {
            var key = "#" + tag.Name;
            phraseCounts[key] = phraseCounts.GetValueOrDefault(key) + tag.Count * 2;
        }

        var topics = phraseCounts
            .OrderByDescending(kvp => kvp.Value)
            .Take(20) // Store 20 so muted-word filtering has enough
            .Select((kvp, index) => new TrendingTopic
            {
                Id = index.ToString(),
                Hashtag = kvp.Key,
                PostsCount = kvp.Value,
                Category = kvp.Key.StartsWith("#") ? "Trending" : "Topic"
            }).ToList();

        var accounts = await _context.Users
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
                FollowersAvatars = new List<string> { u.AvatarUrl ?? "" },
                IsPromoted = false,
                TimeAgo = "Last 24h"
            })
            .ToListAsync();

        return new TrendingCache { Topics = topics, Accounts = accounts.Cast<object>().ToList() };
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
