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
    Task<UserSetting> UpdateSettingsAsync(Guid userId, UserSettingDto request);
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
    Task<List<User>> GetMutedUsersAsync(Guid userId);
    Task<List<User>> GetBlockedUsersAsync(Guid userId);
    Task<List<User>> SearchUsersAsync(string query, int limit = 10);
    Task<List<MutedWord>> GetMutedWordsAsync(Guid userId);
    Task<MutedWord> AddMutedWordAsync(Guid userId, string word, string behavior);
    Task<bool> DeleteMutedWordAsync(Guid userId, int mutedWordId);
    Task<List<string>> GetSelectedInterestsAsync(Guid userId);
    Task SaveSelectedInterestsAsync(Guid userId, List<string> interests);
    Task<bool> VerifyDomainAsync(Guid userId);
}
