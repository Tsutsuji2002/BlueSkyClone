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

    private static readonly Dictionary<string, Guid> OfficialFeedIds = new()
    {
        { "Trending", new Guid("c9a34220-a27e-4782-8a1d-1ee3a6be80d3") },
        { "Art", new Guid("1c7ee051-7bc1-46a2-a1aa-26cdb3565565") },
        { "Photography", new Guid("354ce3eb-f074-44bf-b558-7fdf57a8d874") },
        { "Tech", new Guid("ed41a546-f71b-4ae2-8731-18427e4e45ae") },
        { "Gaming", new Guid("3fa97b04-ff91-4e05-8f6e-20c4d8f024b3") },
        { "Nature", new Guid("d9591c01-d945-4460-8317-e28044e4f32d") },
        { "Music", new Guid("bb49e212-d0c5-4e6a-ba22-b67fd9d1ef1e") },
        { "News", new Guid("5f252ec5-92e4-47a6-9d0f-25c47ffe246d") },
        { "Politics", new Guid("d38ab5b8-ad81-43e2-a279-d584ca199c72") },
        { "Movies", new Guid("a234222d-4d48-495a-95e2-2210faa2d781") },
        { "Science", new Guid("7ab05dbf-4cff-4a79-ac74-43af3c07fce0") },
        { "Sports", new Guid("e778e399-2ea4-4cad-b266-69c74256ae2e") },
        { "Food", new Guid("de806225-78f2-4440-87e9-8f4e416a777d") },
        { "Travel", new Guid("e823c6a7-416e-45c0-b105-9ae497855e1d") },
        { "Fitness", new Guid("41d5fe89-74f9-4b41-bf21-3f1a3a336f88") },
        { "Anime", new Guid("770d49de-26bc-4697-beb8-4cdf94fa26ef") },
        { "Environment", new Guid("ebdc2c23-7b12-4e63-8ad9-781c4e0bde45") },
        { "Fashion", new Guid("3a8718b9-35c9-42ce-b503-7c491fba6260") },
        { "Health", new Guid("3609d0f4-d4d1-4e10-ad08-e95120969ae3") }
    };

    public FeedService(IUnitOfWork unitOfWork, IPostService postService)
    {
        _unitOfWork = unitOfWork;
        _postService = postService;
    }

    public async Task<IEnumerable<FeedDto>> GetTrendingFeedsAsync(Guid userId)
    {
        await PreSeedFeedsAsync();
        var feeds = await _unitOfWork.Feeds.GetTrendingFeedsAsync();
        System.Console.WriteLine($"[FeedService] GetTrendingFeedsAsync: DB returned {feeds.Count()} feeds. First ID: {feeds.FirstOrDefault()?.Id}");
        
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
        var targetTrendingId = OfficialFeedIds["Trending"];
        var trendingFeed = await _unitOfWork.Feeds.Query()
            .FirstOrDefaultAsync(f => f.IsOfficial && f.Name == "Trending");

        // If ID mismatched but Name matches, delete and recreate to enforce stable IDs
        if (trendingFeed != null && trendingFeed.Id != targetTrendingId)
        {
            _unitOfWork.Feeds.Remove(trendingFeed);
            await _unitOfWork.CompleteAsync();
            trendingFeed = null;
        }

        if (trendingFeed == null)
        {
            trendingFeed = new Feed
            {
                Id = targetTrendingId,
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
            var targetId = OfficialFeedIds.ContainsKey(topic.Name) ? OfficialFeedIds[topic.Name] : Guid.NewGuid();
            var feed = await _unitOfWork.Feeds.Query()
                .FirstOrDefaultAsync(f => f.IsOfficial && f.Name == topic.Name);

            // If ID mismatched but Name matches, delete and recreate to enforce stable IDs
            if (feed != null && feed.Id != targetId)
            {
                _unitOfWork.Feeds.Remove(feed);
                await _unitOfWork.CompleteAsync();
                feed = null;
            }

            if (feed == null)
            {
                var newFeed = new Feed
                {
                    Id = targetId,
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
                _logger.LogInformation("[FeedService] Seeded/Verified feed: {Name} ({Id})", topic.Name, targetId);
            }
        }
        _logger.LogInformation("[FeedService] Official feeds seeding completed.");
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

        _logger.LogInformation("[FeedService] GetUserFeedsAsync for User {UserId}: Found {Count} subscriptions.", userId, subscriptions.Count);
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
                AvatarUrl = feed.Creator.AvatarUrl,
                IsVerified = feed.Creator.IsVerified
            } : null
        };
    }

    public async Task<FeedDto?> GetFeedByIdAsync(Guid feedId, Guid userId)
    {
        await PreSeedFeedsAsync();
        var feed = await _unitOfWork.Feeds.Query()
            .Include(f => f.Creator)
            .FirstOrDefaultAsync(f => f.Id == feedId && (f.IsDeleted == false || f.IsDeleted == null));

        if (feed == null) 
        {
            _logger.LogWarning("[FeedService] GetFeedByIdAsync: Feed {Id} NOT FOUND in database after seeding.", feedId);
            return null;
        }

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
        try
        {
            await PreSeedFeedsAsync();
            var feed = await _unitOfWork.Feeds.GetByIdAsync(feedId);
            if (feed == null) return new List<PostDto>();

            // 1. Special handling for Trending (still logic-based)
            if (feed.IsOfficial && (feed.Name == "Trending" || feed.Tid == "official-trending"))
            {
                return await _postService.GetTrendingPosts24hAsync(userId, take, skip);
            }

            // 2. Generic AI/Category Sort: Fetch posts tagged with an interest matching the feed name or handle
            // Remove .Include(p => p.Interests) because PostInterests join table may not exist on VPS
            List<PostDto> postDtos;
            try
            {
                var posts = await _unitOfWork.Posts.Query()
                    .Include(p => p.Author)
                    .Include(p => p.PostMedia)
                    .Include(p => p.LinkPreview)
                    .Include(p => p.Interests)
                    .Where(p => (p.IsDeleted == false || p.IsDeleted == null) && 
                                p.Interests.Any(i => i.Name == feed.Name))
                    .OrderByDescending(p => p.CreatedAt)
                    .Skip(skip)
                    .Take(take)
                    .ToListAsync();

                _logger.LogInformation("[FeedService] Query for feed '{Name}' returned {Count} posts via Interests.", feed.Name, posts.Count);
                postDtos = posts.Select(p => _postService.MapToDto(p)).ToList();
            }
            catch (Exception ex)
            {
                // Fallback: Interests table/join may not exist on VPS — return trending instead
                System.Console.WriteLine($"[FeedService] GetFeedPostsAsync: Error querying by Interests for feed '{feed.Name}': {ex.Message}. Falling back to trending.");
                return await _postService.GetTrendingPosts24hAsync(userId, take, skip);
            }

            if (userId.HasValue)
            {
                return await _postService.EnrichAndFilterPostsAsync(postDtos, userId.Value);
            }

            return postDtos;
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[FeedService] GetFeedPostsAsync: Outer error: {ex.Message}");
            return new List<PostDto>();
        }
    }


    public async Task PreSeedFeedsAsync()
    {
        await EnsureOfficialFeedsSeededAsync();
    }
}

