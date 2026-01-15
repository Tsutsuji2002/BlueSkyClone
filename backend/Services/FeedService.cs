using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class FeedService : IFeedService
{
    private readonly IUnitOfWork _unitOfWork;

    public FeedService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<FeedDto>> GetTrendingFeedsAsync(Guid userId)
    {
        var feeds = await _unitOfWork.Feeds.GetTrendingFeedsAsync();
        
        var userSubscribedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId)
            .Select(s => s.FeedId)
            .ToListAsync();

        var userPinnedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .Select(s => s.FeedId)
            .ToListAsync();

        return feeds.Select(f => MapToDto(
            f, 
            userPinnedFeedIds.Contains(f.Id), 
            0, 
            userSubscribedFeedIds.Contains(f.Id)
        ));
    }

    public async Task<IEnumerable<FeedDto>> GetUserFeedsAsync(Guid userId)
    {
        var subscriptions = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId)
            .Include(s => s.Feed)
            .ThenInclude(f => f.Creator)
            .OrderByDescending(s => s.IsPinned)
            .ThenBy(s => s.PinnedOrder)
            .ToListAsync();

        return subscriptions.Select(s => MapToDto(s.Feed, s.IsPinned ?? false, s.PinnedOrder ?? 0));
    }

    public async Task<FeedDto?> GetFeedByTidAsync(string tid)
    {
        var feed = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .FirstOrDefaultAsync(f => f.Tid == tid);

        return feed != null ? MapToDto(feed, false, 0, false) : null;
    }

    public async Task<bool> SaveFeedAsync(Guid userId, Guid feedId)
    {
        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);
        if (existing != null) return true;

        var sub = new UserFeedSubscription
        {
            UserId = userId,
            FeedId = feedId,
            CreatedAt = DateTime.UtcNow,
            IsPinned = false,
            PinnedOrder = 0
        };

        await _unitOfWork.UserFeedSubscriptions.AddAsync(sub);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> UnsaveFeedAsync(Guid userId, Guid feedId)
    {
        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);
        if (existing == null) return true;

        _unitOfWork.UserFeedSubscriptions.Remove(existing);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> PinFeedAsync(Guid userId, Guid feedId)
    {
        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);

        var maxOrder = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .MaxAsync(s => (int?)s.PinnedOrder) ?? 0;

        if (existing == null)
        {
            var sub = new UserFeedSubscription
            {
                UserId = userId,
                FeedId = feedId,
                CreatedAt = DateTime.UtcNow,
                IsPinned = true,
                PinnedOrder = maxOrder + 1
            };
            await _unitOfWork.UserFeedSubscriptions.AddAsync(sub);
        }
        else
        {
            existing.IsPinned = true;
            existing.PinnedOrder = maxOrder + 1;
            _unitOfWork.UserFeedSubscriptions.Update(existing);
        }

        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> UnpinFeedAsync(Guid userId, Guid feedId)
    {
        var existing = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);
        if (existing == null) return false;

        existing.IsPinned = false;
        existing.PinnedOrder = 0;

        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> ReorderFeedsAsync(Guid userId, List<Guid> feedIds)
    {
        var subs = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .ToListAsync();

        for (int i = 0; i < feedIds.Count; i++)
        {
            var sub = subs.FirstOrDefault(s => s.FeedId == feedIds[i]);
            if (sub != null)
            {
                sub.PinnedOrder = i;
            }
        }

        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<IEnumerable<FeedDto>> SearchFeedsAsync(Guid userId, string query, int skip, int take)
    {
        var feeds = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .Where(f => (f.IsDeleted == false || f.IsDeleted == null) && 
                        (f.Name.Contains(query) || (f.Description != null && f.Description.Contains(query))))
            .OrderByDescending(f => f.SubscribersCount)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var userSubscribedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId)
            .Select(s => s.FeedId)
            .ToListAsync();

        var userPinnedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .Select(s => s.FeedId)
            .ToListAsync();

        return feeds.Select(f => MapToDto(f, userPinnedFeedIds.Contains(f.Id), 0, userSubscribedFeedIds.Contains(f.Id)));
    }

    private FeedDto MapToDto(Feed feed, bool isPinned = false, int pinnedOrder = 0, bool isSubscribed = true)
    {
        return new FeedDto
        {
            Id = feed.Id,
            Tid = feed.Tid,
            Name = feed.Name,
            Description = feed.Description,
            Handle = feed.Handle,
            AvatarUrl = feed.AvatarUrl,
            IsPinned = isPinned,
            PinnedOrder = pinnedOrder,
            IsSubscribed = isSubscribed,
            SubscribersCount = feed.SubscribersCount ?? 0,
            Creator = feed.Creator != null ? new AuthorDto
            {
                Id = feed.Creator.Id,
                Username = feed.Creator.Username,
                DisplayName = feed.Creator.DisplayName,
                AvatarUrl = feed.Creator.AvatarUrl
            } : null
        };
    }

    public async Task<FeedDto?> GetFeedByIdAsync(Guid feedId, Guid userId)
    {
        var feed = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .FirstOrDefaultAsync(f => f.Id == feedId && (f.IsDeleted == false || f.IsDeleted == null));

        if (feed == null) return null;

        var subscription = await _unitOfWork.UserFeedSubscriptions.Query()
            .FirstOrDefaultAsync(s => s.UserId == userId && s.FeedId == feedId);

        return MapToDto(
            feed, 
            subscription?.IsPinned ?? false, 
            subscription?.PinnedOrder ?? 0, 
            subscription != null
        );
    }
}

