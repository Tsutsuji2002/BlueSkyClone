using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IMuteRepository : IRepository<MutedAccount>
{
    Task<MutedAccount?> GetAsync(Guid userId, Guid mutedUserId);
    Task<bool> IsMutedAsync(Guid userId, Guid potentialMutedUserId);
    Task<List<MutedAccount>> GetMutedAccountsAsync(Guid userId);
}
