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
    private readonly ISearchService _searchService;

    public PostService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, IHubContext<ChatHub> hubContext, ILinkService linkService, ICacheService cacheService, ICategorizationService categorizationService, ISearchService searchService)
    {
        _unitOfWork = unitOfWork;
        _environment = environment;
        _hubContext = hubContext;
        _linkService = linkService;
        _cacheService = cacheService;
        _categorizationService = categorizationService;
        _searchService = searchService;
    }

    public async Task<IEnumerable<PostDto>> GetTimelineAsync(Guid userId, int skip = 0, int take = 20)
    {
        var cacheKey = $"user:{userId}:timeline:{skip}:{take}";
        var cached = await _cacheService.GetAsync<List<PostDto>>(cacheKey);
        if (cached != null)
        {
            return await EnrichAndFilterPostsAsync(cached, userId, true);
        }

        var followedUserIds = await _unitOfWork.Follows.Query()
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync();
        
        // Include the user's own posts in the Following feed
        followedUserIds.Add(userId);

        var posts = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.Hashtags)
            .Include(p => p.Reposts).ThenInclude(r => r.User)
            .Where(p => followedUserIds.Contains(p.AuthorId) && (p.IsDeleted == false || p.IsDeleted == null))
            .OrderByDescending(p => p.CreatedAt)
            .Skip(skip) // APPLY SKIP!
            .Take(take) // APPLY TAKE!
            .ToListAsync();
        
        var postDtos = new List<PostDto>();
        foreach (var post in posts)
        {
            var dto = MapToDto(post);
            
            // Repost banner logic
            var reposter = post.Reposts?.FirstOrDefault(r => followedUserIds.Contains(r.UserId) && r.UserId != post.AuthorId);
            if (reposter == null)
            {
                reposter = post.Reposts?.FirstOrDefault(r => r.UserId == userId);
            }

            if (reposter != null && reposter.User != null)
            {
                dto.RepostedBy = new AuthorDto 
                {
                    Id = reposter.User.Id,
                    Username = reposter.User.Username,
                    Handle = reposter.User.Handle,
                    DisplayName = reposter.User.DisplayName,
                    AvatarUrl = reposter.User.AvatarUrl
                };
            }
            postDtos.Add(dto);
        }

        await _cacheService.SetAsync(cacheKey, postDtos, TimeSpan.FromMinutes(2));
        return await EnrichAndFilterPostsAsync(postDtos, userId, true);
    }

    public async Task<IEnumerable<PostDto>> GetUserPostsAsync(Guid userId, string? type = null, Guid? viewerId = null, int limit = 30, int offset = 0)
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
        
        var profileUser = await _unitOfWork.Users.GetByIdAsync(userId);
        var profileUserDto = profileUser == null ? null : new AuthorDto
        {
            Id = profileUser.Id,
            Username = profileUser.Username,
            Handle = profileUser.Handle,
            DisplayName = profileUser.DisplayName,
            AvatarUrl = profileUser.AvatarUrl
        };

        var postDtos = posts.Select(p => {
            var dto = MapToDto(p);
            
            // Check if the post is shown because it was reposted by the profile owner
            // In the "posts" tab, we show own posts AND reposts.
            // If it's another person's post, it's definitely a repost.
            // If it's own post, it's shown as a repost only if there's a repost record.
            bool isRepost = p.AuthorId != userId || p.Reposts.Any(r => r.UserId == userId);

            if (isRepost && profileUserDto != null && (type == null || type == "posts"))
            {
                // For own posts, we only show the banner if it's NOT the primary authoring event
                // This is slightly tricky without a separate FeedItem table, but for now 
                // let's show it if it's not their own post, OR if we want to be explicit.
                if (p.AuthorId != userId)
                {
                    dto.RepostedBy = profileUserDto;
                }
                // If it's their own post, BlueSky usually doesn't show "Reposted by you" in your own "Posts" tab
                // unless it's a separate entity in the feed. Our current query returns it once.
            }
            return dto;
        }).ToList();
        
        // Cache for 1 minute
        await _cacheService.SetAsync(cacheKey, postDtos, TimeSpan.FromMinutes(1));
        
        if (viewerId.HasValue)
        {
            postDtos = await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
        }

        return postDtos;
    }

    public async Task<List<PostDto>> EnrichAndFilterPostsAsync(List<PostDto> posts, Guid viewerId, bool isTimeline = false)
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
        var blockedByUserIds = await _unitOfWork.Blocks.Query()
            .Where(b => b.BlockedUserId == viewerId)
            .Select(b => b.UserId)
            .ToListAsync();

        var usersFollowingViewerIds = await _unitOfWork.Follows.Query()
            .Where(f => f.FollowingId == viewerId)
            .Select(f => f.FollowerId)
            .ToListAsync();

        var viewerUser = await _unitOfWork.Users.GetByIdAsync(viewerId);
        var viewerHandle = viewerUser?.Handle?.ToLower();

        // Fetch user settings for timeline filtering
        UserSetting? userSettings = null;
        if (isTimeline)
        {
            userSettings = await _unitOfWork.UserSettings.Query()
                .FirstOrDefaultAsync(s => s.UserId == viewerId);
        }

        var filteredPosts = new List<PostDto>();
        foreach (var post in posts)
        {
            // Apply Timeline Filtering
            if (isTimeline && userSettings != null)
            {
                // Filter Replies
                if (userSettings.ShowReplies == false && post.ReplyToPostId != null)
                {
                    continue;
                }

                // Filter Quote Posts
                if (userSettings.ShowQuotePosts == false && post.QuotePostId != null)
                {
                    continue;
                }

                // Filter Reposts
                if (userSettings.ShowReposts == false && post.RepostedBy != null)
                {
                    continue;
                }
            }
            // Filter out deleted, muted or blocked users
            if (post.IsDeleted ||
                mutedUserIds.Contains(post.Author.Id) || 
                blockedUserIds.Contains(post.Author.Id) || 
                blockedByUserIds.Contains(post.Author.Id))
            {
                continue;
            }

            post.IsLiked = likedPostIds.Contains(post.Id);
            post.IsBookmarked = bookmarkedPostIds.Contains(post.Id);
            post.IsReposted = repostedPostIds.Contains(post.Id);
            post.Author.IsFollowing = followingIds.Contains(post.Author.Id);

            // Calculate CanReply logic
            if (post.Author.Id == viewerId)
            {
                post.CanReply = true;
            }
            else
            {
                var restriction = post.ReplyRestriction?.ToLower()?.Trim() ?? "anyone";
                if (restriction == "anyone")
                {
                    post.CanReply = true;
                }
                else if (restriction == "none" || restriction == "no_one")
                {
                    post.CanReply = false;
                }
                else if (restriction == "followed")
                {
                    // Author follows viewer OR viewer is mentioned
                    bool follows = usersFollowingViewerIds.Contains(post.Author.Id);
                    if (follows)
                    {
                        post.CanReply = true;
                    }
                    else
                    {
                        post.CanReply = await IsUserMentionedAsync(post.Content, viewerHandle);
                    }
                }
                else if (restriction == "mentioned")
                {
                    post.CanReply = await IsUserMentionedAsync(post.Content, viewerHandle);
                }
                else
                {
                    post.CanReply = false; // Default to false for unknown restrictions
                }
            }

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
        Notification? quoteNotification = null;
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
                QuotePostId = request.QuotePostId,
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
            for (int i = 0; i < request.Images.Count; i++)
            {
                var file = request.Images[i];
                var altText = request.AltTexts != null && i < request.AltTexts.Count ? request.AltTexts[i] : null;
                var imagePath = await SaveFileAsync(file, "posts");
                post.PostMedia.Add(new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "image",
                    Url = imagePath,
                    AltText = altText,
                    Position = i,
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
                string domain = request.LinkPreviewDomain ?? "unknown";
                try
                {
                    if (Uri.TryCreate(request.LinkPreviewUrl, UriKind.Absolute, out var uri))
                    {
                        domain = request.LinkPreviewDomain ?? uri.Host.Replace("www.", "");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[CreatePostAsync] Error parsing LinkPreviewUrl URI: {ex.Message}");
                }

                post.LinkPreview = new LinkPreview
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Url = request.LinkPreviewUrl,
                    Title = request.LinkPreviewTitle,
                    Description = request.LinkPreviewDescription,
                    Image = request.LinkPreviewImage,
                    Domain = domain,
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
                // Check if blocked
                var isBlocked = await _unitOfWork.Blocks.Query()
                    .AnyAsync(b => (b.UserId == parentPost.AuthorId && b.BlockedUserId == userId) || 
                                   (b.UserId == userId && b.BlockedUserId == parentPost.AuthorId));
                if (isBlocked)
                {
                    throw new Exception("Interaction blocked.");
                }

                // Enforce Reply Restrictions
                var restriction = parentPost.ReplyRestriction?.ToLower()?.Trim() ?? "anyone";
                
                if (!string.Equals(restriction, "anyone", StringComparison.OrdinalIgnoreCase) && parentPost.AuthorId != userId)
                {
                    bool canReply = false;

                    if (restriction == "none" || restriction == "no_one")
                    {
                        canReply = false;
                    }
                    else if (restriction == "followed")
                    {
                        // Author must follow the current user OR current user must be mentioned
                        var isFollowedByAuthor = await _unitOfWork.Follows.IsFollowingAsync(parentPost.AuthorId, userId);
                        if (isFollowedByAuthor)
                        {
                            canReply = true;
                        }
                        else
                        {
                            // Check for mention as a fallback
                            canReply = await IsUserMentionedAsync(parentPost, userId);
                        }
                    }
                    else if (restriction == "mentioned")
                    {
                        canReply = await IsUserMentionedAsync(parentPost, userId);
                    }

                    if (!canReply)
                    {
                        throw new Exception("You are not allowed to reply to this post based on the author's interaction settings.");
                    }
                }

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

        if (request.QuotePostId.HasValue)
        {
            var quotedPost = await _unitOfWork.Posts.GetByIdAsync(request.QuotePostId.Value);
            if (quotedPost != null)
            {
                quotedPost.QuotesCount = (quotedPost.QuotesCount ?? 0) + 1;
                _unitOfWork.Posts.Update(quotedPost);

                if (quotedPost.AuthorId != userId)
                {
                    quoteNotification = new Notification
                    {
                        Id = Guid.NewGuid(),
                        Tid = GenerateTid(),
                        Type = "quote",
                        SenderId = userId,
                        RecipientId = quotedPost.AuthorId,
                        PostId = post.Id,
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        IsDeleted = false
                    };
                    await _unitOfWork.Notifications.AddAsync(quoteNotification);
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

        if (quoteNotification != null)
        {
            await SendNotificationAsync(quoteNotification.Id);
        }

        // Invalidate timeline cache for the author
        await _cacheService.RemoveAsync($"user:{userId}:timeline");

        // Refresh to get Author and Media, and Reply info for the DTO
        var savedPost = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.Hashtags)
            .Include(p => p.Interests)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .AsSplitQuery()
            .FirstOrDefaultAsync(p => p.Id == post.Id);

        // Index in Elasticsearch
        await _searchService.IndexPostAsync(savedPost!);

        return MapToDto(savedPost!);
    }
    finally
    {
        await _cacheService.ReleaseLockAsync(lockKey);
    }
}

    public async Task<PostDto?> UpdatePostAsync(Guid userId, Guid postId, CreatePostRequest request)
    {
        Console.WriteLine($"[UpdatePostAsync] Starting update for Post {postId} by User {userId}");
        try
        {
            var post = await _unitOfWork.Posts.Query()
                .Include(p => p.PostMedia)
                .Include(p => p.LinkPreview)
                .Include(p => p.Hashtags)
                .Include(p => p.Interests)
                .FirstOrDefaultAsync(p => p.Id == postId && (p.IsDeleted == false || p.IsDeleted == null));

            if (post == null)
            {
                Console.WriteLine($"[UpdatePostAsync] Post {postId} not found");
                return null;
            }
            if (post.AuthorId != userId)
            {
                Console.WriteLine($"[UpdatePostAsync] User {userId} unauthorized to edit Post {postId}");
                return null;
            }

            // Update content
            post.Content = request.Content;

            // Update AltTexts for existing media if provided
            if (request.AltTexts != null && post.PostMedia != null)
            {
                var existingMedia = post.PostMedia.OrderBy(m => m.Position ?? 0).ToList();
                int existingCount = existingMedia.Count;
                
                for (int i = 0; i < existingCount && i < request.AltTexts.Count; i++)
                {
                    existingMedia[i].AltText = request.AltTexts[i];
                }

                // Handle New Images if any
                if (request.Images != null && request.Images.Any())
                {
                    for (int i = 0; i < request.Images.Count; i++)
                    {
                        var file = request.Images[i];
                        var altText = (existingCount + i) < request.AltTexts.Count ? request.AltTexts[existingCount + i] : null;
                        var imagePath = await SaveFileAsync(file, "posts");
                        post.PostMedia.Add(new PostMedium
                        {
                            Id = Guid.NewGuid(),
                            PostId = post.Id,
                            Type = "image",
                            Url = imagePath,
                            AltText = altText,
                            Position = existingCount + i,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
            }
            else if (request.Images != null && request.Images.Any())
            {
                // This case handles adding images to a post that had none
                for (int i = 0; i < request.Images.Count; i++)
                {
                    var file = request.Images[i];
                    var altText = request.AltTexts != null && i < request.AltTexts.Count ? request.AltTexts[i] : null;
                    var imagePath = await SaveFileAsync(file, "posts");
                    post.PostMedia ??= new List<PostMedium>();
                    post.PostMedia.Add(new PostMedium
                    {
                        Id = Guid.NewGuid(),
                        PostId = post.Id,
                        Type = "image",
                        Url = imagePath,
                        AltText = altText,
                        Position = i,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            // Handle Link Preview - Safer update logic
            if (!string.IsNullOrEmpty(request.LinkPreviewUrl))
            {
                string domain = request.LinkPreviewDomain ?? "unknown";
                try
                {
                    if (Uri.TryCreate(request.LinkPreviewUrl, UriKind.Absolute, out var uri))
                    {
                        domain = request.LinkPreviewDomain ?? uri.Host.Replace("www.", "");
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[UpdatePostAsync] Error parsing URI: {ex.Message}");
                }

                if (post.LinkPreview != null)
                {
                    // Update existing LinkPreview properties
                    post.LinkPreview.Url = request.LinkPreviewUrl;
                    post.LinkPreview.Title = request.LinkPreviewTitle;
                    post.LinkPreview.Description = request.LinkPreviewDescription;
                    post.LinkPreview.Image = request.LinkPreviewImage;
                    post.LinkPreview.Domain = domain;
                }
                else
                {
                    // Create new LinkPreview
                    post.LinkPreview = new LinkPreview
                    {
                        Id = Guid.NewGuid(),
                        PostId = post.Id,
                        Url = request.LinkPreviewUrl,
                        Title = request.LinkPreviewTitle,
                        Description = request.LinkPreviewDescription,
                        Image = request.LinkPreviewImage,
                        Domain = domain,
                        CreatedAt = DateTime.UtcNow
                    };
                }
            }
            else if (post.LinkPreview != null)
            {
                // If URL is empty but preview exists, user might have removed it
                _unitOfWork.LinkPreviews.Remove(post.LinkPreview);
                post.LinkPreview = null;
            }

            // DO NOT call _unitOfWork.Posts.Update(post) - standard EF change tracking handles it
            await _unitOfWork.CompleteAsync();
            Console.WriteLine("[UpdatePostAsync] DB changes saved successfully");
            
            // Invalidate caches
            await _cacheService.RemoveAsync($"post:{postId}");
            await _cacheService.RemoveAsync($"user:{userId}:timeline");
            
            // Re-fetch for DTO mapping
            var savedPost = await _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .Include(p => p.PostMedia)
                .Include(p => p.LinkPreview)
                .Include(p => p.Hashtags)
                .Include(p => p.Interests)
                .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                .AsSplitQuery()
                .FirstOrDefaultAsync(p => p.Id == postId);
                
            if (savedPost == null)
            {
                Console.WriteLine("[UpdatePostAsync] Critical: Saved post not found after update");
                return null;
            }

            try
            {
                await _searchService.IndexPostAsync(savedPost);
                Console.WriteLine("[UpdatePostAsync] Post indexed");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UpdatePostAsync] Indexing failed: {ex.Message}");
            }

            return MapToDto(savedPost);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UpdatePostAsync] EXCEPTION: {ex}");
            throw;
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
                .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                .AsSplitQuery()
                .FirstOrDefaultAsync(p => p.Id == postId && (p.IsDeleted == false || p.IsDeleted == null));

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

            // Calculate CanReply
            if (postDto.Author.Id == viewerId.Value)
            {
                postDto.CanReply = true;
            }
            else
            {
                var restriction = postDto.ReplyRestriction?.ToLower()?.Trim() ?? "anyone";
                if (restriction == "anyone")
                {
                    postDto.CanReply = true;
                }
                else if (restriction == "none" || restriction == "no_one")
                {
                    postDto.CanReply = false;
                }
                else if (restriction == "followed")
                {
                    // Author follows viewer OR viewer is mentioned
                    var authorFollowsViewer = await _unitOfWork.Follows.IsFollowingAsync(postDto.Author.Id, viewerId.Value);
                    if (authorFollowsViewer)
                    {
                        postDto.CanReply = true;
                    }
                    else
                    {
                        var viewerUser = await _unitOfWork.Users.GetByIdAsync(viewerId.Value);
                        postDto.CanReply = await IsUserMentionedAsync(postDto.Content, viewerUser?.Handle);
                    }
                }
                else if (restriction == "mentioned")
                {
                    var viewerUser = await _unitOfWork.Users.GetByIdAsync(viewerId.Value);
                    postDto.CanReply = await IsUserMentionedAsync(postDto.Content, viewerUser?.Handle);
                }
                else
                {
                    postDto.CanReply = false;
                }
            }
        }

        // Always fetch live counts for the detail view to ensure 100% accuracy
        postDto.LikesCount = await _unitOfWork.Likes.Query().CountAsync(l => l.PostId == postId);
        postDto.BookmarksCount = await _unitOfWork.Bookmarks.Query().CountAsync(b => b.PostId == postId);
        postDto.RepostsCount = await _unitOfWork.Reposts.Query().CountAsync(r => r.PostId == postId);

        return postDto;
    }

    public async Task<List<Guid>> DeletePostAsync(Guid userId, Guid postId)
    {
        var rootPost = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (rootPost == null || rootPost.AuthorId != userId)
            return null;

        if (rootPost.IsDeleted == true)
            return new List<Guid> { postId };

        var affectedIds = new List<Guid>();
        var queue = new Queue<Guid>();
        queue.Enqueue(postId);

        while (queue.Count > 0)
        {
            var currentId = queue.Dequeue();
            var post = await _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .FirstOrDefaultAsync(p => p.Id == currentId);

            if (post == null || post.IsDeleted == true)
                continue;

            affectedIds.Add(currentId);

            // 1. Soft delete the post
            post.IsDeleted = true;
            _unitOfWork.Posts.Update(post);

            // 2. Decrement Author's PostsCount
            if (post.Author != null)
            {
                post.Author.PostsCount = Math.Max(0, (post.Author.PostsCount ?? 0) - 1);
                _unitOfWork.Users.Update(post.Author);
            }

            // 3. Purge physical relations (Reposts, Bookmarks, Likes)
            var reposts = await _unitOfWork.Reposts.Query().Where(r => r.PostId == currentId).ToListAsync();
            foreach (var r in reposts) _unitOfWork.Reposts.Remove(r);

            var bookmarks = await _unitOfWork.Bookmarks.Query().Where(b => b.PostId == currentId).ToListAsync();
            foreach (var b in bookmarks) _unitOfWork.Bookmarks.Remove(b);

            var likes = await _unitOfWork.Likes.Query().Where(l => l.PostId == currentId).ToListAsync();
            foreach (var l in likes) _unitOfWork.Likes.Remove(l);

            var notifications = await _unitOfWork.Notifications.Query().Where(n => n.PostId == currentId).ToListAsync();
            foreach (var n in notifications) _unitOfWork.Notifications.Remove(n);

            // 4. Cascade to all replies and quotes and descendants
            var relatedIds = await _unitOfWork.Posts.Query()
                .Where(p => (p.IsDeleted == false || p.IsDeleted == null) && 
                           (p.ReplyToPostId == currentId || p.RootPostId == currentId || p.QuotePostId == currentId))
                .Select(p => p.Id)
                .ToListAsync();

            foreach (var rid in relatedIds)
            {
                if (!affectedIds.Contains(rid))
                {
                    queue.Enqueue(rid);
                }
            }
        }

        await _unitOfWork.CompleteAsync();

        // Cleanup caches and search index for all affected posts
        foreach (var id in affectedIds)
        {
            await _cacheService.RemoveAsync($"post:{id}");
            await _searchService.DeletePostAsync(id);
        }

        // Broad timeline/trending invalidation
        await _cacheService.RemoveAsync($"user:{userId}:timeline");
        await _cacheService.RemoveAsync("posts:trending");

        return affectedIds;
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
            .FirstOrDefaultAsync(p => p.Id == postId && (p.IsDeleted == false || p.IsDeleted == null));
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
            .FirstOrDefaultAsync(p => p.Id == postId && (p.IsDeleted == false || p.IsDeleted == null));

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
            .FirstOrDefaultAsync(p => p.Id == postId && (p.IsDeleted == false || p.IsDeleted == null));

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
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .AsSplitQuery()
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
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                .AsSplitQuery()
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

    public async Task<IEnumerable<PostDto>> GetTrendingPosts24hAsync(Guid? viewerId = null, int limit = 50, int skip = 0)
    {
        var posts = await _unitOfWork.Posts.GetTrendingPosts24hAsync(limit, skip);
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
            .Include(b => b.Post)
                .ThenInclude(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(b => b.Post)
                .ThenInclude(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(b => b.Post)
                .ThenInclude(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => b.Post)
            .ToListAsync();

        var postDtos = bookmarkedPosts.Select(MapToDto).ToList();
        return await EnrichAndFilterPostsAsync(postDtos, userId);
    }

    public async Task<IEnumerable<PostDto>> SearchPostsDBAsync(string query, Guid? viewerId = null, int limit = 20, int offset = 0)
    {
        var lowerQuery = query.ToLower();
        var posts = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.Hashtags)
            .Where(p => (p.IsDeleted == false || p.IsDeleted == null) &&
                        (p.Content.ToLower().Contains(lowerQuery) || 
                         p.Hashtags.Any(h => h.Name.ToLower().Contains(lowerQuery))))
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var postDtos = posts.Select(MapToDto).ToList();
        if (viewerId.HasValue)
        {
            return await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
        }
        return postDtos;
    }

    public PostDto MapToDto(Post post) => MapToDto(post, true, true);

    private PostDto MapToDto(Post post, bool includeQuote, bool includeParent)
    {
        return new PostDto
        {
            Id = post.Id,
            Tid = post.Tid,
            Content = post.Content,
            CreatedAt = post.CreatedAt.HasValue ? DateTime.SpecifyKind(post.CreatedAt.Value, DateTimeKind.Utc) : null,
            Author = post.Author == null ? new AuthorDto { Username = "unknown", Handle = "unknown" } : new AuthorDto
            {
                Id = post.Author.Id,
                Username = post.Author.Username,
                Handle = post.Author.Handle,
                DisplayName = post.Author.DisplayName,
                AvatarUrl = post.Author.AvatarUrl,
                IsFollowing = false // Default
            },
            ImageUrls = post.PostMedia.Where(m => m.Type == "image").Select(m => m.Url).ToList(),
            Media = post.PostMedia.OrderBy(m => m.Position ?? 0).Select(m => new MediaDto
            {
                Url = m.Url,
                AltText = m.AltText,
                Type = m.Type
            }).ToList(),
            VideoUrl = post.PostMedia.FirstOrDefault(m => m.Type == "video")?.Url,
            LikesCount = post.LikesCount ?? 0,
            RepostsCount = post.RepostsCount ?? 0,
            RepliesCount = post.RepliesCount ?? 0,
            QuotesCount = post.QuotesCount ?? 0,
            BookmarksCount = post.BookmarksCount ?? 0,
            ReplyToPostId = post.ReplyToPostId,
            ReplyToHandle = post.ReplyToPost?.Author?.Handle,
            RootPostId = post.RootPostId,
            IsLiked = false,
            IsBookmarked = false,
            IsReposted = false,
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
            AllowQuotes = post.AllowQuotes ?? true,
            IsDeleted = post.IsDeleted ?? false,
            QuotePostId = post.QuotePostId,
            QuotePost = (includeQuote && post.QuotePost != null) ? MapToDto(post.QuotePost, false, false) : null,
            ParentPost = (includeParent && post.ReplyToPost != null) ? MapToDto(post.ReplyToPost, false, false) : null,
            CanReply = true // Default
        };
    }

    private string GenerateTid()
    {
        // Simple TID generator for now (333rd-style)
        return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
    }

    private async Task<bool> IsUserMentionedAsync(Post post, Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        return await IsUserMentionedAsync(post.Content, user?.Handle);
    }

    private async Task<bool> IsUserMentionedAsync(string? content, string? handle)
    {
        if (string.IsNullOrEmpty(handle) || string.IsNullOrEmpty(content)) return false;

        var lowerContent = content.ToLower();
        var lowerHandle = handle.ToLower();

        bool isMentioned = Regex.IsMatch(lowerContent, $@"\B@{Regex.Escape(lowerHandle)}\b", RegexOptions.IgnoreCase);
        if (!isMentioned && lowerHandle.Contains("."))
        {
            var prefix = lowerHandle.Split('.')[0];
            isMentioned = Regex.IsMatch(lowerContent, $@"\B@{Regex.Escape(prefix)}\b", RegexOptions.IgnoreCase);
        }
        return isMentioned;
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
        var posts = await _unitOfWork.Posts.Query()
            .Where(p => p.Content != null && p.Content.Contains("#" + tag) && (p.IsDeleted == false || p.IsDeleted == null))
            .Include(p => p.Author)
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        var dtos = posts.Select(p => MapToDto(p)).ToList();
        return viewerId.HasValue ? await EnrichAndFilterPostsAsync(dtos, viewerId.Value) : dtos;
    }

    public async Task<IEnumerable<PostDto>> GetDiscoverPostsAsync(Guid userId, int limit = 50, int skip = 0)
    {
        // 1. Get user interests
        var userSettings = await _unitOfWork.Users.Query()
            .Where(u => u.Id == userId)
            .Select(u => u.UserSetting)
            .FirstOrDefaultAsync();

        List<string> userInterests = new();
        if (userSettings?.SelectedInterests != null)
        {
            try {
                userInterests = System.Text.Json.JsonSerializer.Deserialize<List<string>>(userSettings.SelectedInterests) ?? new();
            } catch { }
        }

        // Fallback: If no interests, just show trending
        if (!userInterests.Any())
        {
            return await GetTrendingPosts24hAsync(userId, limit);
        }

        // 2. Fetch a pool of recent posts (past 72h)
        var poolCutoff = DateTime.UtcNow.AddDays(-3);
        var postPool = await _unitOfWork.Posts.Query()
            .Where(p => p.CreatedAt >= poolCutoff && (p.IsDeleted == false || p.IsDeleted == null) && p.ReplyToPostId == null)
            .Where(p => p.AuthorId != userId) // EXCLUDE USER'S OWN POSTS FROM DISCOVER
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .OrderByDescending(p => p.LikesCount + p.RepostsCount)
            .Take(2000)
            .ToListAsync();

        // 3. Score and rank posts
        var scoredPosts = new List<(Post Post, float Score)>();

        foreach (var post in postPool)
        {
            float score = 0;

            // AI Categorization Score
            var imageUrls = post.PostMedia?.Where(m => m.Type == "image" && !string.IsNullOrEmpty(m.Url))
                                      .Select(m => m.Url!)
                                      .ToList();
            
            var categoryScores = await _categorizationService.ScorePostForDiscoverAsync(post.Content ?? "", imageUrls);
            
            // Boost score based on matches with user interests
            foreach (var interest in userInterests)
            {
                if (categoryScores.TryGetValue(interest, out var confidence))
                {
                    score += confidence * 10.0f; // Significant boost for interest match
                }
            }

            // Engagement Score (scaled)
            score += ((post.LikesCount ?? 0) * 1.0f) + ((post.RepostsCount ?? 0) * 2.0f);

            // Recency Score (decay)
            var hoursOld = (DateTime.UtcNow - (post.CreatedAt ?? DateTime.UtcNow)).TotalHours;
            var recencyFactor = (float)Math.Exp(-hoursOld / 24.0); // 24h half-life
            score *= recencyFactor;

            if (score > 0)
            {
                scoredPosts.Add((post, score));
            }
        }

        // 4. Return top ranked posts
        var result = scoredPosts
            .OrderByDescending(x => x.Score)
            .Skip(skip)
            .Take(limit)
            .Select(x => MapToDto(x.Post))
            .ToList();

        return await EnrichAndFilterPostsAsync(result, userId);
    }
}
