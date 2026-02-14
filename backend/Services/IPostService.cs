using BSkyClone.DTOs;
using BSkyClone.Models;

namespace BSkyClone.Services;

public interface IPostService
{
    Task<IEnumerable<PostDto>> GetTimelineAsync(Guid userId);
    Task<IEnumerable<PostDto>> GetUserPostsAsync(Guid userId, string? type = null, Guid? viewerId = null, int limit = 3, int offset = 0);
    Task<PostDto> CreatePostAsync(Guid userId, CreatePostRequest request);
    Task<PostDto?> GetPostByIdAsync(Guid postId, Guid? viewerId = null);
    Task<bool> DeletePostAsync(Guid userId, Guid postId);
    Task<object> ToggleLikeAsync(Guid userId, Guid postId);
    Task<object> ToggleBookmarkAsync(Guid userId, Guid postId);
    Task<object> ToggleRepostAsync(Guid userId, Guid postId);
    Task<IEnumerable<PostDto>> GetPostRepliesAsync(Guid postId, Guid? viewerId = null);
    Task<IEnumerable<PostDto>> GetTrendingPostsAsync(Guid? viewerId = null);
    Task<IEnumerable<PostDto>> GetTrendingPosts24hAsync(Guid? viewerId = null, int limit = 50);
    Task<IEnumerable<PostDto>> GetBookmarkedPostsAsync(Guid userId);
    Task<IEnumerable<PostDto>> GetPostsByTagAsync(string tag, Guid? viewerId = null, int limit = 20, int offset = 0);
    PostDto MapToDto(Post post);
}
