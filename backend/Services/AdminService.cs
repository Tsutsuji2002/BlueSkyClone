using BSkyClone.DTOs;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class AdminService : IAdminService
{
    private readonly BSkyDbContext _context;

    public AdminService(BSkyDbContext context)
    {
        _context = context;
    }

    public async Task<AdminStatsDto> GetStatsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalPosts = await _context.Posts.CountAsync();
        var totalFeeds = await _context.Feeds.CountAsync();
        var bannedUsers = await _context.Users.CountAsync(u => u.IsBanned);

        var today = DateTime.UtcNow.Date;
        var activeUsersToday = await _context.Posts
            .Where(p => p.CreatedAt >= today)
            .Select(p => p.AuthorId)
            .Distinct()
            .CountAsync();

        var newPostsToday = await _context.Posts
            .CountAsync(p => p.CreatedAt >= today);

        return new AdminStatsDto(
            totalUsers,
            totalPosts,
            totalFeeds,
            activeUsersToday,
            newPostsToday,
            bannedUsers
        );
    }

    public async Task<PaginatedResult<AdminUserDto>> GetUsersAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(u => 
                u.Handle.ToLower().Contains(search) || 
                u.Email.ToLower().Contains(search) ||
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(search))
            );
        }

        var total = await query.CountAsync();

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(u => new AdminUserDto(
                u.Id,
                u.Handle,
                u.Email,
                u.DisplayName,
                u.AvatarUrl,
                u.FollowersCount ?? 0,
                u.PostsCount ?? 0,
                u.IsBanned,
                u.IsVerified,
                u.CreatedAt ?? DateTime.UtcNow,
                u.Role
            ))
            .ToListAsync();

        return new PaginatedResult<AdminUserDto>(users, total, skip, take);
    }

    public async Task<bool> BanUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.IsBanned = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UnbanUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.IsBanned = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ToggleVerifyUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.IsVerified = !user.IsVerified;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PaginatedResult<AdminPostDto>> GetPostsAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.Posts.Include(p => p.Author).AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(p => 
                p.Content.ToLower().Contains(search) || 
                p.Author.Handle.ToLower().Contains(search) ||
                (p.Author.DisplayName != null && p.Author.DisplayName.ToLower().Contains(search))
            );
        }

        var total = await query.CountAsync();

        var posts = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(p => new AdminPostDto(
                p.Id,
                p.Tid,
                p.Content ?? "",
                p.Author.Handle,
                p.Author.DisplayName,
                p.Author.AvatarUrl,
                p.LikesCount ?? 0,
                p.RepostsCount ?? 0,
                p.RepliesCount ?? 0,
                p.CreatedAt ?? DateTime.UtcNow
            ))
            .ToListAsync();

        return new PaginatedResult<AdminPostDto>(posts, total, skip, take);
    }

    public async Task<bool> DeletePostAsync(Guid postId)
    {
        var post = await _context.Posts.FindAsync(postId);
        if (post == null) return false;

        _context.Posts.Remove(post);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PaginatedResult<AdminFeedDto>> GetFeedsAsync(int skip, int take)
    {
        var total = await _context.Feeds.CountAsync();

        var feeds = await _context.Feeds
            .OrderByDescending(f => f.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(f => new AdminFeedDto(
                f.Id,
                f.Name,
                f.Handle,
                f.Description,
                f.AvatarUrl,
                f.SubscribersCount ?? 0,
                f.CreatedAt ?? DateTime.UtcNow,
                f.IsOfficial
            ))
            .ToListAsync();

        return new PaginatedResult<AdminFeedDto>(feeds, total, skip, take);
    }

    public async Task<bool> DeleteFeedAsync(Guid feedId)
    {
        var feed = await _context.Feeds.FindAsync(feedId);
        if (feed == null) return false;

        _context.Feeds.Remove(feed);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<AdminFeedDto?> CreateFeedAsync(CreateFeedRequest request)
    {
        // Check if handle already exists
        var exists = await _context.Feeds.AnyAsync(f => f.Handle.ToLower() == request.Handle.ToLower());
        if (exists) return null;

        var feed = new Feed
        {
            Id = Guid.NewGuid(),
            Tid = GenerateTid(),
            Name = request.Name,
            Handle = request.Handle,
            Description = request.Description,
            AvatarUrl = request.AvatarUrl,
            IsOfficial = request.IsOfficial,
            CreatedAt = DateTime.UtcNow,
            SubscribersCount = 0
        };

        _context.Feeds.Add(feed);
        await _context.SaveChangesAsync();

        return new AdminFeedDto(
            feed.Id,
            feed.Name,
            feed.Handle,
            feed.Description,
            feed.AvatarUrl,
            feed.SubscribersCount ?? 0,
            feed.CreatedAt ?? DateTime.UtcNow,
            feed.IsOfficial
        );
    }

    public async Task<AdminFeedDto?> UpdateFeedAsync(Guid feedId, UpdateFeedRequest request)
    {
        var feed = await _context.Feeds.FindAsync(feedId);
        if (feed == null) return null;

        feed.Name = request.Name;
        feed.Description = request.Description;
        feed.AvatarUrl = request.AvatarUrl;
        feed.IsOfficial = request.IsOfficial;

        await _context.SaveChangesAsync();

        return new AdminFeedDto(
            feed.Id,
            feed.Name,
            feed.Handle,
            feed.Description,
            feed.AvatarUrl,
            feed.SubscribersCount ?? 0,
            feed.CreatedAt ?? DateTime.UtcNow,
            feed.IsOfficial
        );
    }

    private string GenerateTid()
    {
        // Generate a simple TID (Timestamp ID)
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        return timestamp.ToString("x");
    }
}
