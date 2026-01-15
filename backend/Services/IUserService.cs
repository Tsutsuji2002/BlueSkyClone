using BSkyClone.DTOs;
using BSkyClone.Models;

namespace BSkyClone.Services;

public interface IUserService
{
    Task<User?> GetUserByIdAsync(Guid id);
    Task<User?> GetUserByHandleAsync(string handle);
    Task<User?> GetUserByUsernameAsync(string username);
    Task<User> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<User> UpdateAccountAsync(Guid userId, UpdateAccountRequest request);
    Task<bool> FollowUserAsync(Guid followerId, Guid followingId);
    Task<bool> UnfollowUserAsync(Guid followerId, Guid followingId);
    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
    Task<List<User>> GetFollowersAsync(Guid userId);
    Task<List<User>> GetFollowingAsync(Guid userId);

    Task<bool> BlockUserAsync(Guid userId, Guid blockedUserId);
    Task<bool> UnblockUserAsync(Guid userId, Guid blockedUserId);
    Task<bool> IsBlockedAsync(Guid userId, Guid potentialBlockedUserId); // Did userId block potential?
    Task<bool> IsBlockedByAsync(Guid userId, Guid potentialBlockerId); // Did potential block userId?

    Task<bool> MuteUserAsync(Guid userId, Guid mutedUserId);
    Task<bool> UnmuteUserAsync(Guid userId, Guid mutedUserId);
    Task<bool> IsMutedAsync(Guid userId, Guid potentialMutedUserId);
}
