using BSkyClone.DTOs;

namespace BSkyClone.Services;

public interface IFeedService
{
    Task<PagedFeedsDto> GetTrendingFeedsAsync(Guid? userId, string? cursor = null, int limit = 10);
    Task<IEnumerable<FeedDto>> GetUserFeedsAsync(Guid userId);
    Task<FeedDto?> GetFeedByTidAsync(string tid);
    Task<bool> SaveFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> UnsaveFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> PinFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> UnpinFeedAsync(Guid userId, Guid feedId, string? uri = null);
    Task<bool> ReorderFeedsAsync(Guid userId, List<Guid> feedIds);
    /// <summary>Reorders pinned entries in Bluesky savedFeedsPrefV2 (at:// and following keys).</summary>
    Task<bool> ReorderRemotePinnedFeedsAsync(Guid userId, List<string> orderedPinnedKeys);
    Task<IEnumerable<FeedDto>> SearchFeedsAsync(Guid? userId, string query, int skip, int take);
    Task<FeedDto?> GetFeedByIdAsync(Guid feedId, Guid userId);
    Task<FeedDto?> GetFeedMetadataByUriAsync(string uri);
    Task<PagedPostDto> GetFeedPostsAsync(Guid feedId, Guid? userId, int skip, int take, string? uri = null, string? cursor = null);
    Task<IEnumerable<FeedDto>> GetActorFeedsAsync(string actor, Guid? viewerId = null);
    Task PreSeedFeedsAsync();
}
