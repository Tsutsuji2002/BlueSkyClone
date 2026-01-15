using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public interface IFollowRepository
{
    Task<UserFollow?> GetAsync(Guid followerId, Guid followingId);
    Task AddAsync(UserFollow follow);
    void Remove(UserFollow follow);
    Task<List<UserFollow>> GetFollowersAsync(Guid userId);
    Task<List<UserFollow>> GetFollowingAsync(Guid userId);
    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
}
