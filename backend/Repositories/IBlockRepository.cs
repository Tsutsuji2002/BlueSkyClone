using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IBlockRepository : IRepository<BlockedAccount>
{
    Task<BlockedAccount?> GetAsync(Guid userId, Guid blockedUserId);
    Task<bool> IsBlockedAsync(Guid userId, Guid potentialBlockedUserId);
    Task<List<BlockedAccount>> GetBlockedAccountsAsync(Guid userId);
    Task<List<Guid>> GetBlockedUserIdsAsync(Guid userId);
}
