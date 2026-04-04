using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public interface IFollowRepository : IRepository<UserFollow>
{
    Task<UserFollow?> GetAsync(Guid followerId, Guid followingId);
    Task<List<UserFollow>> GetFollowersAsync(Guid userId, int skip = 0, int take = 50);
    Task<List<UserFollow>> GetFollowingAsync(Guid userId, int skip = 0, int take = 50);
    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
    Task<Dictionary<Guid, bool>> GetFollowingStatesAsync(Guid followerId, List<Guid> followingIds);
    Task AddOrUpdateAsync(UserFollow follow);
}
