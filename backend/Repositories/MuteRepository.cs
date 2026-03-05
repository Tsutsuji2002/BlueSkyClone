using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class MuteRepository : Repository<MutedAccount>, IMuteRepository
{
    public MuteRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<MutedAccount?> GetAsync(Guid userId, Guid mutedUserId)
    {
        return await _dbSet
            .FirstOrDefaultAsync(m => m.UserId == userId && m.MutedUserId == mutedUserId);
    }

    public async Task<bool> IsMutedAsync(Guid userId, Guid potentialMutedUserId)
    {
        return await _dbSet
            .AnyAsync(m => m.UserId == userId && m.MutedUserId == potentialMutedUserId);
    }

    public async Task<List<MutedAccount>> GetMutedAccountsAsync(Guid userId)
    {
        return await _dbSet
            .Include(m => m.MutedUser)
            .Where(m => m.UserId == userId)
            .ToListAsync();
    }
}
