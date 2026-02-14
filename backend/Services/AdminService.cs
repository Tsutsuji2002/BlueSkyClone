using BSkyClone.DTOs;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using BSkyClone.Hubs;

namespace BSkyClone.Services;

public class AdminService : IAdminService
{
    private readonly BSkyDbContext _context;
    private readonly IHubContext<ChatHub> _hubContext;

    public AdminService(BSkyDbContext context, IHubContext<ChatHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    public async Task<AdminStatsDto> GetStatsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalPosts = await _context.Posts.CountAsync();
        var totalFeeds = await _context.Feeds.CountAsync();
        var bannedUsers = await _context.Users.CountAsync(u => u.IsBanned);
        var totalLists = await _context.Lists.CountAsync(l => l.IsDeleted != true);
        var totalConversations = await _context.Conversations.CountAsync(c => c.IsDeleted != true);
        var totalNotifications = await _context.Notifications.CountAsync();

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
            bannedUsers,
            totalLists,
            totalConversations,
            totalNotifications
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

    public async Task<bool> ChangeUserRoleAsync(Guid userId, string role)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        var validRoles = new[] { "user", "admin" };
        if (!validRoles.Contains(role.ToLower())) return false;

        user.Role = role.ToLower();
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PaginatedResult<AdminPostDto>> GetPostsAsync(int skip, int take, string? searchQuery, bool includeDeleted = false, bool onlyDeleted = false)
    {
        var query = _context.Posts
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .AsQueryable();

        if (onlyDeleted)
        {
            query = query.Where(p => p.IsDeleted == true);
        }
        else if (!includeDeleted)
        {
            query = query.Where(p => p.IsDeleted != true);
        }

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(p => 
                (p.Content != null && p.Content.ToLower().Contains(search)) || 
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
                p.CreatedAt ?? DateTime.UtcNow,
                p.PostMedia.Where(m => m.IsDeleted != true && m.Type != "video").Select(m => m.Url).ToList(),
                p.IsDeleted ?? false,
                p.PostMedia.Where(m => m.Type == "video" && m.IsDeleted != true).Select(m => m.Url).FirstOrDefault(),
                p.LinkPreview != null ? p.LinkPreview.Title : null,
                p.LinkPreview != null ? p.LinkPreview.Description : null,
                p.LinkPreview != null ? p.LinkPreview.Image : null,
                p.LinkPreview != null ? p.LinkPreview.Url : null
            ))
            .ToListAsync();

        return new PaginatedResult<AdminPostDto>(posts, total, skip, take);
    }

    public async Task<bool> HidePostAsync(Guid postId)
    {
        var post = await _context.Posts.FindAsync(postId);
        if (post == null) return false;

        post.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DeletePostPermanentAsync(Guid postId)
    {
        var post = await _context.Posts.FindAsync(postId);
        if (post == null) return false;

        _context.Posts.Remove(post);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PaginatedResult<AdminUserDto>> GetFeedSubscribersAsync(Guid feedId, int skip, int take, string? searchQuery)
    {
        var query = _context.UserFeedSubscriptions
            .Where(s => s.FeedId == feedId)
            .Include(s => s.User)
            .Select(s => s.User)
            .AsQueryable();

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

    public async Task<PaginatedResult<AdminInterestDto>> GetInterestsAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.Interests
            .Where(i => i.IsDeleted != true)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(i => i.Name.ToLower().Contains(search));
        }

        var total = await query.CountAsync();

        var interests = await query
            .OrderBy(i => i.Name)
            .Skip(skip)
            .Take(take)
            .Select(i => new AdminInterestDto(
                i.Name,
                i.Users.Count,
                DateTime.UtcNow // Interest model lacks CreatedAt
            ))
            .ToListAsync();

        return new PaginatedResult<AdminInterestDto>(interests, total, skip, take);
    }

    public async Task<PaginatedResult<AdminUserDto>> GetInterestUsersAsync(string interestName, int skip, int take, string? searchQuery)
    {
         var query = _context.Users
            .Where(u => u.Interests.Any(i => i.Name == interestName) && u.IsDeleted != true)
            .AsQueryable();

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

    public async Task<bool> DeleteInterestAsync(string interestName)
    {
        var interest = await _context.Interests.FirstOrDefaultAsync(i => i.Name == interestName);
        if (interest == null) return false;

        interest.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }


    public async Task<bool> DeletePostAsync(Guid postId)
    {
        var post = await _context.Posts.FindAsync(postId);
        if (post == null) return false;

        _context.Posts.Remove(post);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PaginatedResult<AdminFeedDto>> GetFeedsAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.Feeds.AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(f =>
                f.Name.ToLower().Contains(search) ||
                f.Handle.ToLower().Contains(search) ||
                (f.Description != null && f.Description.ToLower().Contains(search))
            );
        }

        var total = await query.CountAsync();

        var feeds = await query
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

    // ── Lists Management ──

    public async Task<PaginatedResult<AdminListDto>> GetListsAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.Lists
            .Include(l => l.Owner)
            .Where(l => l.IsDeleted != true);

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(l =>
                l.Name.ToLower().Contains(search) ||
                l.Owner.Handle.ToLower().Contains(search) ||
                (l.Description != null && l.Description.ToLower().Contains(search))
            );
        }

        var total = await query.CountAsync();

        var lists = await query
            .OrderByDescending(l => l.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(l => new AdminListDto(
                l.Id,
                l.Name,
                l.Description,
                l.Purpose,
                l.Owner.Handle,
                l.Owner.DisplayName,
                l.Owner.AvatarUrl,
                l.ListMembers.Count,
                l.ListPosts.Count,
                l.CreatedAt ?? DateTime.UtcNow,
                l.IsCurated
            ))
            .ToListAsync();

        return new PaginatedResult<AdminListDto>(lists, total, skip, take);
    }

    public async Task<bool> DeleteListAsync(Guid listId)
    {
        var list = await _context.Lists.FindAsync(listId);
        if (list == null) return false;

        list.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<PaginatedResult<AdminUserDto>> GetListMembersAsync(Guid listId, int skip, int take, string? searchQuery)
    {
        var query = _context.ListMembers
            .Where(m => m.ListId == listId)
            .Include(m => m.User)
            .Select(m => m.User)
            .AsQueryable();

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

    // ── Conversations Management ──

    public async Task<PaginatedResult<AdminConversationDto>> GetConversationsAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.Conversations
            .Include(c => c.ConversationParticipants)
                .ThenInclude(cp => cp.User)
            .Include(c => c.Messages)
            .Where(c => c.IsDeleted != true);

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(c =>
                c.ConversationParticipants.Any(cp => cp.User.Handle.ToLower().Contains(search))
            );
        }

        var total = await query.CountAsync();

        var conversations = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(c => new AdminConversationDto(
                c.Id,
                c.ConversationParticipants.Select(cp => cp.User.Handle).ToList(),
                c.Messages.Count(m => m.IsDeleted != true),
                c.Messages
                    .Where(m => m.IsDeleted != true)
                    .OrderByDescending(m => m.CreatedAt)
                    .Select(m => m.CreatedAt)
                    .FirstOrDefault(),
                c.CreatedAt ?? DateTime.UtcNow
            ))
            .ToListAsync();

        return new PaginatedResult<AdminConversationDto>(conversations, total, skip, take);
    }

    public async Task<bool> DeleteConversationAsync(Guid conversationId)
    {
        var conversation = await _context.Conversations.FindAsync(conversationId);
        if (conversation == null) return false;

        conversation.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    // ── Moderation: Blocks & Mutes ──

    public async Task<PaginatedResult<AdminBlockDto>> GetBlocksAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.BlockedAccounts
            .Include(b => b.User)
            .Include(b => b.BlockedUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(b =>
                b.User.Handle.ToLower().Contains(search) ||
                b.BlockedUser.Handle.ToLower().Contains(search)
            );
        }

        var total = await query.CountAsync();

        var blocks = await query
            .OrderByDescending(b => b.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(b => new AdminBlockDto(
                b.User.Handle,
                b.User.DisplayName,
                b.BlockedUser.Handle,
                b.BlockedUser.DisplayName,
                b.CreatedAt
            ))
            .ToListAsync();

        return new PaginatedResult<AdminBlockDto>(blocks, total, skip, take);
    }

    public async Task<PaginatedResult<AdminMuteDto>> GetMutesAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.MutedAccounts
            .Include(m => m.User)
            .Include(m => m.MutedUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(m =>
                m.User.Handle.ToLower().Contains(search) ||
                m.MutedUser.Handle.ToLower().Contains(search)
            );
        }

        var total = await query.CountAsync();

        var mutes = await query
            .OrderByDescending(m => m.CreatedAt)
            .Skip(skip)
            .Take(take)
            .Select(m => new AdminMuteDto(
                m.User.Handle,
                m.User.DisplayName,
                m.MutedUser.Handle,
                m.MutedUser.DisplayName,
                m.CreatedAt
            ))
            .ToListAsync();

        return new PaginatedResult<AdminMuteDto>(mutes, total, skip, take);
    }

    public async Task<PaginatedResult<AdminHashtagDto>> GetHashtagsAsync(int skip, int take, string? searchQuery)
    {
        var query = _context.Hashtags
            .Where(h => h.IsDeleted != true)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(searchQuery))
        {
            var search = searchQuery.ToLower();
            query = query.Where(h => h.Name.ToLower().Contains(search) || h.Slug.ToLower().Contains(search));
        }

        var total = await query.CountAsync();

        var hashtags = await query
            .OrderByDescending(h => h.PostsCount)
            .Skip(skip)
            .Take(take)
            .Select(h => new AdminHashtagDto(
                h.Id,
                h.Name,
                h.Slug,
                h.PostsCount ?? 0,
                h.CreatedAt ?? DateTime.UtcNow
            ))
            .ToListAsync();

        return new PaginatedResult<AdminHashtagDto>(hashtags, total, skip, take);
    }

    public async Task<bool> DeleteHashtagAsync(int hashtagId)
    {
        var hashtag = await _context.Hashtags.FindAsync(hashtagId);
        if (hashtag == null) return false;

        hashtag.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    // ── Notification Broadcasting ──

    public async Task<bool> BroadcastNotificationAsync(BroadcastNotificationRequest request)
    {
        var usersQuery = _context.Users
            .Where(u => !u.IsBanned && u.IsDeleted != true);

        if (!string.IsNullOrEmpty(request.TargetRole) && request.TargetRole.ToLower() != "all")
        {
            var target = request.TargetRole.ToLower();
            // Case-insensitive role comparison, treating NULL as "user"
            usersQuery = usersQuery.Where(u => 
                u.Role.ToLower() == target || 
                (target == "user" && (u.Role == null || u.Role == "")));
        }

        var users = await usersQuery
            .Select(u => u.Id)
            .ToListAsync();

        if (!users.Any()) return false;

        // Use a system sender (first admin or create a system concept)
        var systemAdmin = await _context.Users.FirstOrDefaultAsync(u => u.Role.ToLower() == "admin");
        if (systemAdmin == null) return false;

        var now = DateTime.UtcNow;
        var baseTid = GenerateTid();
        int counter = 0;

        var notifications = users.Select(userId => new Notification
        {
            Id = Guid.NewGuid(),
            // Append a counter to ensure uniqueness in bulk even within the same tick
            Tid = $"{baseTid}_{counter++:x}", 
            Type = request.Type ?? "system",
            RecipientId = userId,
            SenderId = systemAdmin.Id,
            Title = request.Title,
            Content = request.Content,
            IsRead = false,
            CreatedAt = now,
            IsDeleted = false
        }).ToList();

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync();

        // Broadcast via SignalR
        var systemAdminDto = new UserDto(
            systemAdmin.Id,
            systemAdmin.Username,
            systemAdmin.Handle,
            systemAdmin.Email,
            systemAdmin.DisplayName,
            systemAdmin.AvatarUrl,
            systemAdmin.CoverImageUrl,
            systemAdmin.Bio,
            systemAdmin.Location,
            systemAdmin.Website,
            systemAdmin.DateOfBirth,
            systemAdmin.FollowersCount,
            systemAdmin.FollowingCount,
            systemAdmin.PostsCount
        );

        foreach (var notification in notifications)
        {
            var dto = new NotificationDto(
                notification.Id,
                notification.Type ?? "system",
                systemAdminDto,
                notification.PostId,
                notification.ListId,
                notification.Title,
                notification.Content,
                false,
                DateTime.SpecifyKind(notification.CreatedAt ?? DateTime.UtcNow, DateTimeKind.Utc)
            );

            await _hubContext.Clients.Group($"user-{notification.RecipientId}")
                .SendAsync("ReceiveNotification", dto);
        }

        return true;
    }

    private string GenerateTid()
    {
        // Generate a high-precision hex TID based on Ticks (100ns resolution)
        return DateTime.UtcNow.Ticks.ToString("x");
    }
}
