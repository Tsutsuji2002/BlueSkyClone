using BSkyClone.DTOs;
using BSkyClone.Models;

namespace BSkyClone.Services;

public interface IPostService
{
    Task<IEnumerable<PostDto>> GetTimelineAsync(Guid userId, int skip = 0, int take = 20);
    Task<PagedPostDto> GetUserPostsAsync(string handleOrDid, Guid? viewerId, int skip = 0, int take = 20, string? type = null, string? cursor = null);
    Task<PostDto> CreatePostAsync(Guid userId, CreatePostRequest request);
    Task<PostDto?> UpdatePostAsync(Guid userId, Guid postId, CreatePostRequest request);
    Task<PostDto?> GetPostByIdAsync(Guid postId, Guid? viewerId = null);
    Task<IEnumerable<PostDto>> GetPostsByIdsAsync(IEnumerable<Guid> postIds, Guid? viewerId = null);
    Task<PostDto?> GetPostByTidAsync(string tid, Guid? viewerId = null);
    Task<PostDto?> GetPostByUriAsync(string uri, Guid? viewerId = null);
    Task FetchRemoteAuthorFeedAsync(string did, string? type = null, string? cursor = null);
    Task ProcessRemotePostAsync(string did, string path, string cid, byte[] recordData);
    Task<List<Guid>> DeletePostAsync(Guid userId, Guid postId);
    Task<object> ToggleLikeAsync(Guid userId, Guid postId);
    Task<object> ToggleBookmarkAsync(Guid userId, Guid postId);
    Task<object> ToggleRepostAsync(Guid userId, Guid postId);
    Task<IEnumerable<PostDto>> GetPostRepliesAsync(Guid postId, Guid? viewerId = null, int skip = 0, int take = 20);
    Task<IEnumerable<PostDto>> GetTrendingPostsAsync(Guid? viewerId = null, int skip = 0, int take = 20, List<string>? userInterests = null);
    Task<IEnumerable<PostDto>> GetTrendingPosts24hAsync(Guid? viewerId = null, int limit = 50, int skip = 0);
    Task<IEnumerable<PostDto>> GetGuestDiscoverPostsAsync(int take = 20, int skip = 0);
    Task<IEnumerable<PostDto>> GetBookmarkedPostsAsync(Guid userId);
    Task<IEnumerable<PostDto>> GetPostsByTagAsync(string tag, Guid? viewerId = null, int limit = 20, int offset = 0);
    Task<IEnumerable<PostDto>> GetDiscoverPostsAsync(Guid userId, int limit = 50, int skip = 0);
    Task<IEnumerable<PostDto>> SearchPostsDBAsync(string query, Guid? viewerId = null, int limit = 20, int offset = 0);
    Task<IEnumerable<PostDto>> SearchPostsRemoteAsync(string query, string? token, int skip = 0, int take = 20);
    Task<PostDto?> UpdateInteractionSettingsAsync(Guid userId, Guid postId, UpdateInteractionSettingsRequest request);
    Task<object?> GetPostThreadAsync(string uri, int depth, int parentHeight, Guid? viewerId = null);
    PostDto MapToDto(Post post);
    List<PostDto> MapBlueskyFeed(System.Text.Json.JsonElement feedArray);
    PostDto? MapBlueskyPost(System.Text.Json.JsonElement postObj);
    Task<List<PostDto>> EnrichAndFilterPostsAsync(List<PostDto> posts, Guid viewerId, bool isTimeline = false, bool forceDropHidden = true);
    Task<(string path, string cid, string? thumbnail)> SaveBlobAsync(Stream stream, string contentType, string folder);
    public string GenerateTid();
    /// <summary>
    /// Called by FirehoseService when a remote Like/Repost targeting a local post is detected.
    /// Increments (or decrements) the appropriate count directly on the local post row.
    /// </summary>
    Task IncrementRemoteInteractionAsync(string? subjectUri, string type, int delta, string? actorDid = null, string? recordPath = null);
    Task IngestThreadRecursiveAsync(Newtonsoft.Json.Linq.JToken? node);
}
