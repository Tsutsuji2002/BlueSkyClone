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

    public async Task<List<UserFollow>> GetFollowersAsync(Guid userId)
    {
        return await _dbSet
            .Include(f => f.Follower)
            .Where(f => f.FollowingId == userId)
            .ToListAsync();
    }

    public async Task<List<UserFollow>> GetFollowingAsync(Guid userId)
    {
        return await _dbSet
            .Include(f => f.Following)
            .Where(f => f.FollowerId == userId)
            .ToListAsync();
    }

    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
    {
        return await _dbSet
            .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }
}
