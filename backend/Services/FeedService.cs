using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using BSkyClone.Constants;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class FeedService : IFeedService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPostService _postService;

    public FeedService(IUnitOfWork unitOfWork, IPostService postService)
    {
        _unitOfWork = unitOfWork;
        _postService = postService;
    }

    public async Task<IEnumerable<FeedDto>> GetTrendingFeedsAsync(Guid userId)
    {
        await PreSeedFeedsAsync();
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

    private async Task EnsureOfficialFeedsSeededAsync()
    {
        var trendingFeed = await _unitOfWork.Feeds.Query()
            .FirstOrDefaultAsync(f => f.IsOfficial && f.Name == "Trending");

        if (trendingFeed == null)
        {
            trendingFeed = new Feed
            {
                Id = Guid.NewGuid(),
                Tid = "official-trending",
                Name = "Trending",
                Description = "The most popular posts from the last 24 hours.",
                Handle = "trending.official",
                IsOfficial = true,
                CreatedAt = DateTime.UtcNow,
                SubscribersCount = 0,
                IsDeleted = false
            };
            await _unitOfWork.Feeds.AddAsync(trendingFeed);
            await _unitOfWork.CompleteAsync();
        }

        var topics = new List<(string Name, string Description, string Handle)>
        {
            (PostCategoryConstants.Art, "Discover amazing drawings, paintings, and digital art.", "art.official"),
            (PostCategoryConstants.Photography, "Professional and amateur photography from around the world.", "photo.official"),
            (PostCategoryConstants.Gaming, "Latest from the gaming world, consoles, and streaming.", "gaming.official"),
            (PostCategoryConstants.Tech, "Software, hardware, AI, and developer updates.", "tech.official"),
            (PostCategoryConstants.Music, "New releases, concerts, and music discussions.", "music.official"),
            (PostCategoryConstants.News, "Headlines and breaking news from trusted sources.", "news.official"),
            (PostCategoryConstants.Nature, "Beautiful landscapes, wildlife, and environmental topics.", "nature.official"),
            (PostCategoryConstants.Politics, "Discussion about global and local political events.", "politics.official"),
            (PostCategoryConstants.Movies, "Reviews, trailers, and news from the cinema world.", "movies.official"),
            (PostCategoryConstants.Science, "Space, biology, physics, and latest scientific research.", "science.official"),
            (PostCategoryConstants.Sports, "Match results, athletes, and sporting event updates.", "sports.official"),
            (PostCategoryConstants.Food, "Recipes, cooking tips, and culinary adventures.", "food.official")
        };

        foreach (var topic in topics)
        {
            // Ensure Interest exists for AI tagging
            var interest = await _unitOfWork.Interests.Query()
                .FirstOrDefaultAsync(i => i.Name == topic.Name);
            
            if (interest == null)
            {
                interest = new Interest
                {
                    Name = topic.Name,
                    Slug = topic.Name.ToLower(),
                    IsDeleted = false
                };
                await _unitOfWork.Interests.AddAsync(interest);
                await _unitOfWork.CompleteAsync();
            }

            // Ensure Feed exists
            var feed = await _unitOfWork.Feeds.Query()
                .FirstOrDefaultAsync(f => f.IsOfficial && f.Name == topic.Name);

            if (feed == null)
            {
                var newFeed = new Feed
                {
                    Id = Guid.NewGuid(),
                    Tid = $"official-{topic.Name.ToLower()}",
                    Name = topic.Name,
                    Description = topic.Description,
                    Handle = topic.Handle,
                    IsOfficial = true,
                    CreatedAt = DateTime.UtcNow,
                    SubscribersCount = 0,
                    IsDeleted = false
                };
                await _unitOfWork.Feeds.AddAsync(newFeed);
                await _unitOfWork.CompleteAsync();
            }
        }
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

    public async Task<IEnumerable<PostDto>> GetFeedPostsAsync(Guid feedId, Guid? userId, int skip, int take)
    {
        var feed = await _unitOfWork.Feeds.GetByIdAsync(feedId);
        if (feed == null) return new List<PostDto>();

        // 1. Special handling for Trending (still logic-based)
        if (feed.IsOfficial && (feed.Name == "Trending" || feed.Tid == "official-trending"))
        {
            return await _postService.GetTrendingPosts24hAsync(userId, take, skip);
        }

        // 2. Generic AI/Category Sort: Fetch posts tagged with an interest matching the feed name or handle
        // This works for any feed (Official or Community) if the system tagged the post correctly.
        var posts = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Where(p => (p.IsDeleted == false || p.IsDeleted == null) && 
                        p.Interests.Any(i => i.Name == feed.Name))
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var postDtos = posts.Select(p => _postService.MapToDto(p)).ToList();

        if (userId.HasValue)
        {
            return await _postService.EnrichAndFilterPostsAsync(postDtos, userId.Value);
        }

        return postDtos;
    }

    public async Task PreSeedFeedsAsync()
    {
        await EnsureOfficialFeedsSeededAsync();
    }
}

