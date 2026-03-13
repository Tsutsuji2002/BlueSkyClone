using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using BSkyClone.Hubs;
using System.Text.RegularExpressions;
using System.Text;
using BSkyClone.Utilities;

namespace BSkyClone.Services;

public class PostService : IPostService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IHubContext<PostHub> _postHubContext;
    private readonly ILinkService _linkService;
    private readonly ICacheService _cacheService;
    private readonly ICategorizationService _categorizationService;
    private readonly ISearchService _searchService;
    private readonly IRepoManager _repoManager;

    public PostService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, IHubContext<ChatHub> hubContext, IHubContext<PostHub> postHubContext, ILinkService linkService, ICacheService cacheService, ICategorizationService categorizationService, ISearchService searchService, IRepoManager repoManager)
    {
        _unitOfWork = unitOfWork;
        _environment = environment;
        _hubContext = hubContext;
        _postHubContext = postHubContext;
        _linkService = linkService;
        _cacheService = cacheService;
        _categorizationService = categorizationService;
        _searchService = searchService;
        _repoManager = repoManager;
    }

    public async Task<IEnumerable<PostDto>> GetTimelineAsync(Guid userId, int skip = 0, int take = 20)
    {
        try
        {
            // Timeline filtering is viewer-specific (settings, mutes/blocks). Apply the major filters
            // at the query level so pagination doesn't "run out" early due to post-fetch filtering.
            UserSetting? userSettings = null;
            try
            {
                userSettings = await _unitOfWork.UserSettings.Query()
                    .FirstOrDefaultAsync(s => s.UserId == userId);
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[PostService] GetTimelineAsync: Error fetching UserSettings for {userId}: {ex.Message}. Using defaults.");
            }

            var showReplies = userSettings?.ShowReplies ?? true;
            var showQuotePosts = userSettings?.ShowQuotePosts ?? true;
            var showReposts = userSettings?.ShowReposts ?? true;

            var cacheKey = $"user:{userId}:timeline:{skip}:{take}:sr{showReplies}:sq{showQuotePosts}:sp{showReposts}";
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

            var mutedAccounts = await _unitOfWork.Mutes.GetMutedAccountsAsync(userId);
            var mutedUserIds = mutedAccounts.Select(m => m.MutedUserId).ToList();

            var blockedUserIds = await _unitOfWork.Blocks.GetBlockedUserIdsAsync(userId);
            var blockedByUserIds = await _unitOfWork.Blocks.Query()
                .Where(b => b.BlockedUserId == userId)
                .Select(b => b.UserId)
                .ToListAsync();

            var postsQuery = _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .Include(p => p.PostMedia)
                .Include(p => p.LinkPreview)
                .Include(p => p.Hashtags)
                .Include(p => p.Reposts).ThenInclude(r => r.User)
                .Where(p =>
                    followedUserIds.Contains(p.AuthorId) &&
                    (p.IsDeleted == false || p.IsDeleted == null) &&
                    !mutedUserIds.Contains(p.AuthorId) &&
                    !blockedUserIds.Contains(p.AuthorId) &&
                    !blockedByUserIds.Contains(p.AuthorId));

            if (showReplies == false)
            {
                postsQuery = postsQuery.Where(p => p.ReplyToPostId == null);
            }

            if (showQuotePosts == false)
            {
                postsQuery = postsQuery.Where(p => p.QuotePostId == null);
            }

            var posts = await postsQuery
                .OrderByDescending(p => p.CreatedAt)
                .Skip(skip)
                .Take(take)
                .ToListAsync();
            
            var postDtos = new List<PostDto>();
            foreach (var post in posts)
            {
                var dto = MapToDto(post);
                
                // Repost banner logic
                var reposter = post.Reposts?.FirstOrDefault(r => followedUserIds.Contains(r.UserId) && (post.Author == null || r.UserId != post.Author.Id));
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
                        AvatarUrl = reposter.User.AvatarUrl,
                        IsVerified = reposter.User.IsVerified,
                        Did = reposter.User.Did
                    };
                }
                postDtos.Add(dto);
            }

            await _cacheService.SetAsync(cacheKey, postDtos, TimeSpan.FromMinutes(2));
            return await EnrichAndFilterPostsAsync(postDtos, userId, true);
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] GetTimelineAsync: Critical Error: {ex.Message}");
            return new List<PostDto>();
        }
    }


    public async Task<IEnumerable<PostDto>> GetUserPostsAsync(Guid userId, string? type = null, Guid? viewerId = null, int limit = 30, int offset = 0)
    {
        try
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
                AvatarUrl = profileUser.AvatarUrl,
                IsVerified = profileUser.IsVerified,
                Did = profileUser.Did
            };

            var postDtos = posts.Select(p => {
                var dto = MapToDto(p);
                
                bool isRepost = (p.AuthorId != userId) || (p.Reposts?.Any(r => r.UserId == userId) ?? false);

                if (isRepost && profileUserDto != null && (type == null || type == "posts"))
                {
                    if (p.AuthorId != userId)
                    {
                        dto.RepostedBy = profileUserDto;
                    }
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
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] GetUserPostsAsync: Error for userId={userId}, type={type}: {ex.Message}");
            return new List<PostDto>();
        }
    }


    public async Task<List<PostDto>> EnrichAndFilterPostsAsync(List<PostDto> posts, Guid viewerId, bool isTimeline = false)
    {
        try
        {
            if (!posts.Any()) return posts;

            var postIds = posts.Select(p => p.Id).ToList();

            var likedPostIds = new List<Guid>();
            try { likedPostIds = await _unitOfWork.Likes.Query().Where(l => l.UserId == viewerId && postIds.Contains(l.PostId)).Select(l => l.PostId).ToListAsync(); } catch { }

            var bookmarkedPostIds = new List<Guid>();
            try { bookmarkedPostIds = await _unitOfWork.Bookmarks.Query().Where(b => b.UserId == viewerId && postIds.Contains(b.PostId)).Select(b => b.PostId).ToListAsync(); } catch { }

            var repostedPostIds = new List<Guid>();
            try { repostedPostIds = await _unitOfWork.Reposts.Query().Where(r => r.UserId == viewerId && postIds.Contains(r.PostId)).Select(r => r.PostId).ToListAsync(); } catch { }

            var followingIds = new List<Guid>();
            try 
            { 
                var following = await _unitOfWork.Follows.GetFollowingAsync(viewerId);
                followingIds = following.Select(f => f.FollowingId).ToList();
            } catch { }

            var mutedWords = new List<MutedWord>();
            try { mutedWords = await _unitOfWork.MutedWords.Query().Where(w => w.UserId == viewerId).ToListAsync(); } catch { }

            var mutedUserIds = new List<Guid>();
            try { var mutedAccounts = await _unitOfWork.Mutes.GetMutedAccountsAsync(viewerId); mutedUserIds = mutedAccounts.Select(m => m.MutedUserId).ToList(); } catch { }

            var blockedUserIds = new List<Guid>();
            try { blockedUserIds = await _unitOfWork.Blocks.GetBlockedUserIdsAsync(viewerId); } catch { }

            var blockedByUserIds = new List<Guid>();
            try { blockedByUserIds = await _unitOfWork.Blocks.Query().Where(b => b.BlockedUserId == viewerId).Select(b => b.UserId).ToListAsync(); } catch { }

            var usersFollowingViewerIds = new List<Guid>();
            try { usersFollowingViewerIds = await _unitOfWork.Follows.Query().Where(f => f.FollowingId == viewerId).Select(f => f.FollowerId).ToListAsync(); } catch { }

            var viewerUser = await _unitOfWork.Users.GetByIdAsync(viewerId);
            var viewerHandle = viewerUser?.Handle?.ToLower();

            // Fetch user settings for timeline filtering
            UserSetting? userSettings = null;
            if (isTimeline)
            {
                try
                {
                    userSettings = await _unitOfWork.UserSettings.Query()
                        .FirstOrDefaultAsync(s => s.UserId == viewerId);
                }
                catch (Exception ex)
                {
                    System.Console.WriteLine($"[PostService] Error fetching UserSettings for {viewerId}: {ex.Message}");
                }
            }

            var filteredPosts = new List<PostDto>();
            foreach (var post in posts)
            {
                // Apply Timeline Filtering
                if (isTimeline)
                {
                    var sReplies = userSettings?.ShowReplies ?? true;
                    var sQuotes = userSettings?.ShowQuotePosts ?? true;
                    var sReposts = userSettings?.ShowReposts ?? true;

                    // Filter Replies
                    if (sReplies == false && post.ReplyToPostId != null)
                    {
                        continue;
                    }

                    // Filter Quote Posts
                    if (sQuotes == false && post.QuotePostId != null)
                    {
                        continue;
                    }

                    // Filter Reposts
                    if (sReposts == false && post.RepostedBy != null)
                    {
                        post.RepostedBy = null;
                    }
                }
                // Filter out deleted, muted or blocked users
                if (post.IsDeleted || post.Author == null ||
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
                        post.CanReply = false; 
                    }
                }

                if (mutedWords.Any())
                {
                    var content = post.Content?.ToLower() ?? "";
                    var tags = (post.Tags ?? new List<string>())
                        .Concat(post.Interests ?? new List<string>())
                        .Where(t => t != null)
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
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] EnrichAndFilterPostsAsync Error: {ex.Message}");
            return posts; // Return unenriched posts as fallback to prevent 500
        }
    }

    public async Task<PostDto> CreatePostAsync(Guid userId, CreatePostRequest request)
    {
        Notification? quoteNotification = null;
        var lockKey = $"lock:create_post:{userId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(3)))
        {
            throw new Exception("Please wait a moment before posting again.");
        }

        UserSetting? userSettings = null;
        try
        {
            userSettings = await _unitOfWork.UserSettings.GetByIdAsync(userId);
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] CreatePostAsync: Error fetching UserSettings for {userId}: {ex.Message}. Using defaults.");
        }

        var replyRestriction = request.ReplyRestriction ?? userSettings?.DefaultReplyRestriction ?? "anyone";
        var allowQuotes = request.AllowQuotes ?? userSettings?.DefaultAllowQuotes ?? true;
        var language = request.Language;

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
                AllowQuotes = allowQuotes,
                Language = language
            };

            if (!string.IsNullOrEmpty(request.GifUrl))
            {
                post.PostMedia.Add(new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "gif",
                    Url = request.GifUrl,
                    CreatedAt = DateTime.UtcNow
                });
            }



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
        else if (request.PreUploadedImageUrls != null && request.PreUploadedImageUrls.Any())
        {
             for (int i = 0; i < request.PreUploadedImageUrls.Count; i++)
             {
                 var altText = request.PreUploadedAltTexts != null && i < request.PreUploadedAltTexts.Count ? request.PreUploadedAltTexts[i] : null;
                 post.PostMedia.Add(new PostMedium
                 {
                     Id = Guid.NewGuid(),
                     PostId = post.Id,
                     Type = "image",
                     Url = request.PreUploadedImageUrls[i],
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
        else if (!string.IsNullOrEmpty(request.PreUploadedVideoUrl))
        {
            post.PostMedia.Add(new PostMedium
            {
                Id = Guid.NewGuid(),
                PostId = post.Id,
                Type = "video",
                Url = request.PreUploadedVideoUrl,
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

                if (parentPost.AuthorId != userId && await ShouldCreateNotificationAsync(parentPost.AuthorId, "reply"))
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

                if (quotedPost.AuthorId != userId && await ShouldCreateNotificationAsync(quotedPost.AuthorId, "quote"))
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

        // --- Phase 3: Repo Signing ---
        try
        {
            var authorUser = await _unitOfWork.Users.GetByIdAsync(userId);
            if (authorUser != null && !string.IsNullOrEmpty(authorUser.Did))
            {
                var postRecord = new Dictionary<string, object>
                {
                    { "$type", "app.bsky.feed.post" },
                    { "text", post.Content ?? "" },
                    { "createdAt", post.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O") }
                };
                var cid = await _repoManager.CreateRecordAsync(authorUser.Did, "app.bsky.feed.post", postRecord);
                await _repoManager.SignRepoAsync(authorUser.Did, cid);
                Console.WriteLine($"[CreatePostAsync] Repo updated and signed for User {userId}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CreatePostAsync] Phase 3 Error: {ex.Message}");
        }

        // Detect Mentions
        var mentions = Regex.Matches(request.Content ?? "", @"@(\w+)")
            .Cast<Match>()
            .Select(m => m.Groups[1].Value.ToLower())
            .Distinct()
            .ToList();

        foreach (var handle in mentions)
        {
            var mentionedUser = await _unitOfWork.Users.GetByHandleAsync($"{handle}.bsky.social");
            if (mentionedUser != null && mentionedUser.Id != userId && await ShouldCreateNotificationAsync(mentionedUser.Id, "mention"))
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

        // Broadcast Real-time Updates for parents
        var timestamp = DateTime.UtcNow;
        if (request.ReplyToPostId.HasValue)
        {
            var parent = await _unitOfWork.Posts.GetByIdAsync(request.ReplyToPostId.Value);
            if (parent != null)
            {
                await _postHubContext.Clients.All.SendAsync("UpdatePostStats", new 
                { 
                    postId = parent.Id, 
                    likesCount = parent.LikesCount,
                    repostsCount = parent.RepostsCount,
                    bookmarksCount = parent.BookmarksCount,
                    repliesCount = parent.RepliesCount,
                    quotesCount = parent.QuotesCount,
                    timestamp
                });
            }
        }
        if (request.QuotePostId.HasValue)
        {
            var quoted = await _unitOfWork.Posts.GetByIdAsync(request.QuotePostId.Value);
            if (quoted != null)
            {
                await _postHubContext.Clients.All.SendAsync("UpdatePostStats", new 
                { 
                    postId = quoted.Id, 
                    likesCount = quoted.LikesCount,
                    repostsCount = quoted.RepostsCount,
                    bookmarksCount = quoted.BookmarksCount,
                    repliesCount = quoted.RepliesCount,
                    quotesCount = quoted.QuotesCount,
                    timestamp
                });
            }
        }

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

            // Update basic fields
            post.Content = request.Content;
            post.Language = request.Language ?? post.Language;
            post.ReplyRestriction = request.ReplyRestriction ?? post.ReplyRestriction;
            post.AllowQuotes = request.AllowQuotes ?? post.AllowQuotes;

            // --- Media Management ---
            // Consolidate all media items to remove
            var mediaToRemove = post.PostMedia
                .Where(m => request.ExistingMediaIdsToKeep == null || !request.ExistingMediaIdsToKeep.Contains(m.Id))
                .ToList();

            // If we are providing a NEW video or GIF, ensure the existing ones are removed even if not explicitly in ExistingMediaIdsToKeep
            if (request.Video != null || !string.IsNullOrEmpty(request.PreUploadedVideoUrl))
            {
                var existingVideo = post.PostMedia.FirstOrDefault(m => m.Type == "video");
                if (existingVideo != null && !mediaToRemove.Contains(existingVideo)) mediaToRemove.Add(existingVideo);
            }
            if (!string.IsNullOrEmpty(request.GifUrl))
            {
                var existingGif = post.PostMedia.FirstOrDefault(m => m.Type == "gif");
                if (existingGif != null && !mediaToRemove.Contains(existingGif)) mediaToRemove.Add(existingGif);
            }

            foreach (var m in mediaToRemove)
            {
                if (_unitOfWork.PostMedia.Query().Any(pm => pm.Id == m.Id))
                {
                    _unitOfWork.PostMedia.Remove(m);
                }
                post.PostMedia.Remove(m);
            }

            if (!string.IsNullOrEmpty(request.GifUrl))
            {
                post.PostMedia.Add(new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "gif",
                    Url = request.GifUrl,
                    CreatedAt = DateTime.UtcNow
                });
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
            else if (!string.IsNullOrEmpty(request.PreUploadedVideoUrl))
            {
                post.PostMedia.Add(new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "video",
                    Url = request.PreUploadedVideoUrl,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // Handle New Images
            if (request.Images != null && request.Images.Any())
            {
                int currentMaxPos = post.PostMedia.Where(m => m.Position != null).Select(m => m.Position.Value).DefaultIfEmpty(-1).Max();
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
                        Position = currentMaxPos + 1 + i,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            // Update AltTexts for existing images
            if (request.AltTexts != null && request.ExistingMediaIdsToKeep != null)
            {
                 // Logic to map AltTexts to correct existing media would be complex without index alignment in request
                 // But typically the frontend should send them in order
                 var existingImages = post.PostMedia.Where(m => m.Type == "image").OrderBy(m => m.Position ?? 0).ToList();
                 for (int i = 0; i < existingImages.Count && i < request.AltTexts.Count; i++)
                 {
                     existingImages[i].AltText = request.AltTexts[i];
                 }
            }

            // --- Link Preview ---
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
                    post.LinkPreview.Url = request.LinkPreviewUrl;
                    post.LinkPreview.Title = request.LinkPreviewTitle;
                    post.LinkPreview.Description = request.LinkPreviewDescription;
                    post.LinkPreview.Image = request.LinkPreviewImage;
                    post.LinkPreview.Domain = domain;
                }
                else
                {
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
                _unitOfWork.LinkPreviews.Remove(post.LinkPreview);
                post.LinkPreview = null;
            }

            // Save basic DB changes
            try
            {
                await _unitOfWork.CompleteAsync();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                var sb = new StringBuilder();
                sb.AppendLine("CONCURRENCY ERROR DETAILS:");
                foreach (var entry in ex.Entries)
                {
                    var databaseValues = await entry.GetDatabaseValuesAsync();
                    if (databaseValues == null)
                    {
                        sb.AppendLine($"- {entry.Entity.GetType().Name} (ID: {entry.Property("Id").CurrentValue}): Deleted in DB");
                    }
                    else
                    {
                        sb.AppendLine($"- {entry.Entity.GetType().Name} (ID: {entry.Property("Id").CurrentValue}): Modified in DB. Current State: {entry.State}");
                    }
                }
                Console.WriteLine($"[UpdatePostAsync] Concurrency Error: {sb}");
                throw new Exception(sb.ToString(), ex);
            }
            catch (DbUpdateException ex)
            {
                var inner = ex.InnerException?.Message ?? "No inner exception";
                Console.WriteLine($"[UpdatePostAsync] DbUpdateException: {ex.Message}. Inner: {inner}");
                throw new Exception($"Database update failed: {ex.Message}. Inner: {inner}", ex);
            }

            // --- Phase 3: Repo Signing ---
            try
            {
                var author = await _unitOfWork.Users.GetByIdAsync(userId);
                if (author != null && !string.IsNullOrEmpty(author.Did))
                {
                    var postRecord = new Dictionary<string, object>
                    {
                        { "$type", "app.bsky.feed.post" },
                        { "text", post.Content ?? "" },
                        { "createdAt", post.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O") }
                    };
                    // Simplified: just text for now, full AT records would include facets/embeds
                    var cid = await _repoManager.CreateRecordAsync(author.Did, "app.bsky.feed.post", postRecord);
                    await _repoManager.SignRepoAsync(author.Did, cid);
                    Console.WriteLine($"[UpdatePostAsync] Repo updated and signed for User {userId}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[UpdatePostAsync] Phase 3 Error: {ex.Message}");
                // Don't fail the entire request if signing fails, but log it
            }

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
            if (postDto.Author.IsFollowing)
            {
                var followRecord = await _unitOfWork.Follows.GetAsync(viewerId.Value, postDto.Author.Id);
                if (followRecord != null)
                {
                    postDto.Author.FollowingReference = $"at://local/app.bsky.graph.follow/{followRecord.Tid}";
                }
            }

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

    public async Task<PostDto?> GetPostByTidAsync(string tid, Guid? viewerId = null)
    {
        var post = await _unitOfWork.Posts.Query()
            .FirstOrDefaultAsync(p => p.Tid == tid && (p.IsDeleted == false || p.IsDeleted == null));

        if (post == null) return null;

        return await GetPostByIdAsync(post.Id, viewerId);
    }


    public async Task<List<Guid>> DeletePostAsync(Guid userId, Guid postId)
    {
        var rootPost = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (rootPost == null || rootPost.AuthorId != userId)
            return new List<Guid>();

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
            await _postHubContext.Clients.All.SendAsync("PostDeleted", id);
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
            if (userId != post.AuthorId && await ShouldCreateNotificationAsync(post.AuthorId, "like"))
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

            // [NEW] Notification for "Likes of your reposts"
            var reposterIds = await _unitOfWork.Reposts.Query()
                .Where(r => r.PostId == postId && r.UserId != userId && r.UserId != post.AuthorId)
                .Select(r => r.UserId)
                .ToListAsync();

            foreach (var reposterId in reposterIds)
            {
                if (await ShouldCreateNotificationAsync(reposterId, "like_of_repost"))
                {
                    var notification = new Notification
                    {
                        Id = Guid.NewGuid(),
                        Tid = GenerateTid(),
                        Type = "like_of_repost",
                        SenderId = userId,
                        RecipientId = reposterId,
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
        }

        _unitOfWork.Posts.Update(post);
        await _unitOfWork.CompleteAsync();

        // Invalidate post cache
        await _cacheService.RemoveAsync($"post:{postId}");

        // Broadcast Real-time Updates
        var timestamp = DateTime.UtcNow;
        await _postHubContext.Clients.All.SendAsync("UpdatePostStats", new 
        { 
            postId, 
            likesCount = post.LikesCount,
            repostsCount = post.RepostsCount,
            bookmarksCount = post.BookmarksCount,
            repliesCount = post.RepliesCount,
            quotesCount = post.QuotesCount,
            timestamp
        });

        await _postHubContext.Clients.Group($"user-{userId}").SendAsync("UpdateUserPostStatus", new
        {
            postId,
            isLiked,
            isReposted = await _unitOfWork.Reposts.Query().AnyAsync(r => r.PostId == postId && r.UserId == userId),
            isBookmarked = await _unitOfWork.Bookmarks.Query().AnyAsync(b => b.PostId == postId && b.UserId == userId),
            timestamp
        });

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

        // Broadcast Real-time Updates
        var timestamp = DateTime.UtcNow;
        await _postHubContext.Clients.All.SendAsync("UpdatePostStats", new 
        { 
            postId, 
            likesCount = post.LikesCount,
            repostsCount = post.RepostsCount,
            bookmarksCount = post.BookmarksCount,
            repliesCount = post.RepliesCount,
            quotesCount = post.QuotesCount,
            timestamp
        });

        await _postHubContext.Clients.Group($"user-{userId}").SendAsync("UpdateUserPostStatus", new
        {
            postId,
            isBookmarked,
            isLiked = await _unitOfWork.Likes.Query().AnyAsync(l => l.PostId == postId && l.UserId == userId),
            isReposted = await _unitOfWork.Reposts.Query().AnyAsync(r => r.PostId == postId && r.UserId == userId),
            timestamp
        });

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
            if (userId != post.AuthorId && await ShouldCreateNotificationAsync(post.AuthorId, "repost"))
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

            // [NEW] Notification for "Reposts of your reposts"
            var reposterIds = await _unitOfWork.Reposts.Query()
                .Where(r => r.PostId == postId && r.UserId != userId && r.UserId != post.AuthorId)
                .Select(r => r.UserId)
                .ToListAsync();

            foreach (var reposterId in reposterIds)
            {
                if (await ShouldCreateNotificationAsync(reposterId, "repost_of_repost"))
                {
                    var notification = new Notification
                    {
                        Id = Guid.NewGuid(),
                        Tid = GenerateTid(),
                        Type = "repost_of_repost",
                        SenderId = userId,
                        RecipientId = reposterId,
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
        }

        _unitOfWork.Posts.Update(post);
        await _unitOfWork.CompleteAsync();

        // Invalidate caches
        await _cacheService.RemoveAsync($"post:{postId}");
        await _cacheService.RemoveAsync($"user:{userId}:timeline");

        // Broadcast Real-time Updates
        var timestamp = DateTime.UtcNow;
        await _postHubContext.Clients.All.SendAsync("UpdatePostStats", new 
        { 
            postId, 
            likesCount = post.LikesCount,
            repostsCount = post.RepostsCount,
            bookmarksCount = post.BookmarksCount,
            repliesCount = post.RepliesCount,
            quotesCount = post.QuotesCount,
            timestamp
        });

        await _postHubContext.Clients.Group($"user-{userId}").SendAsync("UpdateUserPostStatus", new
        {
            postId,
            isReposted,
            isLiked = await _unitOfWork.Likes.Query().AnyAsync(l => l.PostId == postId && l.UserId == userId),
            isBookmarked = await _unitOfWork.Bookmarks.Query().AnyAsync(b => b.PostId == postId && b.UserId == userId),
            timestamp
        });

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
            try
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
            catch (Exception ex)
            {
                System.Console.WriteLine($"[PostService] GetTrendingPostsAsync: Error fetching trending posts: {ex.Message}");
                postDtos = new List<PostDto>();
            }
        }

        if (viewerId.HasValue && postDtos.Any())
        {
            postDtos = await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
        }

        return postDtos;
    }

    public async Task<IEnumerable<PostDto>> GetTrendingPosts24hAsync(Guid? viewerId = null, int limit = 50, int skip = 0)
    {
        try
        {
            var posts = await _unitOfWork.Posts.GetTrendingPosts24hAsync(limit, skip);
            var postDtos = posts.Select(MapToDto).ToList();

            if (viewerId.HasValue)
            {
                postDtos = await EnrichAndFilterPostsAsync(postDtos, viewerId.Value);
            }

            return postDtos;
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] GetTrendingPosts24hAsync: Error: {ex.Message}");
            return new List<PostDto>();
        }
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
                        (p.Content != null && p.Content.ToLower().Contains(lowerQuery) || 
                         p.Hashtags.Any(h => h.Name != null && h.Name.ToLower().Contains(lowerQuery))))
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
            CreatedAt = post.CreatedAt.HasValue ? DateTime.SpecifyKind(post.CreatedAt.Value, DateTimeKind.Utc) : (DateTime?)null,
            Author = post.Author == null ? new AuthorDto { Id = post.AuthorId, Username = "unknown", Handle = "unknown" } : new AuthorDto
            {
                Id = post.Author.Id,
                Username = post.Author.Username,
                Handle = post.Author.Handle,
                DisplayName = post.Author.DisplayName,
                AvatarUrl = post.Author.AvatarUrl,
                IsFollowing = false, // Default
                IsVerified = post.Author.IsVerified,
                Did = post.Author.Did
            },
            ImageUrls = post.PostMedia.Where(m => m.Type == "image").Select(m => m.Url).ToList(),
            Media = post.PostMedia.OrderBy(m => m.Position ?? 0).Select(m => new MediaDto
            {
                Id = m.Id,
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
            Language = post.Language,
            IsDeleted = post.IsDeleted ?? false,
            QuotePostId = post.QuotePostId,
            QuotePost = (includeQuote && post.QuotePost != null) ? MapToDto(post.QuotePost, false, false) : null,
            ParentPost = (includeParent && post.ReplyToPost != null) ? MapToDto(post.ReplyToPost, false, false) : null,
            CanReply = true, // Default
            // AT-Protocol URI and synthetic CID
            Uri = !string.IsNullOrEmpty(post.Author?.Did) && !string.IsNullOrEmpty(post.Tid)
                ? $"at://{post.Author.Did}/app.bsky.feed.post/{post.Tid}"
                : $"at://local/app.bsky.feed.post/{post.Id}",
            Cid = post.Id.ToString()
        };
    }

    public string GenerateTid()
    {
        return ProtocolUtils.GenerateTid();
    }

    private async Task<bool> IsUserMentionedAsync(Post post, Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        return await IsUserMentionedAsync(post.Content, user?.Handle);
    }

    private Task<bool> IsUserMentionedAsync(string? content, string? handle)
    {
        if (string.IsNullOrEmpty(handle) || string.IsNullOrEmpty(content)) return Task.FromResult(false);

        var lowerContent = content.ToLower();
        var lowerHandle = handle.ToLower();

        bool isMentioned = Regex.IsMatch(lowerContent, $@"\B@{Regex.Escape(lowerHandle)}\b", RegexOptions.IgnoreCase);
        if (!isMentioned && lowerHandle.Contains("."))
        {
            var prefix = lowerHandle.Split('.')[0];
            isMentioned = Regex.IsMatch(lowerContent, $@"\B@{Regex.Escape(lowerHandle.Split('.')[0])}\b", RegexOptions.IgnoreCase);
        }
        return Task.FromResult(isMentioned);
    }

        public async Task<string> SaveBlobAsync(Stream stream, string contentType, string folder)
        {
            var extension = contentType switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/webp" => ".webp",
                "video/mp4" => ".mp4",
                _ => ".bin"
            };

            var uploadsRoot = Path.Combine(_environment.WebRootPath, "uploads", folder);
            if (!Directory.Exists(uploadsRoot)) Directory.CreateDirectory(uploadsRoot);

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsRoot, fileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await stream.CopyToAsync(fileStream);
            }

            return $"/uploads/{folder}/{fileName}";
        }

        private async Task<string> SaveFileAsync(IFormFile file, string folder)
        {
            using var stream = file.OpenReadStream();
            return await SaveBlobAsync(stream, file.ContentType, folder);
        }

    private async Task<bool> ShouldCreateNotificationAsync(Guid userId, string type)
    {
        try
        {
            var settings = await _unitOfWork.UserSettings.Query()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null) return true;

            return type switch
            {
                "like" => (settings.NotifyLikes ?? true) && (settings.InAppNotifyLikes ?? true),
                "repost" => (settings.NotifyReposts ?? true) && (settings.InAppNotifyReposts ?? true),
                "reply" => (settings.NotifyReplies ?? true) && (settings.InAppNotifyReplies ?? true),
                "mention" => (settings.NotifyMentions ?? true) && (settings.InAppNotifyMentions ?? true),
                "quote" => (settings.NotifyQuotes ?? true) && (settings.InAppNotifyQuotes ?? true),
                "follow" => (settings.NotifyFollowers ?? true) && (settings.InAppNotifyFollowers ?? true),
                "activity" => (settings.NotifyActivity ?? true) && (settings.InAppNotifyActivity ?? true),
                "like_of_repost" => (settings.NotifyLikesOfReposts ?? true) && (settings.InAppNotifyLikesOfReposts ?? true),
                "repost_of_repost" => (settings.NotifyRepostsOfReposts ?? true) && (settings.InAppNotifyRepostsOfReposts ?? true),
                "others" => (settings.NotifyOthers ?? true) && (settings.InAppNotifyOthers ?? true),
                _ => (settings.NotifyOthers ?? true) && (settings.InAppNotifyOthers ?? true)
            };
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] ShouldCreateNotificationAsync: Error fetching UserSettings for {userId}: {ex.Message}. Returning true by default.");
            return true;
        }
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
                $"at://local/app.bsky.notification.event/{savedNotification.Tid}",
                "pseudo-cid-" + savedNotification.Id,
                savedNotification.Type ?? "like",
                savedNotification.Type ?? "like",
                null,
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
                    savedNotification.Sender.PostsCount,
                    savedNotification.Sender.Role,
                    null,
                    savedNotification.Sender.IsVerified,
                    savedNotification.Sender.Did
                ),
                savedNotification.PostId?.ToString(),
                savedNotification.Post?.Author?.Handle,
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
        List<string> userInterests = new();
        try
        {
            var userSettings = await _unitOfWork.Users.Query()
                .Where(u => u.Id == userId)
                .Select(u => u.UserSetting)
                .FirstOrDefaultAsync();

            if (userSettings?.SelectedInterests != null)
            {
                userInterests = System.Text.Json.JsonSerializer.Deserialize<List<string>>(userSettings.SelectedInterests) ?? new();
            }
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] GetDiscoverPostsAsync: Error fetching UserSettings for {userId}: {ex.Message}");
        }

        // Fallback: If no interests, just show trending
        if (!userInterests.Any())
        {
            return await GetTrendingPosts24hAsync(userId, limit, skip);
        }

        var mutedAccounts = await _unitOfWork.Mutes.GetMutedAccountsAsync(userId);
        var mutedUserIds = mutedAccounts.Select(m => m.MutedUserId).ToList();

        var blockedUserIds = await _unitOfWork.Blocks.GetBlockedUserIdsAsync(userId);
        var blockedByUserIds = await _unitOfWork.Blocks.Query()
            .Where(b => b.BlockedUserId == userId)
            .Select(b => b.UserId)
            .ToListAsync();

        // 2. Fetch a pool of recent posts (expand search window if they have interests)
        var poolCutoff = DateTime.UtcNow.AddDays(-7); // Expand to 7 days to find more interest matches
        List<Post> postPool;
        try
        {
            postPool = await _unitOfWork.Posts.Query()
                .Where(p => p.CreatedAt >= poolCutoff && (p.IsDeleted == false || p.IsDeleted == null) && p.ReplyToPostId == null)
                .Where(p => p.AuthorId != userId) // EXCLUDE USER'S OWN POSTS FROM DISCOVER
                .Where(p =>
                    !mutedUserIds.Contains(p.AuthorId) &&
                    !blockedUserIds.Contains(p.AuthorId) &&
                    !blockedByUserIds.Contains(p.AuthorId))
                .Include(p => p.Author)
                .Include(p => p.PostMedia)
                .Include(p => p.LinkPreview)
                .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                .OrderByDescending(p => (p.LikesCount ?? 0) + (p.RepostsCount ?? 0))
                .Take(5000) // Increase pool size to 5000 to ensure we find matching topics
                .ToListAsync();
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] GetDiscoverPostsAsync: Error fetching post pool: {ex.Message}");
            return await GetTrendingPosts24hAsync(userId, limit, skip);
        }

        // 3. Score and rank posts
        var scoredPosts = new List<(Post Post, float Score)>();
        var random = new Random();

        foreach (var post in postPool)
        {
            float score = 0;

            // AI Categorization Score
            var imageUrls = post.PostMedia?.Where(m => m.Type == "image" && !string.IsNullOrEmpty(m.Url))
                                      .Select(m => m.Url!)
                                      .ToList();
            
            var categoryScores = await _categorizationService.ScorePostForDiscoverAsync(post.Content ?? "", imageUrls);
            
            // Boost score heavily based on matches with user interests
            bool matchedInterest = false;
            foreach (var interest in userInterests)
            {
                if (categoryScores.TryGetValue(interest, out var confidence))
                {
                    // Massively boost so it always outranks non-interest trending posts
                    score += confidence * 1000.0f; 
                    matchedInterest = true;
                }
            }

            // Engagement Score (scaled)
            // Even if it matches an interest, higher engagement within that interest wins
            score += ((post.LikesCount ?? 0) * 1.0f) + ((post.RepostsCount ?? 0) * 2.0f);

            // Recency Score (decay)
            var hoursOld = (DateTime.UtcNow - (post.CreatedAt ?? DateTime.UtcNow)).TotalHours;
            var recencyFactor = (float)Math.Exp(-hoursOld / 48.0); // 48h half-life for Discover to include broader matches
            score *= recencyFactor;

            // Add a small random factor to provide variety (the "variable of trending/new" effect)
            var varietyBoost = (float)random.NextDouble() * 10.0f; // 0 to 10 points
            score += varietyBoost;

            // Include either interest matches, or highly engaging trending posts, or fresh posts
            if (matchedInterest || score > 5.0f || hoursOld < 2.0)
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

    public async Task<PostDto?> UpdateInteractionSettingsAsync(Guid userId, Guid postId, UpdateInteractionSettingsRequest request)
    {
        var post = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .FirstOrDefaultAsync(p => p.Id == postId);

        if (post == null || post.AuthorId != userId) return null;

        if (request.ReplyRestriction != null)
        {
            post.ReplyRestriction = request.ReplyRestriction;
        }

        if (request.AllowQuotes != null)
        {
            post.AllowQuotes = request.AllowQuotes.Value;
        }

        _unitOfWork.Posts.Update(post);
        await _unitOfWork.CompleteAsync();

        var dto = MapToDto(post);
        var enriched = await EnrichAndFilterPostsAsync(new List<PostDto> { dto }, userId);
        return enriched.FirstOrDefault();
    }
}
