using BSkyClone.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous] // Allow viewing trending topics even without login, but filter muted words if logged in
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

        // Fetch top hashtags over rolling window, considering frequency
        var topTagsQuery = await _context.Posts
            .Where(p => p.CreatedAt >= since && p.IsDeleted != true && p.Content != null)
            .SelectMany(p => p.Hashtags)
            .GroupBy(h => h.Name)
            .Select(g => new { Hashtag = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(50)
            .ToListAsync();

        var topics = topTagsQuery
            .Where(t => !mutedWordsSet.Contains(t.Hashtag))
            .Take(10)
            .Select((t, index) => new
            {
                Id = index.ToString(),
                Hashtag = "#" + t.Hashtag,
                PostsCount = t.Count,
                Category = "Trending"
            }).ToList();

        // Fallback: Use historic Hashtags data if nothing active recently
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

        // Trending Accounts based on sudden spike in mentions (velocity) or just overall popularity for now
        var accounts = await _context.Users
            .Where(u => u.IsDeleted != true && u.IsBanned != true)
            .OrderByDescending(u => u.FollowersCount)
            .Take(5)
            .Select(u => new
            {
                Id = u.Id.ToString(),
                DisplayName = u.DisplayName ?? u.Username,
                Handle = u.Handle,
                PostsCount = (u.PostsCount ?? 0) + " posts",
                Category = "Popular",
                Type = "account",
                FollowersAvatars = new List<string> { u.AvatarUrl },
                IsPromoted = false,
                TimeAgo = "Last 24h"
            })
            .ToListAsync();

        return Ok(new { topics, accounts });
    }
}
