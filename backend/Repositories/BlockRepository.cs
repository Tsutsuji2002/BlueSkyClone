using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class BlockRepository : IBlockRepository
{
    private readonly BSkyDbContext _context;

    public BlockRepository(BSkyDbContext context)
    {
        _context = context;
    }

    public async Task<BlockedAccount?> GetAsync(Guid userId, Guid blockedUserId)
    {
        return await _context.BlockedAccounts
            .FirstOrDefaultAsync(b => b.UserId == userId && b.BlockedUserId == blockedUserId);
    }

    public async Task AddAsync(BlockedAccount block)
    {
        await _context.BlockedAccounts.AddAsync(block);
    }

    public void Remove(BlockedAccount block)
    {
        _context.BlockedAccounts.Remove(block);
    }

    public async Task<bool> IsBlockedAsync(Guid userId, Guid potentialBlockedUserId)
    {
        return await _context.BlockedAccounts
            .AnyAsync(b => b.UserId == userId && b.BlockedUserId == potentialBlockedUserId);
    }

    public async Task<List<Guid>> GetBlockedUserIdsAsync(Guid userId)
    {
        return await _context.BlockedAccounts
            .Where(b => b.UserId == userId)
            .Select(b => b.BlockedUserId)
            .ToListAsync();
    }
}
