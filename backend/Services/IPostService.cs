using BSkyClone.DTOs;
using BSkyClone.Models;

namespace BSkyClone.Services;

public interface IPostService
{
    Task<IEnumerable<PostDto>> GetTimelineAsync(Guid userId, int skip = 0, int take = 20);
    Task<IEnumerable<PostDto>> GetUserPostsAsync(Guid userId, string? type = null, Guid? viewerId = null, int limit = 30, int offset = 0);
    Task<PostDto> CreatePostAsync(Guid userId, CreatePostRequest request);
    Task<PostDto?> UpdatePostAsync(Guid userId, Guid postId, CreatePostRequest request);
    Task<PostDto?> GetPostByIdAsync(Guid postId, Guid? viewerId = null);
    Task<PostDto?> GetPostByTidAsync(string tid, Guid? viewerId = null);
    Task<PostDto?> GetPostByUriAsync(string uri, Guid? viewerId = null);
    Task FetchRemoteAuthorFeedAsync(string did, string? type = null);
    Task ProcessRemotePostAsync(string did, string path, string cid, byte[] recordData);
    Task<List<Guid>> DeletePostAsync(Guid userId, Guid postId);
    Task<object> ToggleLikeAsync(Guid userId, Guid postId);
    Task<object> ToggleBookmarkAsync(Guid userId, Guid postId);
    Task<object> ToggleRepostAsync(Guid userId, Guid postId);
    Task<IEnumerable<PostDto>> GetPostRepliesAsync(Guid postId, Guid? viewerId = null);
    Task<IEnumerable<PostDto>> GetTrendingPostsAsync(Guid? viewerId = null, int skip = 0, int take = 20);
    Task<IEnumerable<PostDto>> GetTrendingPosts24hAsync(Guid? viewerId = null, int limit = 50, int skip = 0);
    Task<IEnumerable<PostDto>> GetBookmarkedPostsAsync(Guid userId);
    Task<IEnumerable<PostDto>> GetPostsByTagAsync(string tag, Guid? viewerId = null, int limit = 20, int offset = 0);
    Task<IEnumerable<PostDto>> GetDiscoverPostsAsync(Guid userId, int limit = 50, int skip = 0);
    Task<IEnumerable<PostDto>> SearchPostsDBAsync(string query, Guid? viewerId = null, int limit = 20, int offset = 0);
    Task<PostDto?> UpdateInteractionSettingsAsync(Guid userId, Guid postId, UpdateInteractionSettingsRequest request);
    Task<object?> GetPostThreadAsync(string uri, int depth, int parentHeight, Guid? viewerId = null);
    PostDto MapToDto(Post post);
    Task<List<PostDto>> EnrichAndFilterPostsAsync(List<PostDto> posts, Guid viewerId, bool isTimeline = false);
    Task<(string path, string cid, string? thumbnail)> SaveBlobAsync(Stream stream, string contentType, string folder);
    public string GenerateTid();
    /// <summary>
    /// Called by FirehoseService when a remote Like/Repost targeting a local post is detected.
    /// Increments (or decrements) the appropriate count directly on the local post row.
    /// </summary>
    Task IncrementRemoteInteractionAsync(string? subjectUri, string type, int delta, string? actorDid = null, string? recordPath = null);
}
