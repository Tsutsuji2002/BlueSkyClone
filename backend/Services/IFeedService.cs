using BSkyClone.DTOs;

namespace BSkyClone.Services;

public interface IFeedService
{
    Task<IEnumerable<FeedDto>> GetTrendingFeedsAsync(Guid userId);
    Task<IEnumerable<FeedDto>> GetUserFeedsAsync(Guid userId);
    Task<FeedDto?> GetFeedByTidAsync(string tid);
    Task<bool> SaveFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> UnsaveFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> PinFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> UnpinFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> ReorderFeedsAsync(Guid userId, List<Guid> feedIds);
    Task<IEnumerable<FeedDto>> SearchFeedsAsync(Guid userId, string query, int skip, int take);
    Task<FeedDto?> GetFeedByIdAsync(Guid feedId, Guid userId);
    Task<FeedDto?> GetFeedMetadataByUriAsync(string uri);
    Task<IEnumerable<PostDto>> GetFeedPostsAsync(Guid feedId, Guid? userId, int skip, int take, string? uri = null);
    Task PreSeedFeedsAsync();
}
