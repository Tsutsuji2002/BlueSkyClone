using BSkyClone.DTOs;

namespace BSkyClone.Services;

public interface IAdminService
{
    Task<AdminStatsDto> GetStatsAsync();
    Task<PaginatedResult<AdminUserDto>> GetUsersAsync(int skip, int take, string? searchQuery);
    Task<bool> BanUserAsync(Guid userId);
    Task<bool> UnbanUserAsync(Guid userId);
    Task<bool> ToggleVerifyUserAsync(Guid userId);
    Task<PaginatedResult<AdminPostDto>> GetPostsAsync(int skip, int take, string? searchQuery);
    Task<bool> DeletePostAsync(Guid postId);
    Task<PaginatedResult<AdminFeedDto>> GetFeedsAsync(int skip, int take);
    Task<bool> DeleteFeedAsync(Guid feedId);
    Task<AdminFeedDto?> CreateFeedAsync(CreateFeedRequest request);
    Task<AdminFeedDto?> UpdateFeedAsync(Guid feedId, UpdateFeedRequest request);
}
