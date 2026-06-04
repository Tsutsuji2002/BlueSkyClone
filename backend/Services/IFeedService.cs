using BSkyClone.DTOs;

namespace BSkyClone.Services;

public interface IFeedService
{
    Task<PagedFeedsDto> GetTrendingFeedsAsync(Guid? userId, string? cursor = null, int limit = 10, System.Threading.CancellationToken ct = default);
    Task<IEnumerable<FeedDto>> GetUserFeedsAsync(Guid userId, bool forceRefresh = false, System.Threading.CancellationToken ct = default);
    Task<IEnumerable<FeedDto>> GetActorFeedsAsync(string actor, Guid? viewerId = null, System.Threading.CancellationToken ct = default);
    Task<FeedDto?> GetFeedByTidAsync(string tid, System.Threading.CancellationToken ct = default);
    Task<bool> SaveFeedAsync(Guid userId, Guid feedId, string? uri = null, System.Threading.CancellationToken ct = default);
    Task<bool> UnsaveFeedAsync(Guid userId, Guid feedId, string? uri = null, System.Threading.CancellationToken ct = default);
    Task<bool> PinFeedAsync(Guid userId, Guid feedId, string? uri = null, System.Threading.CancellationToken ct = default);
    Task<bool> UnpinFeedAsync(Guid userId, Guid feedId, string? uri = null, System.Threading.CancellationToken ct = default);
    Task<bool> ReorderFeedsAsync(Guid userId, List<Guid> feedIds, System.Threading.CancellationToken ct = default);
    /// <summary>Reorders pinned entries in Bluesky savedFeedsPrefV2 (at:// and following keys).</summary>
    Task<bool> ReorderRemotePinnedFeedsAsync(Guid userId, List<string> orderedPinnedKeys, System.Threading.CancellationToken ct = default);
    Task<IEnumerable<FeedDto>> SearchFeedsAsync(Guid? userId, string query, int skip, int take, System.Threading.CancellationToken ct = default);
    Task<FeedDto?> GetFeedByIdAsync(Guid feedId, Guid userId, System.Threading.CancellationToken ct = default);
    Task<FeedDto?> GetFeedMetadataByUriAsync(string uri, System.Threading.CancellationToken ct = default);
    Task<PagedPostDto> GetFeedPostsAsync(Guid feedId, Guid? userId, int skip, int take, string? uri = null, string? cursor = null, System.Threading.CancellationToken ct = default);
    Task<object> ToggleLikeFeedAsync(Guid userId, string feedUri, bool? clientIsLiked = null, string? clientLikeUri = null, System.Threading.CancellationToken ct = default);
    Task PreSeedFeedsAsync(System.Threading.CancellationToken ct = default);
}
