using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class FollowRepository : IFollowRepository
{
    private readonly BSkyDbContext _context;

    public FollowRepository(BSkyDbContext context)
    {
        _context = context;
    }

    public async Task<UserFollow?> GetAsync(Guid followerId, Guid followingId)
    {
        return await _context.UserFollows
            .FirstOrDefaultAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }

    public async Task AddAsync(UserFollow follow)
    {
        await _context.UserFollows.AddAsync(follow);
    }

    public void Remove(UserFollow follow)
    {
        _context.UserFollows.Remove(follow);
    }

    public async Task<List<UserFollow>> GetFollowersAsync(Guid userId)
    {
        return await _context.UserFollows
            .Include(f => f.Follower)
            .Where(f => f.FollowingId == userId)
            .ToListAsync();
    }

    public async Task<List<UserFollow>> GetFollowingAsync(Guid userId)
    {
        return await _context.UserFollows
            .Include(f => f.Following)
            .Where(f => f.FollowerId == userId)
            .ToListAsync();
    }

    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
    {
        return await _context.UserFollows
            .AnyAsync(f => f.FollowerId == followerId && f.FollowingId == followingId);
    }
}
