using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class FeedRepository : Repository<Feed>, IFeedRepository
{
    public FeedRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Feed>> GetTrendingFeedsAsync(int limit = 10)
    {
        return await _dbSet
            .Include(f => f.Creator)
            .Where(f => f.IsDeleted == false || f.IsDeleted == null)
            .OrderByDescending(f => f.SubscribersCount)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<Feed>> GetUserSubscribedFeedsAsync(Guid userId)
    {
        return await ((BSkyDbContext)_context).UserFeedSubscriptions
            .Where(s => s.UserId == userId)
            .Select(s => s.Feed)
            .Include(f => f.Creator)
            .Where(f => f.IsDeleted == false || f.IsDeleted == null)
            .ToListAsync();
    }
}
