using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using BSkyClone.Hubs;
using System.Text.RegularExpressions;

namespace BSkyClone.Services;

public class PostService : IPostService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILinkService _linkService;
    private readonly ICacheService _cacheService;
    private readonly ICategorizationService _categorizationService;

    public PostService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, IHubContext<ChatHub> hubContext, ILinkService linkService, ICacheService cacheService, ICategorizationService categorizationService)
    {
        _unitOfWork = unitOfWork;
        _environment = environment;
        _hubContext = hubContext;
        _linkService = linkService;
        _cacheService = cacheService;
        _categorizationService = categorizationService;
    }

    public async Task<IEnumerable<PostDto>> GetTimelineAsync(Guid userId)
    {
        var cacheKey = $"user:{userId}:timeline";
        var cached = await _cacheService.GetAsync<List<PostDto>>(cacheKey);
        if (cached != null)
        {
            return await EnrichAndFilterPostsAsync(cached, userId);
        }

        var posts = await _unitOfWork.Posts.GetTimelinePostsAsync(userId);
        var postDtos = posts.Select(MapToDto).ToList();
        await _cacheService.SetAsync(cacheKey, postDtos, TimeSpan.FromMinutes(2));
        var filteredDtos = await EnrichAndFilterPostsAsync(postDtos, userId);
        return filteredDtos;
    }

    public async Task<IEnumerable<PostDto>> GetUserPostsAsync(Guid userId, string? type = null, Guid? viewerId = null, int limit = 3, int offset = 0)
    {
        if (viewerId.HasValue)
        {
            var isBlocked = await _unitOfWork.Blocks.IsBlockedAsync(userId, viewerId.Value);
            if (isBlocked) return new List<PostDto>();
        }

        // Redis caching for quick re-access (1 minute TTL)
        var cacheKey = $"user:{userId}:posts:{type ?? "posts"}:{offset}:{limit}";
        var cached = await _cacheService.GetAsync<List<PostDto>>(cacheKey);
        
        if (cached != null && cached.Count > 0)
        {
            // Enrich with viewer-specific interactions (not cached)
            if (viewerId.HasValue)
            {
                cached = await EnrichAndFilterPostsAsync(cached, viewerId.Value);
            }
            return cached;
        }

        var posts = await _unitOfWork.Posts.GetUserPostsAsync(userId, type, limit, offset);
        var postDtos = posts.Select(MapToDto).ToList();
        
        // Cache for 1 minute
        await _cacheService.SetAsync(cacheKey, postDtos, TimeSpan.FromMinutes(1));
        
        if (viewerId.HasValue)
        {
            postDtos = await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
        }

        return postDtos;
    }

    private async Task<List<PostDto>> EnrichAndFilterPostsAsync(List<PostDto> posts, Guid viewerId)
    {
        if (!posts.Any()) return posts;

        var postIds = posts.Select(p => p.Id).ToList();

        var likedPostIds = await _unitOfWork.Likes.Query()
            .Where(l => l.UserId == viewerId && postIds.Contains(l.PostId))
            .Select(l => l.PostId)
            .ToListAsync();

        var bookmarkedPostIds = await _unitOfWork.Bookmarks.Query()
            .Where(b => b.UserId == viewerId && postIds.Contains(b.PostId))
            .Select(b => b.PostId)
            .ToListAsync();

        var repostedPostIds = await _unitOfWork.Reposts.Query()
            .Where(r => r.UserId == viewerId && postIds.Contains(r.PostId))
            .Select(r => r.PostId)
            .ToListAsync();

        var following = await _unitOfWork.Follows.GetFollowingAsync(viewerId);
        var followingIds = following.Select(f => f.FollowingId).ToList();

        var mutedWords = await _unitOfWork.MutedWords.Query()
            .Where(w => w.UserId == viewerId)
            .ToListAsync();

        var mutedAccounts = await _unitOfWork.Mutes.GetMutedAccountsAsync(viewerId);
        var mutedUserIds = mutedAccounts.Select(m => m.MutedUserId).ToList();

        var blockedUserIds = await _unitOfWork.Blocks.GetBlockedUserIdsAsync(viewerId);

        var filteredPosts = new List<PostDto>();
        foreach (var post in posts)
        {
            // Filter out muted or blocked users
            if (mutedUserIds.Contains(post.Author.Id) || blockedUserIds.Contains(post.Author.Id))
            {
                continue;
            }

            post.IsLiked = likedPostIds.Contains(post.Id);
            post.IsBookmarked = bookmarkedPostIds.Contains(post.Id);
            post.IsReposted = repostedPostIds.Contains(post.Id);
            post.Author.IsFollowing = followingIds.Contains(post.Author.Id);

            if (mutedWords.Any())
            {
                var content = post.Content?.ToLower() ?? "";
                var tags = (post.Tags ?? new List<string>())
                    .Concat(post.Interests ?? new List<string>())
                    .Select(t => t.ToLower());

                var matchingWord = mutedWords.FirstOrDefault(mw => 
                {
                    if (string.IsNullOrEmpty(mw.Word)) return false;
                    var word = mw.Word.ToLower();
                    return content.Contains(word) || tags.Contains(word);
                });

                if (matchingWord != null)
                {
                    if (matchingWord.MuteBehavior == "hide") continue;
                    
                    post.MuteInfo = new PostMuteDto
                    {
                        IsMuted = true,
                        Behavior = "warn",
                        Reason = matchingWord.Word
                    };
                }
            }
            filteredPosts.Add(post);
        }

        return filteredPosts;
    }

    public async Task<PostDto> CreatePostAsync(Guid userId, CreatePostRequest request)
    {
        var lockKey = $"lock:create_post:{userId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(3)))
        {
            throw new Exception("Please wait a moment before posting again.");
        }

        var userSettings = await _unitOfWork.UserSettings.GetByIdAsync(userId);
        var replyRestriction = userSettings?.DefaultReplyRestriction ?? "anyone";
        var allowQuotes = userSettings?.DefaultAllowQuotes ?? true;

        try
        {
            var post = new Post
            {
                Id = Guid.NewGuid(),
                Tid = GenerateTid(),
                AuthorId = userId,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow,
                ReplyToPostId = request.ReplyToPostId,
                RootPostId = request.RootPostId,
                LikesCount = 0,
                RepostsCount = 0,
                RepliesCount = 0,
                QuotesCount = 0,
                BookmarksCount = 0,
                IsDeleted = false,
                ReplyRestriction = replyRestriction,
                AllowQuotes = allowQuotes
            };

        if (request.Images != null && request.Images.Any())
        {
            foreach (var file in request.Images)
            {
                var imagePath = await SaveFileAsync(file, "posts");
                post.PostMedia.Add(new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "image",
                    Url = imagePath,
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        if (request.Video != null)
        {
            var videoPath = await SaveFileAsync(request.Video, "posts");
            post.PostMedia.Add(new PostMedium
            {
                Id = Guid.NewGuid(),
                PostId = post.Id,
                Type = "video",
                Url = videoPath,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (!string.IsNullOrEmpty(request.Content))
        {
            // Use provided preview if available, otherwise fetch
            if (!string.IsNullOrEmpty(request.LinkPreviewUrl))
            {
                post.LinkPreview = new LinkPreview
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Url = request.LinkPreviewUrl,
                    Title = request.LinkPreviewTitle,
                    Description = request.LinkPreviewDescription,
                    Image = request.LinkPreviewImage,
                    Domain = request.LinkPreviewDomain ?? new Uri(request.LinkPreviewUrl).Host.Replace("www.", ""),
                    CreatedAt = DateTime.UtcNow
                };
            }
            else
            {
                var linkPreview = await _linkService.GetLinkPreviewAsync(request.Content);
                if (linkPreview != null)
                {
                    linkPreview.PostId = post.Id;
                    post.LinkPreview = linkPreview;
                }
            }
        }

        // Automatic Categorization (AI Sort)
        var matchedInterestIds = await _categorizationService.CategorizePostAsync(request.Content ?? "", post.PostMedia.Select(m => m.Url).ToList());
        if (matchedInterestIds.Any())
        {
            var interests = await _unitOfWork.Interests.Query()
                .Where(i => matchedInterestIds.Contains(i.Id))
                .ToListAsync();
            
            foreach (var interest in interests)
            {
                post.Interests.Add(interest);
            }
        }

        // Tag Handling (#hashtags)
        var hashtags = Regex.Matches(request.Content ?? "", @"#(\w+)")
            .Cast<Match>()
            .Select(m => m.Groups[1].Value.ToLower())
            .Distinct()
            .ToList();

        foreach (var tag in hashtags)
        {
            var hashtag = await _unitOfWork.Hashtags.Query().FirstOrDefaultAsync(h => h.Slug == tag);
            if (hashtag == null)
            {
                hashtag = new Hashtag
                {
                    Name = tag.Substring(0, 1).ToUpper() + tag.Substring(1),
                    Slug = tag,
                    PostsCount = 1,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.Hashtags.AddAsync(hashtag);
            }
            else
            {
                hashtag.PostsCount = (hashtag.PostsCount ?? 0) + 1;
                _unitOfWork.Hashtags.Update(hashtag);
            }
            
            if (!post.Hashtags.Any(h => h.Id == hashtag.Id))
            {
                post.Hashtags.Add(hashtag);
            }
        }

        await _unitOfWork.Posts.AddAsync(post);
        
        // Update User PostsCount
        var author = await _unitOfWork.Users.GetByIdAsync(userId);
        if (author != null)
        {
            author.PostsCount = (author.PostsCount ?? 0) + 1;
            _unitOfWork.Users.Update(author);
        }
        
        Notification? replyNotification = null;
        if (request.ReplyToPostId.HasValue)
        {
            var parentPost = await _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .FirstOrDefaultAsync(p => p.Id == request.ReplyToPostId.Value);

            if (parentPost != null)
            {
                parentPost.RepliesCount = (parentPost.RepliesCount ?? 0) + 1;
                _unitOfWork.Posts.Update(parentPost);

                if (parentPost.AuthorId != userId)
                {
                    replyNotification = new Notification
                    {
                        Id = Guid.NewGuid(),
                        Tid = GenerateTid(),
                        Type = "reply",
                        SenderId = userId,
                        RecipientId = parentPost.AuthorId,
                        PostId = post.Id,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        IsDeleted = false
                    };
                    await _unitOfWork.Notifications.AddAsync(replyNotification);
                }
            }
        }

        await _unitOfWork.CompleteAsync();

        // Detect Mentions
        var mentions = Regex.Matches(request.Content ?? "", @"@(\w+)")
            .Cast<Match>()
            .Select(m => m.Groups[1].Value.ToLower())
            .Distinct()
            .ToList();

        foreach (var handle in mentions)
        {
            var mentionedUser = await _unitOfWork.Users.GetByHandleAsync($"{handle}.bsky.social");
            if (mentionedUser != null && mentionedUser.Id != userId)
            {
                var mentionNotification = new Notification
                {
                    Id = Guid.NewGuid(),
                    Tid = GenerateTid(),
                    Type = "mention",
                    SenderId = userId,
                    RecipientId = mentionedUser.Id,
                    PostId = post.Id,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    IsDeleted = false
                };
                await _unitOfWork.Notifications.AddAsync(mentionNotification);
                await _unitOfWork.CompleteAsync();
                await SendNotificationAsync(mentionNotification.Id);
            }
        }

        if (replyNotification != null)
        {
            await SendNotificationAsync(replyNotification.Id);
        }

        // Invalidate timeline cache for the author
        await _cacheService.RemoveAsync($"user:{userId}:timeline");

        // Refresh to get Author and Media
        var savedPost = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.Hashtags)
            .Include(p => p.Interests)
            .FirstOrDefaultAsync(p => p.Id == post.Id);

        return MapToDto(savedPost!);
    }
    finally
    {
        await _cacheService.ReleaseLockAsync(lockKey);
    }
}

    public async Task<PostDto?> GetPostByIdAsync(Guid postId, Guid? viewerId = null)
    {
        var cacheKey = $"post:{postId}";
        var cachedPost = await _cacheService.GetAsync<PostDto>(cacheKey);

        PostDto? postDto = null;

        if (cachedPost != null)
        {
            postDto = cachedPost;
        }
        else
        {
            var post = await _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .Include(p => p.PostMedia)
                .Include(p => p.LinkPreview)
                .FirstOrDefaultAsync(p => p.Id == postId);

            if (post == null) return null;

            postDto = MapToDto(post);
            await _cacheService.SetAsync(cacheKey, postDto, TimeSpan.FromMinutes(30));
        }

        if (viewerId.HasValue)
        {
            var isBlocked = await _unitOfWork.Blocks.IsBlockedAsync(postDto.Author.Id, viewerId.Value);
            if (isBlocked) return null;

            // Interactions and counts must be checked live for accuracy in detail view
            postDto.IsLiked = await _unitOfWork.Likes.Query().AnyAsync(l => l.PostId == postId && l.UserId == viewerId.Value);
            postDto.IsBookmarked = await _unitOfWork.Bookmarks.Query().AnyAsync(l => l.PostId == postId && l.UserId == viewerId.Value);
            postDto.IsReposted = await _unitOfWork.Reposts.Query().AnyAsync(r => r.PostId == postId && r.UserId == viewerId.Value);
            postDto.Author.IsFollowing = await _unitOfWork.Follows.IsFollowingAsync(viewerId.Value, postDto.Author.Id);
        }

        // Always fetch live counts for the detail view to ensure 100% accuracy
        postDto.LikesCount = await _unitOfWork.Likes.Query().CountAsync(l => l.PostId == postId);
        postDto.BookmarksCount = await _unitOfWork.Bookmarks.Query().CountAsync(b => b.PostId == postId);
        postDto.RepostsCount = await _unitOfWork.Reposts.Query().CountAsync(r => r.PostId == postId);

        return postDto;
    }

    public async Task<bool> DeletePostAsync(Guid userId, Guid postId)
    {
        var post = await _unitOfWork.Posts.GetByIdAsync(postId);
        if (post == null || post.AuthorId != userId) return false;

        post.IsDeleted = true;
        _unitOfWork.Posts.Update(post);

        // Update User PostsCount
        var author = await _unitOfWork.Users.GetByIdAsync(userId);
        if (author != null)
        {
            author.PostsCount = Math.Max(0, (author.PostsCount ?? 0) - 1);
            _unitOfWork.Users.Update(author);
        }

        await _unitOfWork.CompleteAsync();

        // Invalidate caches
        await _cacheService.RemoveAsync($"post:{postId}");
        await _cacheService.RemoveAsync($"user:{userId}:timeline");
        await _cacheService.RemoveAsync("posts:trending");

        return true;
    }

    public async Task<object> ToggleLikeAsync(Guid userId, Guid postId)
    {
        var lockKey = $"lock:like:{userId}:{postId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
            return new { isLiked = false, likesCount = 0, error = "Action in progress" };
        }

        try
        {
            var existingLike = await _unitOfWork.Likes.Query()
                .FirstOrDefaultAsync(l => l.PostId == postId && l.UserId == userId);

        bool isLiked;
        var post = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null) return new { isLiked = false, likesCount = 0 };

        if (existingLike != null)
        {
            _unitOfWork.Likes.Remove(existingLike);
            isLiked = false;
            post.LikesCount = Math.Max(0, (post.LikesCount ?? 0) - 1);

            // Remove corresponding notification
            var notification = await _unitOfWork.Notifications.Query()
                .FirstOrDefaultAsync(n => n.Type == "like" && n.SenderId == userId && n.PostId == postId);
            if (notification != null)
            {
                _unitOfWork.Notifications.Remove(notification);
            }
        }
        else
        {
            await _unitOfWork.Likes.AddAsync(new Like
            {
                PostId = postId,
                UserId = userId,
                Tid = GenerateTid(),
                CreatedAt = DateTime.UtcNow
            });
            isLiked = true;
            post.LikesCount = (post.LikesCount ?? 0) + 1;

            // Create notification for post author (only if liker is not the author)
            if (userId != post.AuthorId)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    Tid = GenerateTid(),
                    Type = "like",
                    SenderId = userId,
                    RecipientId = post.AuthorId,
                    PostId = postId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    IsDeleted = false
                };

                await _unitOfWork.Notifications.AddAsync(notification);
                await _unitOfWork.CompleteAsync();
                await SendNotificationAsync(notification.Id);
            }
        }

        _unitOfWork.Posts.Update(post);
        await _unitOfWork.CompleteAsync();

        // Invalidate post cache
        await _cacheService.RemoveAsync($"post:{postId}");

        return new 
        { 
            isLiked, 
            likesCount = post.LikesCount 
        };
    }
    finally
    {
        await _cacheService.ReleaseLockAsync(lockKey);
    }
}

    public async Task<object> ToggleBookmarkAsync(Guid userId, Guid postId)
    {
        var lockKey = $"lock:bookmark:{userId}:{postId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
             return new { isBookmarked = false, bookmarksCount = 0, error = "Action in progress" };
        }

        try
        {
            var existingBookmark = await _unitOfWork.Bookmarks.Query()
                 .FirstOrDefaultAsync(b => b.PostId == postId && b.UserId == userId);
        
        var post = await _unitOfWork.Posts.Query()
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null) return new { isBookmarked = false, bookmarksCount = 0 };

        bool isBookmarked;
        if (existingBookmark != null)
        {
            _unitOfWork.Bookmarks.Remove(existingBookmark);
            isBookmarked = false;
            post.BookmarksCount = Math.Max(0, (post.BookmarksCount ?? 0) - 1);
        }
        else
        {
            await _unitOfWork.Bookmarks.AddAsync(new Bookmark
            {
                PostId = postId,
                UserId = userId,
                Tid = GenerateTid(),
                CreatedAt = DateTime.UtcNow
            });
            isBookmarked = true;
            post.BookmarksCount = (post.BookmarksCount ?? 0) + 1;
        }

        _unitOfWork.Posts.Update(post);
        await _unitOfWork.CompleteAsync();

        // Invalidate post cache
        await _cacheService.RemoveAsync($"post:{postId}");

         return new 
        { 
            isBookmarked,
            bookmarksCount = post.BookmarksCount
        };
    }
    finally
    {
        await _cacheService.ReleaseLockAsync(lockKey);
    }
}

    public async Task<object> ToggleRepostAsync(Guid userId, Guid postId)
    {
        var lockKey = $"lock:repost:{userId}:{postId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
             return new { isReposted = false, repostsCount = 0, error = "Action in progress" };
        }

        try
        {
            var existingRepost = await _unitOfWork.Reposts.Query()
                .FirstOrDefaultAsync(r => r.PostId == postId && r.UserId == userId);

        bool isReposted;
        var post = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null) return new { isReposted = false, repostsCount = 0 };

        if (existingRepost != null)
        {
            _unitOfWork.Reposts.Remove(existingRepost);
            isReposted = false;
            post.RepostsCount = Math.Max(0, (post.RepostsCount ?? 0) - 1);

            // Remove corresponding notification
            var notification = await _unitOfWork.Notifications.Query()
                .FirstOrDefaultAsync(n => n.Type == "repost" && n.SenderId == userId && n.PostId == postId);
            if (notification != null)
            {
                _unitOfWork.Notifications.Remove(notification);
            }
        }
        else
        {
            await _unitOfWork.Reposts.AddAsync(new Repost
            {
                PostId = postId,
                UserId = userId,
                Tid = GenerateTid(),
                CreatedAt = DateTime.UtcNow
            });
            isReposted = true;
            post.RepostsCount = (post.RepostsCount ?? 0) + 1;

            // Create notification for post author (only if reposter is not the author)
            if (userId != post.AuthorId)
            {
                var notification = new Notification
                {
                    Id = Guid.NewGuid(),
                    Tid = GenerateTid(),
                    Type = "repost",
                    SenderId = userId,
                    RecipientId = post.AuthorId,
                    PostId = postId,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    IsDeleted = false
                };

                await _unitOfWork.Notifications.AddAsync(notification);
                await _unitOfWork.CompleteAsync();
                await SendNotificationAsync(notification.Id);
            }
        }

        _unitOfWork.Posts.Update(post);
        await _unitOfWork.CompleteAsync();

        // Invalidate caches
        await _cacheService.RemoveAsync($"post:{postId}");
        await _cacheService.RemoveAsync($"user:{userId}:timeline");

        return new
        {
            isReposted,
            repostsCount = post.RepostsCount
        };
    }
    finally
    {
        await _cacheService.ReleaseLockAsync(lockKey);
    }
}

    public async Task<IEnumerable<PostDto>> GetPostRepliesAsync(Guid postId, Guid? viewerId = null)
    {
        var replies = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Where(p => p.ReplyToPostId == postId && (p.IsDeleted == false || p.IsDeleted == null))
            .OrderBy(p => p.CreatedAt)
            .ToListAsync();

        var replyDtos = replies.Select(MapToDto).ToList();

        if (viewerId.HasValue)
        {
            replyDtos = await EnrichAndFilterPostsAsync(replyDtos, viewerId.Value);
        }

        return replyDtos;
    }

    public async Task<IEnumerable<PostDto>> GetTrendingPostsAsync(Guid? viewerId = null)
    {
        var cacheKey = "posts:trending";
        var cached = await _cacheService.GetAsync<IEnumerable<PostDto>>(cacheKey);
        
        List<PostDto> postDtos;
        if (cached != null)
        {
            postDtos = cached.ToList();
        }
        else
        {
            var posts = await _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .Include(p => p.PostMedia)
                .Include(p => p.LinkPreview)
                .Where(p => (p.IsDeleted == false || p.IsDeleted == null) && p.ReplyToPostId == null)
                .OrderByDescending(p => (p.LikesCount ?? 0) + (p.RepostsCount ?? 0))
                .Take(50)
                .ToListAsync();

            postDtos = posts.Select(MapToDto).ToList();
            await _cacheService.SetAsync(cacheKey, (IEnumerable<PostDto>)postDtos, TimeSpan.FromMinutes(5));
        }

        if (viewerId.HasValue)
        {
            postDtos = await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
        }

        return postDtos;
    }

    public async Task<IEnumerable<PostDto>> GetTrendingPosts24hAsync(Guid? viewerId = null, int limit = 50)
    {
        var posts = await _unitOfWork.Posts.GetTrendingPosts24hAsync(limit);
        var postDtos = posts.Select(MapToDto).ToList();

        if (viewerId.HasValue)
        {
            postDtos = await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
        }

        return postDtos;
    }

    public async Task<IEnumerable<PostDto>> GetBookmarkedPostsAsync(Guid userId)
    {
        var bookmarkedPosts = await _unitOfWork.Bookmarks.Query()
            .Where(b => b.UserId == userId)
            .Include(b => b.Post)
                .ThenInclude(p => p.Author)
            .Include(b => b.Post)
                .ThenInclude(p => p.PostMedia)
            .Include(b => b.Post)
                .ThenInclude(p => p.LinkPreview)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => b.Post)
            .ToListAsync();

        var postDtos = bookmarkedPosts.Select(MapToDto).ToList();
        return await EnrichAndFilterPostsAsync(postDtos, userId);
    }

    public PostDto MapToDto(Post post)
    {
        return new PostDto
        {
            Id = post.Id,
            Tid = post.Tid,
            Content = post.Content,
            CreatedAt = post.CreatedAt.HasValue ? DateTime.SpecifyKind(post.CreatedAt.Value, DateTimeKind.Utc) : null,
            Author = new AuthorDto
            {
                Id = post.Author.Id,
                Username = post.Author.Username,
                Handle = post.Author.Handle,
                DisplayName = post.Author.DisplayName,
                AvatarUrl = post.Author.AvatarUrl,
                IsFollowing = false // Default, overridden in context-aware methods
            },
            ImageUrls = post.PostMedia.Where(m => m.Type == "image").Select(m => m.Url).ToList(),
            VideoUrl = post.PostMedia.FirstOrDefault(m => m.Type == "video")?.Url,
            LikesCount = post.LikesCount ?? 0,
            RepostsCount = post.RepostsCount ?? 0,
            RepliesCount = post.RepliesCount ?? 0,
            BookmarksCount = post.BookmarksCount ?? 0,
            ReplyToPostId = post.ReplyToPostId,
            ReplyToHandle = post.ReplyToPost?.Author?.Handle,
            RootPostId = post.RootPostId,
            IsLiked = false, // Default
            IsBookmarked = false, // Default
            IsReposted = false, // Default
            LinkPreview = post.LinkPreview == null ? null : new LinkPreviewDto
            {
                Url = post.LinkPreview.Url,
                Title = post.LinkPreview.Title,
                Description = post.LinkPreview.Description,
                Image = post.LinkPreview.Image,
                Domain = post.LinkPreview.Domain
            },
            Tags = post.Hashtags?.Select(h => h.Name).ToList() ?? new List<string>(),
            Interests = post.Interests?.Select(i => i.Name).ToList() ?? new List<string>(),
            ReplyRestriction = post.ReplyRestriction ?? "anyone",
            AllowQuotes = post.AllowQuotes ?? true
        };
    }

    private string GenerateTid()
    {
        // Simple TID generator for now (333rd-style)
        return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
    }

    private async Task<string> SaveFileAsync(IFormFile file, string folder)
    {
        var uploadsRoot = Path.Combine(_environment.WebRootPath, "uploads", folder);
        if (!Directory.Exists(uploadsRoot)) Directory.CreateDirectory(uploadsRoot);

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(uploadsRoot, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return $"/uploads/{folder}/{fileName}";
    }

    private async Task SendNotificationAsync(Guid notificationId)
    {
        var savedNotification = await _unitOfWork.Notifications.Query()
            .Include(n => n.Sender)
            .FirstOrDefaultAsync(n => n.Id == notificationId);

        if (savedNotification != null)
        {
            var notificationDto = new NotificationDto(
                savedNotification.Id,
                savedNotification.Type ?? "like",
                new UserDto(
                    savedNotification.Sender.Id,
                    savedNotification.Sender.Username,
                    savedNotification.Sender.Handle,
                    savedNotification.Sender.Email,
                    savedNotification.Sender.DisplayName,
                    savedNotification.Sender.AvatarUrl,
                    savedNotification.Sender.CoverImageUrl,
                    savedNotification.Sender.Bio,
                    savedNotification.Sender.Location,
                    savedNotification.Sender.Website,
                    savedNotification.Sender.DateOfBirth,
                    savedNotification.Sender.FollowersCount,
                    savedNotification.Sender.FollowingCount,
                    savedNotification.Sender.PostsCount
                ),
                savedNotification.PostId,
                savedNotification.ListId,
                savedNotification.Title,
                savedNotification.Content,
                savedNotification.IsRead ?? false,
                DateTime.SpecifyKind(savedNotification.CreatedAt ?? DateTime.UtcNow, DateTimeKind.Utc)
            );

            await _hubContext.Clients.Group($"user-{savedNotification.RecipientId}")
                .SendAsync("ReceiveNotification", notificationDto);
        }
    }

    public async Task<IEnumerable<PostDto>> GetPostsByTagAsync(string tag, Guid? viewerId = null, int limit = 20, int offset = 0)
    {
        var posts = await _unitOfWork.Posts.GetPostsByTagAsync(tag, limit, offset);
        var postDtos = posts.Select(MapToDto).ToList();

        if (viewerId.HasValue)
        {
            postDtos = await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
        }

        return postDtos;
    }
}
