using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public interface IRecommendationService
{
    Task<IEnumerable<FeedDto>> GetRecommendedFeedsAsync(Guid userId);
}

public class RecommendationService : IRecommendationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IFeedService _feedService; // We reuse FeedService logic for mapping

    public RecommendationService(IUnitOfWork unitOfWork, IFeedService feedService)
    {
        _unitOfWork = unitOfWork;
        _feedService = feedService;
    }

    public async Task<IEnumerable<FeedDto>> GetRecommendedFeedsAsync(Guid userId)
    {
        // 1. Get user interests/tags
        // Note: Assuming we have an Interest table or similar. For now, we simulate this or rely on a property in User.
        // If User.Interests is not yet fully implemented, we will look at what Feeds the user already follows to infer interests.
        
        var user = await _unitOfWork.Users.Query()
            .Include(u => u.Interests)
            .FirstOrDefaultAsync(u => u.Id == userId);

        var userInterestTags = user?.Interests.Select(i => i.Name.ToLower()).ToList() ?? new List<string>();

        // 2. Get all feeds (except ones user already pinned/saved to avoid duplicates in "New For You")
        // In a real app with millions of feeds, we would filter by popularity first.
        var subscribedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId)
            .Select(s => s.FeedId)
            .ToListAsync();
            
        var candidateFeeds = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .Where(f => !subscribedFeedIds.Contains(f.Id) && (f.IsDeleted == false || f.IsDeleted == null))
            .Take(100) // Candidate pool
            .ToListAsync();

        // 3. Score feeds
        var scoredFeeds = candidateFeeds.Select(feed => {
            double score = 0;

            // Popularity Score (1 point per 100 subscribers)
            score += (feed.SubscribersCount ?? 0) / 100.0;
            
            // Recency Bonus (if new feed) - not implemented in DB properly yet, so skipping
            
            // Interest Match Score
            // Assuming Feed description or name contains interest keywords
            if (userInterestTags.Any())
            {
                var feedText = (feed.Name + " " + (feed.Description ?? "")).ToLower();
                foreach (var tag in userInterestTags)
                {
                    if (feedText.Contains(tag))
                    {
                        score += 10; // High bonus for matching interest
                    }
                }
            }

            return new { Feed = feed, Score = score };
        });

        // 4. Return Top N
        var topFeeds = scoredFeeds
            .OrderByDescending(x => x.Score)
            .Take(20)
            .Select(x => x.Feed)
            .ToList();

        // 5. Check actual subscription/pin status for these recommendations 
        // (though we filtered by !subscribedFeedIds, it's safer to use the same logic as Feeds)
        var userPinnedFeedIds = await _unitOfWork.UserFeedSubscriptions.Query()
            .Where(s => s.UserId == userId && s.IsPinned == true)
            .Select(s => s.FeedId)
            .ToListAsync();

        return topFeeds.Select(feed => new FeedDto
        {
            Id = feed.Id,
            Tid = feed.Tid,
            Name = feed.Name,
            Description = feed.Description,
            Handle = feed.Handle,
            AvatarUrl = feed.AvatarUrl,
            IsPinned = userPinnedFeedIds.Contains(feed.Id),
            PinnedOrder = 0,
            IsSubscribed = subscribedFeedIds.Contains(feed.Id),
            SubscribersCount = feed.SubscribersCount ?? 0,
            Creator = feed.Creator != null ? new AuthorDto
            {
                Id = feed.Creator.Id,
                Username = feed.Creator.Username,
                DisplayName = feed.Creator.DisplayName,
                AvatarUrl = feed.Creator.AvatarUrl,
                IsVerified = feed.Creator.IsVerified
            } : null
        });
    }
}
