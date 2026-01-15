using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IMuteRepository
{
    Task<MutedAccount?> GetAsync(Guid userId, Guid mutedUserId);
    Task AddAsync(MutedAccount mute);
    void Remove(MutedAccount mute);
    Task<bool> IsMutedAsync(Guid userId, Guid potentialMutedUserId);
}
