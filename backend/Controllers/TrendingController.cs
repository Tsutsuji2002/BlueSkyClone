using BSkyClone.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
public class TrendingController : ControllerBase
{
    private readonly BSkyDbContext _context;

    public TrendingController(BSkyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetTrending()
    {
        var currentToken = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        Guid? currentUserId = string.IsNullOrEmpty(currentToken) ? null : Guid.Parse(currentToken);

        var mutedWordsSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (currentUserId.HasValue)
        {
            var mutedWords = await _context.MutedWords
                .Where(m => m.UserId == currentUserId.Value)
                .Select(m => m.Word)
                .ToListAsync();
            foreach (var w in mutedWords) mutedWordsSet.Add(w);
        }

        // Rolling 3-day window
        var since = DateTime.UtcNow.AddDays(-3);

        // Fetch recent post content
        var recentPosts = await _context.Posts
            .Where(p => p.CreatedAt >= since && p.IsDeleted != true && p.Content != null && p.Content.Length > 3)
            .OrderByDescending(p => p.CreatedAt)
            .Take(1000) // Analyze up to 1000 recent posts
            .Select(p => p.Content)
            .ToListAsync();

        var phraseCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        
        // Matches "Smiling Friends", "Christopher Lee", "AEW Revolution", "Survivor 50"
        var nounPhraseRegex = new Regex(@"\b([A-Z0-9]{2,}[a-z0-9]*(?:\s+[A-Z0-9][a-z0-9]*){0,3})\b");
        
        foreach (var content in recentPosts)
        {
            if (string.IsNullOrEmpty(content)) continue;
            
            var matches = nounPhraseRegex.Matches(content);
            foreach (Match match in matches)
            {
                var phrase = match.Value.Trim();
                // Filter out short words or common words
                if (phrase.Length < 4) continue;
                if (IsCommonWord(phrase)) continue;
                
                // Clean up trailing punctuation if any
                phrase = phrase.TrimEnd('.', ',', '!', '?', ':');
                
                if (phraseCounts.ContainsKey(phrase)) phraseCounts[phrase]++;
                else phraseCounts[phrase] = 1;
            }
        }

        // Also include Hashtags
        var hashtagCounts = await _context.Posts
            .Where(p => p.CreatedAt >= since && p.IsDeleted != true)
            .SelectMany(p => p.Hashtags)
            .GroupBy(h => h.Name)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .ToListAsync();

        foreach (var tag in hashtagCounts)
        {
            var key = "#" + tag.Name;
            if (phraseCounts.ContainsKey(key)) phraseCounts[key] += (tag.Count * 2); // Weigh hashtags higher
            else phraseCounts[key] = tag.Count * 2;
        }

        var topics = phraseCounts
            .Where(kvp => !mutedWordsSet.Contains(kvp.Key.Replace("#", "")))
            .OrderByDescending(kvp => kvp.Value)
            .Take(15)
            .Select((kvp, index) => new
            {
                Id = index.ToString(),
                Hashtag = kvp.Key,
                PostsCount = kvp.Value,
                Category = kvp.Key.StartsWith("#") ? "Trending" : "Topic"
            }).ToList();

        // Fallback
        if (!topics.Any())
        {
            var fallbackTags = await _context.Hashtags
                .OrderByDescending(h => h.PostsCount)
                .Take(10)
                .ToListAsync();
                
            topics = fallbackTags
                .Where(t => !mutedWordsSet.Contains(t.Name))
                .Select(t => new
                {
                    Id = t.Id.ToString(),
                    Hashtag = "#" + t.Name,
                    PostsCount = t.PostsCount ?? 1,
                    Category = "Global"
                }).ToList();
        }

        // Popular Accounts (Followers growth or overall popularity)
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
                FollowersAvatars = new List<string> { u.AvatarUrl },
                IsPromoted = false,
                TimeAgo = "Last 24h"
            })
            .ToListAsync();

        return Ok(new { topics, accounts });
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
}
