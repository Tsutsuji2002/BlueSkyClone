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
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.PostMedia)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.LinkPreview)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .Include(p => p.Reposts).ThenInclude(r => r.User)
            .Where(p => (followedUserIds.Contains(p.AuthorId) || p.Reposts.Any(r => followedUserIds.Contains(r.UserId)))
                && (p.IsDeleted == false || p.IsDeleted == null)) // Allow replies in timeline
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
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.PostMedia)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.LinkPreview)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .Include(p => p.Reposts)
            .Where(p => (p.IsDeleted == false || p.IsDeleted == null));

        if (type == "replies")
        {
            // Only posts that are replies
            query = query.Where(p => p.AuthorId == userId && p.ReplyToPostId != null);
        }
        else if (type == "media")
        {
            // Posts with images OR videos (for the media grid)
            query = query.Where(p => p.AuthorId == userId && p.PostMedia.Any(m => m.Type == "image" || m.Type == "video"));
        }
        else if (type == "video")
        {
            // Only posts with videos
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
                .Include(l => l.Post.ReplyToPost).ThenInclude(rp => rp!.PostMedia)
                .Include(l => l.Post.ReplyToPost).ThenInclude(rp => rp!.LinkPreview)
                .Include(l => l.Post.QuotePost).ThenInclude(qp => qp!.Author)
                .Include(l => l.Post.QuotePost).ThenInclude(qp => qp!.PostMedia)
                .Include(l => l.Post.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                .OrderByDescending(l => l.CreatedAt)
                .Skip(offset)
                .Take(limit)
                .Select(l => l.Post)
                .ToListAsync();
        }
        else // default to "posts" tab - user's own posts (excluding replies) and their reposts
        {
            query = query.Where(p => (p.AuthorId == userId && p.ReplyToPostId == null) || p.Reposts.Any(r => r.UserId == userId));
        }

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetTrendingPosts24hAsync(int limit = 50, int offset = 0)
    {
        var window = DateTime.UtcNow.AddDays(-7);
        return await _dbSet
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.PostMedia)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.LinkPreview)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .Where(p => (p.IsDeleted == false || p.IsDeleted == null) 
                        && p.ReplyToPostId == null
                        && p.CreatedAt >= window)
            .OrderByDescending(p => (p.LikesCount ?? 0) + (p.RepostsCount ?? 0))
            .ThenByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<Post>> GetPostsByTagAsync(string tag, int limit = 20, int offset = 0)
    {
        return await _dbSet
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.Hashtags)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .Where(p => (p.IsDeleted == false || p.IsDeleted == null) 
                        && p.ReplyToPostId == null
                        && p.Hashtags.Any(h => h.Slug == tag.ToLower() || h.Name.ToLower() == tag.ToLower()))
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();
    }
}
