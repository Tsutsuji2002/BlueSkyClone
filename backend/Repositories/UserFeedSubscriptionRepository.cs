using BSkyClone.Models;

namespace BSkyClone.Repositories;

public class UserFeedSubscriptionRepository : Repository<UserFeedSubscription>, IUserFeedSubscriptionRepository
{
    public UserFeedSubscriptionRepository(BSkyDbContext context) : base(context)
    {
    }
}
