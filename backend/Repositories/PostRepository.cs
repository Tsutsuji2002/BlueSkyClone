using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class PostRepository : Repository<Post>, IPostRepository
{
    public PostRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Post>> GetTimelinePostsAsync(Guid userId, int limit = 50)
    {
        // For now, get posts from followed users + own posts
        // In a real Bluesky clone, this would be more complex (Feeds)
        var followedUserIds = await ((BSkyDbContext)_context).UserFollows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync();

        followedUserIds.Add(userId);

        return await _dbSet
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
            .Where(p => followedUserIds.Contains(p.AuthorId) 
                && (p.IsDeleted == false || p.IsDeleted == null)
                && p.ReplyToPostId == null) // Exclude replies from timeline
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetUserPostsAsync(Guid userId, string? type = null, int limit = 50)
    {
        var query = _dbSet
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
            .Include(p => p.Reposts)
            .Where(p => (p.IsDeleted == false || p.IsDeleted == null));

        if (type == "replies")
        {
            query = query.Where(p => p.AuthorId == userId && p.ReplyToPostId != null);
        }
        else // default to "posts" tab
        {
            // Show original posts + reposts
            // For now, reposts are stored in a separate table, but we might want to include them here.
            // If the user wants reposts in the "Posts" tab, we need to fetch them.
            // Simplified: Show original posts (including those that are replies but we filter them out in main "Posts" tab of some apps)
            // USER requested: "show repost/reply post in Post tab in user profile, only reply posts in replies tab"
            // Wait, "repost/reply post in Post tab" -> usually means "posts and reposts". 
            // Most platforms show "Posts" (posts + reposts) and "Replies" (posts + reposts + replies).
            
            // Let's stick to: 
            // "posts" tab -> original posts (ReplyToPostId == null) by user
            // "replies" tab -> replies by user
            
            // Re-reading user request: "show repost/reply post in Post tab in user profile, only reply posts in replies tab"
            // Actually, usually "Post" tab has everything EXCEPT replies. 
            // But user says: "repost/reply post in Post tab". This is slightly confusing.
            // Maybe they mean: Post tab = original posts + reposts. Replies tab = replies only.
            
            if (string.IsNullOrEmpty(type) || type == "posts")
            {
                // Show original posts (including those that are not replies) OR posts that the user has reposted
                var repostedPostIds = await ((BSkyDbContext)_context).Reposts
                    .Where(r => r.UserId == userId)
                    .Select(r => r.PostId)
                    .ToListAsync();

                query = query.Where(p => (p.AuthorId == userId && p.ReplyToPostId == null) || repostedPostIds.Contains(p.Id));
            }
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }
}
