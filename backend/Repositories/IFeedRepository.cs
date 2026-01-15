using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IFeedRepository : IRepository<Feed>
{
    Task<IEnumerable<Feed>> GetTrendingFeedsAsync(int limit = 10);
    Task<IEnumerable<Feed>> GetUserSubscribedFeedsAsync(Guid userId);
}
