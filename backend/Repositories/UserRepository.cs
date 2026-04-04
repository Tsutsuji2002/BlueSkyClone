using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email)
    {
        return await _dbSet
            .Include(u => u.UserSetting)
            .FirstOrDefaultAsync(u => EF.Functions.Collate(u.Email, "SQL_Latin1_General_CP1_CS_AS") == email);
    }

    public async Task<User?> GetByHandleAsync(string handle)
    {
        if (string.IsNullOrEmpty(handle)) return null;
        var normalized = handle.ToLowerInvariant();
        return await _dbSet
            .Include(u => u.UserSetting)
            .FirstOrDefaultAsync(u => u.Handle.ToLower() == normalized);
    }

    public async Task<User?> GetByUsernameAsync(string username)
    {
        return await _dbSet
            .Include(u => u.UserSetting)
            .FirstOrDefaultAsync(u => u.Username == username);
    }

    public async Task<User?> GetByDidAsync(string did)
    {
        if (string.IsNullOrEmpty(did)) return null;
        var normalized = did.ToLowerInvariant();
        return await _dbSet
            .Include(u => u.UserSetting)
            .FirstOrDefaultAsync(u => u.Did.ToLower() == normalized);
    }
}
