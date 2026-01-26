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

    public async Task<IEnumerable<Post>> GetUserPostsAsync(Guid userId, string? type = null, int limit = 50, int offset = 0)
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
        else if (type == "media")
        {
            query = query.Where(p => p.AuthorId == userId && p.PostMedia.Any(m => m.Type == "image"));
        }
        else if (type == "video")
        {
            query = query.Where(p => p.AuthorId == userId && p.PostMedia.Any(m => m.Type == "video"));
        }
        else if (type == "likes")
        {
            return await ((BSkyDbContext)_context).Likes
                .Where(l => l.UserId == userId)
                .Include(l => l.Post.Author)
                .Include(l => l.Post.PostMedia)
                .Include(l => l.Post.LinkPreview)
                .Include(l => l.Post.ReplyToPost).ThenInclude(rp => rp!.Author)
                .OrderByDescending(l => l.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(l => l.Post)
                .ToListAsync();
        }
        else // default to "posts" tab
        {
            var repostedPostIds = await ((BSkyDbContext)_context).Reposts
                .Where(r => r.UserId == userId)
                .Select(r => r.PostId)
                .ToListAsync();

            query = query.Where(p => p.AuthorId == userId || repostedPostIds.Contains(p.Id));
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }
}
