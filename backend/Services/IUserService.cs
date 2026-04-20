using BSkyClone.DTOs;
using BSkyClone.Models;

namespace BSkyClone.Services;

public interface IUserService
{
    Task<User?> GetUserByIdAsync(Guid id);
    Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<Guid> userIds);
    Task<User?> GetUserByHandleAsync(string handle);
    Task<User?> GetUserByUsernameAsync(string username);
    Task<User?> GetUserByDidAsync(string did);
    Task<User> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<User> UpdateAccountAsync(Guid userId, UpdateAccountRequest request);
    Task<UserSetting> UpdateSettingsAsync(Guid userId, UserSettingDto request);
    Task<string?> FollowUserAsync(Guid followerId, Guid followingId);
    Task<bool> UnfollowUserAsync(Guid followerId, Guid followingId);
    Task<bool> IsFollowingAsync(Guid followerId, Guid followingId);
    Task<UserFollow?> GetFollowAsync(Guid followerId, Guid followingId);
    Task<(List<User> Users, string? Cursor)> GetFollowersAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null);
    Task<(List<User> Users, string? Cursor)> GetFollowingAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null);

    Task<bool> BlockUserAsync(Guid userId, Guid blockedUserId);
    Task<bool> UnblockUserAsync(Guid userId, Guid blockedUserId);
    Task<bool> IsBlockedAsync(Guid userId, Guid potentialBlockedUserId); // Did userId block potential?
    Task<bool> IsBlockedByAsync(Guid userId, Guid potentialBlockerId); // Did potential block userId?
    Task<BlockedAccount?> GetBlockAsync(Guid userId, Guid blockedUserId);
    Task<bool> MuteUserAsync(Guid userId, Guid mutedUserId);
    Task<MutedByListDto?> GetMutingListAsync(Guid viewerId, Guid targetUserId);
    Task<bool> UnmuteUserAsync(Guid userId, Guid mutedUserId);
    Task<bool> IsMutedAsync(Guid userId, Guid potentialMutedUserId);
    Task<(List<User> Users, string? Cursor)> GetMutedUsersAsync(Guid userId, int limit = 50, string? cursor = null);
    Task<(List<User> Users, string? Cursor)> GetBlockedUsersAsync(Guid userId, int limit = 50, string? cursor = null);
    Task<List<User>> SearchUsersAsync(string query, int limit = 10);
    Task<IEnumerable<User>> SearchActorsRemoteAsync(string query, string token, int skip = 0, int take = 20, Guid? viewerId = null);
    Task<List<MutedWord>> GetMutedWordsAsync(Guid userId);
    Task<MutedWord> AddMutedWordAsync(Guid userId, string word, string behavior, string targets = "content", DateTime? expiresAt = null, bool excludeFollowing = false);
    Task<bool> DeleteMutedWordAsync(Guid userId, int mutedWordId);
    Task<List<string>> GetSelectedInterestsAsync(Guid userId);
    Task SaveSelectedInterestsAsync(Guid userId, List<string> interests);
    Task<bool> VerifyDomainAsync(Guid userId, string? handle = null);
    Task<bool> UpdateHandleAsync(Guid userId, string newHandle);
    Task<User?> ResolveRemoteProfileAsync(string identifier, string? token = null, Guid? viewerId = null);
    Task<Dictionary<Guid, UserRelationshipStatusDto>> GetInteractionStatusesAsync(Guid viewerId, IEnumerable<Guid> targetIds, bool refreshRemote = true);
    Task<(List<UserDto> Users, string? Cursor)> GetRemoteFollowersDtosAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null);
    Task<(List<UserDto> Users, string? Cursor)> GetRemoteFollowingDtosAsync(string actor, int limit = 50, string? cursor = null, Guid? viewerId = null);
    Task<User?> ResolveStubRemoteProfileAsync(System.Text.Json.JsonElement profileElement, Dictionary<string, User> existingUsers, bool complete = true, Guid? viewerId = null, bool mergeDuplicates = true);
    Task<List<User>> GetSuggestedUsersAsync(int limit = 10);
    Task SyncMutedWordsWithAtProtoAsync(Guid userId);
    Task<bool> MergeDuplicateUsersAsync(string did);
    Task<bool> MergeDuplicateUsersBatchAsync(IEnumerable<string> dids);
    Task<string?> GetOrRefreshBlueskyTokenAsync(Guid userId);
}
