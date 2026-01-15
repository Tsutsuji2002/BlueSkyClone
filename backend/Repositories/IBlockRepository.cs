using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IBlockRepository
{
    Task<BlockedAccount?> GetAsync(Guid userId, Guid blockedUserId);
    Task AddAsync(BlockedAccount block);
    void Remove(BlockedAccount block);
    Task<bool> IsBlockedAsync(Guid userId, Guid potentialBlockedUserId);
    Task<List<Guid>> GetBlockedUserIdsAsync(Guid userId);
}
