using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class MuteRepository : IMuteRepository
{
    private readonly BSkyDbContext _context;

    public MuteRepository(BSkyDbContext context)
    {
        _context = context;
    }

    public async Task<MutedAccount?> GetAsync(Guid userId, Guid mutedUserId)
    {
        return await _context.MutedAccounts
            .FirstOrDefaultAsync(m => m.UserId == userId && m.MutedUserId == mutedUserId);
    }

    public async Task AddAsync(MutedAccount mute)
    {
        await _context.MutedAccounts.AddAsync(mute);
    }

    public void Remove(MutedAccount mute)
    {
        _context.MutedAccounts.Remove(mute);
    }

    public async Task<bool> IsMutedAsync(Guid userId, Guid potentialMutedUserId)
    {
        return await _context.MutedAccounts
            .AnyAsync(m => m.UserId == userId && m.MutedUserId == potentialMutedUserId);
    }
}
