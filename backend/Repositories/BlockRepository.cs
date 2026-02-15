using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class BlockRepository : Repository<BlockedAccount>, IBlockRepository
{
    public BlockRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<BlockedAccount?> GetAsync(Guid userId, Guid blockedUserId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);
    }

    public async Task AddAsync(BlockedAccount block)
    {
        await _dbSet.AddAsync(block);
    }

    public void Remove(BlockedAccount block)
    {
        _dbSet.Remove(block);
    }

    public async Task<bool> IsBlockedAsync(Guid userId, Guid potentialBlockedUserId)
    {
        return await _dbSet
            .AnyAsync(b => b.UserId == userId && b.BlockedUserId == potentialBlockedUserId);
    }

    public async Task<List<BlockedAccount>> GetBlockedAccountsAsync(Guid userId)
    {
        return await _dbSet
            .Include(b => b.BlockedUser)
            .Where(b => b.UserId == userId)
            .ToListAsync();
    }

    public async Task<List<Guid>> GetBlockedUserIdsAsync(Guid userId)
    {
        return await _dbSet
            .Where(b => b.UserId == userId)
            .Select(b => b.BlockedUserId)
            .ToListAsync();
    }
}
