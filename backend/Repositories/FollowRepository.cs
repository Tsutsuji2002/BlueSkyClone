using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class FollowRepository : Repository<UserFollow>, IFollowRepository
{
    public FollowRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<UserFollow?> GetAsync(Guid followerId, Guid followingId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }

    public async Task<List<UserFollow>> GetFollowersAsync(Guid userId, int skip = 0, int take = 50)
    {
        return await _dbSet
            .Include(f => f.Follower)
            .Where(f => f.FollowingId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<List<UserFollow>> GetFollowingAsync(Guid userId, int skip = 0, int take = 50)
    {
        return await _dbSet
            .Include(f => f.Following)
            .Where(f => f.FollowerId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }

    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
    {
        return await _dbSet
            .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }

    public async Task<Dictionary<Guid, bool>> GetFollowingStatesAsync(Guid followerId, List<Guid> followingIds)
    {
        var followedIds = await _dbSet
            .Where(f => f.FollowerId == followerId && followingIds.Contains(f.FollowingId))
            .Select(f => f.FollowingId)
            .ToListAsync();

        return followingIds.ToDictionary(id => id, id => followedIds.Contains(id));
    }

    public async Task AddOrUpdateAsync(UserFollow follow)
    {
        var existing = await _dbSet
            .FirstOrDefaultAsync(f => f.FollowerId == follow.FollowerId && f.FollowingId == follow.FollowingId);

        if (existing == null)
        {
            await _dbSet.AddAsync(follow);
        }
        else
        {
            existing.Uri = follow.Uri;
            existing.CreatedAt = follow.CreatedAt;
            existing.Tid = follow.Tid;
            _dbSet.Update(existing);
        }
    }
}
