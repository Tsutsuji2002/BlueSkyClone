using BSkyClone.DTOs;

namespace BSkyClone.Services;

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync();
    Task<PaginatedResult<AdminUserDto>> GetUsersAsync(int skip, int take, string? searchQuery);
    Task<bool> BanUserAsync(Guid userId);
    Task<bool> UnbanUserAsync(Guid userId);
    Task<bool> ToggleVerifyUserAsync(Guid userId);
    Task<bool> ChangeUserRoleAsync(Guid userId, string role);
    Task<PaginatedResult<AdminPostDto>> GetPostsAsync(int skip, int take, string? searchQuery, bool includeDeleted = false, bool onlyDeleted = false);
    Task<bool> DeletePostAsync(Guid postId);
    Task<bool> HidePostAsync(Guid postId);
    Task<bool> DeletePostPermanentAsync(Guid postId);
    Task<PaginatedResult<AdminFeedDto>> GetFeedsAsync(int skip, int take, string? searchQuery);
    Task<PaginatedResult<AdminUserDto>> GetFeedSubscribersAsync(Guid feedId, int skip, int take, string? searchQuery);
    Task<bool> DeleteFeedAsync(Guid feedId);
    Task<AdminFeedDto?> CreateFeedAsync(CreateFeedRequest request);
    Task<AdminFeedDto?> UpdateFeedAsync(Guid feedId, UpdateFeedRequest request);
    Task<PaginatedResult<AdminInterestDto>> GetInterestsAsync(int skip, int take, string? searchQuery); // Assuming interest is just a string tag for now, or existing DTO
    Task<PaginatedResult<AdminUserDto>> GetInterestUsersAsync(string interest, int skip, int take, string? searchQuery);
    Task<bool> DeleteInterestAsync(string interest);
    Task<PaginatedResult<AdminListDto>> GetListsAsync(int skip, int take, string? searchQuery);
    Task<bool> DeleteListAsync(Guid listId);
    Task<PaginatedResult<AdminUserDto>> GetListMembersAsync(Guid listId, int skip, int take, string? searchQuery);
    Task<PaginatedResult<AdminConversationDto>> GetConversationsAsync(int skip, int take, string? searchQuery);
    Task<bool> DeleteConversationAsync(Guid conversationId);
    Task<PaginatedResult<AdminBlockDto>> GetBlocksAsync(int skip, int take, string? searchQuery);
    Task<PaginatedResult<AdminMuteDto>> GetMutesAsync(int skip, int take, string? searchQuery);
    Task<bool> BroadcastNotificationAsync(BroadcastNotificationRequest request);
}
