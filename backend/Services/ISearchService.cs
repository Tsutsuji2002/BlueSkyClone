using BSkyClone.DTOs;
using BSkyClone.Models;

namespace BSkyClone.Services;

public interface ISearchService
{
    Task IndexPostAsync(Post post);
    Task DeletePostAsync(Guid postId);
    Task IndexUserAsync(User user);
    Task<IEnumerable<Guid>> SearchPostsAsync(string query, int skip = 0, int take = 20);
    Task<IEnumerable<Guid>> SearchUsersAsync(string query, int skip = 0, int take = 20);
    Task ReindexAllAsync();
}
