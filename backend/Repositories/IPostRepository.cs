using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IPostRepository : IRepository<Post>
{
    Task<IEnumerable<Post>> GetTimelinePostsAsync(Guid userId, int limit = 50);
    Task<IEnumerable<Post>> GetUserPostsAsync(Guid userId, string? type = null, int limit = 50, int offset = 0);
}
