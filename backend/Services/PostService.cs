using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using BSkyClone.Hubs;
using System.Text.RegularExpressions;
using System.Text;
using BSkyClone.Utilities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Caching.Distributed;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

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
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly ILabelingService _labelingService;
    private readonly IUserService _userService;
    private readonly ILogger<PostService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly string _localDomain;
    private readonly Microsoft.Extensions.Caching.Distributed.IDistributedCache _distributedCache;

    public PostService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, IHubContext<ChatHub> hubContext, IHubContext<PostHub> postHubContext, ILinkService linkService, ICacheService cacheService, ICategorizationService categorizationService, ISearchService searchService, IRepoManager repoManager, IXrpcProxyService xrpcProxy, ILabelingService labelingService, IUserService userService, ILogger<PostService> logger, IServiceScopeFactory scopeFactory, IConfiguration configuration, Microsoft.Extensions.Caching.Distributed.IDistributedCache distributedCache)
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
        _xrpcProxy = xrpcProxy;
        _labelingService = labelingService;
        _userService = userService;
        _logger = logger;
        _scopeFactory = scopeFactory;
        _localDomain = configuration["DomainName"] ?? "bskyclone.site";
        _distributedCache = distributedCache;
    }

    public async Task<IEnumerable<PostDto>> GetTimelineAsync(Guid userId, int skip = 0, int take = 20)
    {
        try
        {
            var cacheKey = $"BlueskyTimeline_{userId}";
            var cachedJson = await _distributedCache.GetStringAsync(cacheKey);
            List<PostDto>? mappedPosts = null;

            if (!string.IsNullOrEmpty(cachedJson))
            {
                try { mappedPosts = System.Text.Json.JsonSerializer.Deserialize<List<PostDto>>(cachedJson); } catch { }
            }

            if (mappedPosts == null)
            {
                var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
                if (string.IsNullOrEmpty(token))
                {
                    _logger.LogWarning("[GetTimelineAsync] No proxy token for user {UserId}.", userId);
                    return new List<PostDto>();
                }

                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

                var response = await httpClient.GetAsync("https://bsky.social/xrpc/app.bsky.feed.getTimeline?limit=100");
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("[GetTimelineAsync] Bluesky proxy failed: {Res}", await response.Content.ReadAsStringAsync());
                    return new List<PostDto>();
                }

                var responseBody = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(
                    await response.Content.ReadAsStreamAsync());

                mappedPosts = new List<PostDto>();
                if (responseBody.TryGetProperty("feed", out var feedArray))
                    mappedPosts = MapBlueskyFeed(feedArray);

                await _distributedCache.SetStringAsync(cacheKey,
                    System.Text.Json.JsonSerializer.Serialize(mappedPosts),
                    new Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions
                    { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) });
            }

            return mappedPosts.Skip(skip).Take(take);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GetTimelineAsync] Critical Error for user {UserId}", userId);
            return new List<PostDto>();
        }
    }

    public async Task<IEnumerable<PostDto>> GetUserPostsAsync(string handleOrDid, Guid? viewerId, int skip = 0, int take = 20, string? type = null)
    {
        try
        {
            var cacheKey = $"BlueskyAuthorFeed_{handleOrDid}_{type}";
            var cachedJson = await _distributedCache.GetStringAsync(cacheKey);
            List<PostDto>? mappedPosts = null;

            if (!string.IsNullOrEmpty(cachedJson))
            {
                try { mappedPosts = System.Text.Json.JsonSerializer.Deserialize<List<PostDto>>(cachedJson); } catch {}
            }

            if (mappedPosts == null)
            {
                using var httpClient = new HttpClient();
                
                // If we have a viewer, try to attach their token for personalized views (e.g. following state)
                if (viewerId.HasValue)
                {
                    var token = await _distributedCache.GetStringAsync($"BlueskyToken_{viewerId.Value}");
                    if (!string.IsNullOrEmpty(token))
                        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                }
                
                var filter = type == "replies" ? "posts_with_replies" : type == "media" ? "posts_with_media" : "posts_no_replies";
                var response = await httpClient.GetAsync($"https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor={handleOrDid}&limit=100&filter={filter}");
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[GetUserPostsAsync] fetch failed: {Res}", await response.Content.ReadAsStringAsync());
                    return new List<PostDto>();
                }

                var responseBody = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(await response.Content.ReadAsStreamAsync());
                mappedPosts = new List<PostDto>();

                if (responseBody.TryGetProperty("feed", out var feedArray))
                {
                    mappedPosts = MapBlueskyFeed(feedArray);
                }

                await _distributedCache.SetStringAsync(cacheKey, System.Text.Json.JsonSerializer.Serialize(mappedPosts), new Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2) });
            }

            return mappedPosts.Skip(skip).Take(take);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GetUserPostsAsync] Error proxying author feed for {Handle}", handleOrDid);
            return new List<PostDto>();
        }
    }

    private List<PostDto> MapBlueskyFeed(System.Text.Json.JsonElement feedArray)
    {
        var mappedPosts = new List<PostDto>();
        foreach (var item in feedArray.EnumerateArray())
        {
            try
            {
                if (!item.TryGetProperty("post", out var postObj)) continue;
                
                var authorObj = postObj.GetProperty("author");
                var recordObj = postObj.GetProperty("record");

                var authorDto = new AuthorDto
                {
                    Id = Guid.NewGuid(), // Fake ID for UI
                    Did = authorObj.GetProperty("did").GetString(),
                    Handle = authorObj.GetProperty("handle").GetString()!,
                    DisplayName = authorObj.TryGetProperty("displayName", out var dn) ? dn.GetString() : null,
                    AvatarUrl = authorObj.TryGetProperty("avatar", out var av) ? av.GetString() : null,
                    IsVerified = false
                };

                var likeCount = postObj.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0;
                var repostCount = postObj.TryGetProperty("repostCount", out var rc) ? rc.GetInt32() : 0;
                var replyCount = postObj.TryGetProperty("replyCount", out var rpc) ? rpc.GetInt32() : 0;
                
                var isLiked = false;
                var isReposted = false;
                if (postObj.TryGetProperty("viewer", out var viewer))
                {
                    if (viewer.TryGetProperty("like", out var vl)) isLiked = vl.ValueKind != System.Text.Json.JsonValueKind.Null;
                    if (viewer.TryGetProperty("repost", out var vr)) isReposted = vr.ValueKind != System.Text.Json.JsonValueKind.Null;
                }

                var text = recordObj.TryGetProperty("text", out var t) ? t.GetString() : "";
                var createdAtStr = recordObj.TryGetProperty("createdAt", out var ca) ? ca.GetString() : null;
                DateTime.TryParse(createdAtStr, out var createdAt);

                var imageUrls = new List<string>();
                if (postObj.TryGetProperty("embed", out var postEmbed))
                {
                    if (postEmbed.TryGetProperty("images", out var pImages))
                    {
                        foreach(var pImg in pImages.EnumerateArray())
                        {
                            if (pImg.TryGetProperty("fullsize", out var fz) && fz.ValueKind != System.Text.Json.JsonValueKind.Null)
                                imageUrls.Add(fz.GetString()!);
                        }
                    }
                }

                var uri = postObj.GetProperty("uri").GetString();
                var cid = postObj.GetProperty("cid").GetString();
                var tid = uri?.Split('/').Last() ?? Guid.NewGuid().ToString();

                AuthorDto? repostedBy = null;
                if (item.TryGetProperty("reason", out var reasonObj) && reasonObj.ValueKind != System.Text.Json.JsonValueKind.Null)
                {
                    if (reasonObj.TryGetProperty("$type", out var typeOut) && typeOut.GetString() == "app.bsky.feed.defs#reasonRepost")
                    {
                         if (reasonObj.TryGetProperty("by", out var byObj))
                         {
                             repostedBy = new AuthorDto
                             {
                                 Id = Guid.NewGuid(),
                                 Did = byObj.GetProperty("did").GetString(),
                                 Handle = byObj.GetProperty("handle").GetString()!,
                                 DisplayName = byObj.TryGetProperty("displayName", out var rdn) ? rdn.GetString() : null,
                                 AvatarUrl = byObj.TryGetProperty("avatar", out var rav) ? rav.GetString() : null
                             };
                         }
                    }
                }

                var postDto = new PostDto
                {
                    Id = Guid.NewGuid(), // Fake ID
                    Tid = tid,
                    Uri = uri,
                    Cid = cid,
                    Content = text,
                    CreatedAt = createdAt,
                    Author = authorDto,
                    LikesCount = likeCount,
                    RepostsCount = repostCount,
                    RepliesCount = replyCount,
                    IsLiked = isLiked,
                    IsReposted = isReposted,
                    ImageUrls = imageUrls,
                    RepostedBy = repostedBy
                };
                mappedPosts.Add(postDto);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to map post item: {Err}", ex.Message);
            }
        }
        return mappedPosts;
    }

    public async Task<List<PostDto>> EnrichAndFilterPostsAsync(List<PostDto> posts, Guid viewerId, bool isTimeline = false)
    {
        try
        {
            if (!posts.Any()) 
            {
                return posts;
            }

            var postIds = posts.Select(p => p.Id).ToList();

            // Batch fetch remote interactions from AppView
            var remoteUris = new HashSet<string>();
            foreach (var p in posts)
            {
                if (!string.IsNullOrEmpty(p.Uri) && !p.Uri.Contains(_localDomain))
                    remoteUris.Add(p.Uri);
                if (p.ParentPost != null && !string.IsNullOrEmpty(p.ParentPost.Uri) && !p.ParentPost.Uri.Contains(_localDomain))
                    remoteUris.Add(p.ParentPost.Uri);
                if (p.QuotePost != null && !string.IsNullOrEmpty(p.QuotePost.Uri) && !p.QuotePost.Uri.Contains(_localDomain))
                    remoteUris.Add(p.QuotePost.Uri);
            }
            var remoteUrisList = remoteUris.ToList();

            var remoteInteractionCache = new Dictionary<string, JsonElement>();
            
            if (remoteUrisList.Any())
            {
                try
                {
                    using var client = new HttpClient();
                    // Split into chunks if there are too many (limit is 25)
                    foreach (var chunk in remoteUrisList.Chunk(25))
                    {
                        var query = string.Join("&", chunk.Select(u => $"uris={Uri.EscapeDataString(u)}"));
                        var response = await client.GetAsync($"https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?{query}");
                        if (response.IsSuccessStatusCode)
                        {
                            var json = await response.Content.ReadAsStringAsync();
                            using var doc = JsonDocument.Parse(json);
                            if (doc.RootElement.TryGetProperty("posts", out var remotePostsList))
                            {
                                foreach (var rp in remotePostsList.EnumerateArray())
                                {
                                    if (rp.TryGetProperty("uri", out var uriProp))
                                    {
                                        var uri = uriProp.GetString();
                                        if (uri != null)
                                        {
                                            remoteInteractionCache[uri] = rp.Clone(); // Clone to preserve it outside the JsonDocument scope
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to fetch remote counts for timeline posts");
                }
            }

            var usersFollowingViewerIds = new List<Guid>();
            try { usersFollowingViewerIds = await _unitOfWork.Follows.Query().Where(f => f.FollowingId == viewerId).Select(f => f.FollowerId).ToListAsync(); } catch { }

            // Fetch interaction URIs for viewer context
            var likedPostUris = new Dictionary<Guid, string>();
            try { likedPostUris = await _unitOfWork.Likes.Query().Where(l => l.UserId == viewerId && postIds.Contains(l.PostId)).ToDictionaryAsync(l => l.PostId, l => l.Uri ?? ""); } catch { }

            var repostPostUris = new Dictionary<Guid, string>();
            try { repostPostUris = await _unitOfWork.Reposts.Query().Where(r => r.UserId == viewerId && postIds.Contains(r.PostId)).ToDictionaryAsync(r => r.PostId, r => r.Uri ?? ""); } catch { }

            var followingUris = new Dictionary<Guid, string>();
            try { followingUris = await _unitOfWork.Follows.Query().Where(f => f.FollowerId == viewerId).ToDictionaryAsync(f => f.FollowingId, f => f.Uri ?? ""); } catch { }

            var mutedWords = new List<MutedWord>();
            try { mutedWords = await _unitOfWork.MutedWords.Query().Where(w => w.UserId == viewerId).ToListAsync(); } catch { }

            var mutedUserIds = new List<Guid>();
            try { var mutedAccounts = await _unitOfWork.Mutes.GetMutedAccountsAsync(viewerId); mutedUserIds = mutedAccounts.Select(m => m.MutedUserId).ToList(); } catch { }

            var blockedUserIds = new List<Guid>();
            try { blockedUserIds = await _unitOfWork.Blocks.GetBlockedUserIdsAsync(viewerId); } catch { }

            var blockedByUserIds = new List<Guid>();
            try { blockedByUserIds = await _unitOfWork.Blocks.Query().Where(b => b.BlockedUserId == viewerId).Select(b => b.UserId).ToListAsync(); } catch { }

            var bookmarkedPostIds = new List<Guid>();
            try { bookmarkedPostIds = await _unitOfWork.Bookmarks.Query().Where(b => b.UserId == viewerId && postIds.Contains(b.PostId)).Select(b => b.PostId).ToListAsync(); } catch { }

            var blockingUris = new Dictionary<Guid, string>();
            try { blockingUris = await _unitOfWork.Blocks.Query().Where(b => b.UserId == viewerId).ToDictionaryAsync(b => b.BlockedUserId, b => $"at://local/app.bsky.graph.block/{b.BlockedUserId}"); } catch { }

            var viewerUser = await _unitOfWork.Users.GetByIdAsync(viewerId);
            var viewerHandle = viewerUser?.Handle?.ToLower();

            // Batch fetch local interaction counts to avoid N+1 queries later in the loop
            var localLikesCounts = await _unitOfWork.Likes.Query()
                .Where(l => postIds.Contains(l.PostId))
                .GroupBy(l => l.PostId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            var localRepostsCounts = await _unitOfWork.Reposts.Query()
                .Where(r => postIds.Contains(r.PostId))
                .GroupBy(r => r.PostId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            var localBookmarksCounts = await _unitOfWork.Bookmarks.Query()
                .Where(b => postIds.Contains(b.PostId))
                .GroupBy(b => b.PostId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count);

            var localRepliesCounts = await _unitOfWork.Posts.Query()
                .Where(p => p.ReplyToPostId != null && postIds.Contains(p.ReplyToPostId.Value))
                .GroupBy(p => p.ReplyToPostId)
                .Select(g => new { Id = g.Key!.Value, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

            var localQuotesCounts = await _unitOfWork.Posts.Query()
                .Where(p => p.QuotePostId != null && postIds.Contains(p.QuotePostId.Value))
                .GroupBy(p => p.QuotePostId)
                .Select(g => new { Id = g.Key!.Value, Count = g.Count() })
                .ToDictionaryAsync(x => x.Id, x => x.Count);

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

            _logger.LogInformation("[PostService] EnrichAndFilterPostsAsync: Input Count={InputCount}, ViewerId={ViewerId}, IsTimeline={IsTimeline}", posts.Count, viewerId, isTimeline);
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
                    _logger.LogWarning("[PostService] EnrichAndFilterPostsAsync: Filtering out Post {PostId} - Deleted: {IsDeleted}, AuthorNull: {AuthorNull}, Muted: {Muted}, Blocked: {Blocked}", 
                        post.Id, post.IsDeleted, post.Author == null, 
                        post.Author != null && mutedUserIds.Contains(post.Author.Id), 
                        post.Author != null && (blockedUserIds.Contains(post.Author.Id) || blockedByUserIds.Contains(post.Author.Id)));
                    continue;
                }

                // Phase 35: On-demand profile resolution for stub authors
                // For small batches (typical for single post views or small threads), resolve synchronously
                // to ensure the user sees full profile data immediately and has a valid local GUID for interactions.
                bool shouldResolveSync = posts.Count <= 15;

                if (post.Author != null && (post.Author.Did == post.Author.Handle || post.Author.Id == Guid.Empty))
                {
                    if (shouldResolveSync && !string.IsNullOrEmpty(post.Author.Did))
                    {
                        try 
                        { 
                            using var scope = _scopeFactory.CreateScope(); 
                            var resolvedUser = await scope.ServiceProvider.GetRequiredService<IUserService>().ResolveRemoteProfileAsync(post.Author.Did); 
                            if (resolvedUser != null)
                            {
                                post.Author.Id = resolvedUser.Id;
                                post.Author.Handle = resolvedUser.Handle;
                                post.Author.DisplayName = resolvedUser.DisplayName;
                                post.Author.AvatarUrl = resolvedUser.AvatarUrl;
                            }
                        } 
                        catch { }
                    }
                    else if (!string.IsNullOrEmpty(post.Author.Did))
                    {
                        _ = Task.Run(async () => { try { using var scope = _scopeFactory.CreateScope(); await scope.ServiceProvider.GetRequiredService<IUserService>().ResolveRemoteProfileAsync(post.Author.Did!); } catch { } });
                    }
                }

                if (post.Author != null)
                {
                    post.Author.Viewer = new AuthorViewerDto
                    {
                        Muted = mutedUserIds.Contains(post.Author.Id),
                        BlockedBy = blockedByUserIds.Contains(post.Author.Id),
                        Blocking = blockingUris.TryGetValue(post.Author.Id, out var bUri) ? bUri : null,
                        Following = followingUris.TryGetValue(post.Author.Id, out var fUri) ? fUri : null
                    };
                    post.Author.IsFollowing = post.Author.Viewer.Following != null;
                    post.Author.FollowingReference = post.Author.Viewer.Following;
                }

                post.Viewer = new PostViewerDto
                {
                    Like = likedPostUris.TryGetValue(post.Id, out var lUri) ? lUri : post.Viewer?.Like,
                    Repost = repostPostUris.TryGetValue(post.Id, out var rUri) ? rUri : post.Viewer?.Repost
                };

                // Unified Count Merging: Ensure local actuals take precedence or augment remote data
                localLikesCounts.TryGetValue(post.Id, out var localLikes);
                localRepostsCounts.TryGetValue(post.Id, out var localReposts);
                localBookmarksCounts.TryGetValue(post.Id, out var localBookmarks);
                localRepliesCounts.TryGetValue(post.Id, out var localReplies);
                localQuotesCounts.TryGetValue(post.Id, out var localQuotes);

                bool isRemote = !string.IsNullOrEmpty(post.Uri) && !post.Uri.Contains(_localDomain); 
                if (isRemote)
                {
                    if (post.Uri != null && remoteInteractionCache.TryGetValue(post.Uri, out var remotePost))
                    {
                        if (remotePost.TryGetProperty("likeCount", out var lc)) post.LikesCount = Math.Max(lc.GetInt32(), localLikes);
                        else post.LikesCount = Math.Max(post.LikesCount, localLikes);

                        if (remotePost.TryGetProperty("repostCount", out var rc)) post.RepostsCount = Math.Max(rc.GetInt32(), localReposts);
                        else post.RepostsCount = Math.Max(post.RepostsCount, localReposts);

                        if (remotePost.TryGetProperty("replyCount", out var rpc)) post.RepliesCount = Math.Max(rpc.GetInt32(), localReplies);
                        else post.RepliesCount = Math.Max(post.RepliesCount, localReplies);

                        if (remotePost.TryGetProperty("quoteCount", out var qc)) post.QuotesCount = Math.Max(qc.GetInt32(), localQuotes);
                        else post.QuotesCount = Math.Max(post.QuotesCount, localQuotes);

                        post.BookmarksCount = localBookmarks;

                        // Map Media
                        if (remotePost.TryGetProperty("embed", out var embed))
                        {
                            MapEmbedToDto(post, embed);
                        }
                    }
                    else
                    {
                        post.LikesCount = Math.Max(post.LikesCount, localLikes);
                        post.RepostsCount = Math.Max(post.RepostsCount, localReposts);
                        post.RepliesCount = Math.Max(post.RepliesCount, localReplies);
                        post.QuotesCount = Math.Max(post.QuotesCount, localQuotes);
                        post.BookmarksCount = Math.Max(post.BookmarksCount, localBookmarks);
                    }
                }
                else 
                {
                    post.LikesCount = localLikes;
                    post.RepostsCount = localReposts;
                    post.RepliesCount = localReplies;
                    post.QuotesCount = localQuotes;
                    post.BookmarksCount = localBookmarks;
                }

                if (post.ParentPost != null)
                {
                    bool isRemoteParent = !string.IsNullOrEmpty(post.ParentPost.Uri) && !post.ParentPost.Uri.Contains(_localDomain);
                    if (isRemoteParent && remoteInteractionCache.TryGetValue(post.ParentPost.Uri, out var remoteParent))
                    {
                        if (remoteParent.TryGetProperty("likeCount", out var lc)) post.ParentPost.LikesCount = lc.GetInt32();
                        if (remoteParent.TryGetProperty("repostCount", out var rc)) post.ParentPost.RepostsCount = rc.GetInt32();
                        if (remoteParent.TryGetProperty("replyCount", out var rpc)) post.ParentPost.RepliesCount = rpc.GetInt32();
                        if (remoteParent.TryGetProperty("quoteCount", out var qc)) post.ParentPost.QuotesCount = qc.GetInt32();
                        
                        if (remoteParent.TryGetProperty("record", out var rec))
                        {
                            if (rec.TryGetProperty("text", out var txt)) post.ParentPost.Content = txt.GetString();
                            if (rec.TryGetProperty("createdAt", out var cat)) 
                            { 
                                if (DateTime.TryParse(cat.GetString(), out var dt)) post.ParentPost.CreatedAt = dt; 
                            }
                        }

                        if (remoteParent.TryGetProperty("embed", out var embed)) MapEmbedToDto(post.ParentPost, embed);

                        // Also hydrate parent's author if missing metadata can be inferred (rudimentary fallback if ResolveRemoteProfile isn't fast enough)
                        if (remoteParent.TryGetProperty("author", out var remAuth) && post.ParentPost.Author != null)
                        {
                            if (remAuth.TryGetProperty("displayName", out var dn)) post.ParentPost.Author.DisplayName = dn.GetString();
                            if (remAuth.TryGetProperty("avatar", out var av)) post.ParentPost.Author.AvatarUrl = av.GetString();
                            if (remAuth.TryGetProperty("handle", out var hndl)) 
                            {
                                post.ParentPost.Author.Handle = hndl.GetString();
                                post.ReplyToHandle = post.ParentPost.Author.Handle; // Sync to child
                            }
                        }
                    }
                }

                if (post.QuotePost != null)
                {
                    bool isRemoteQuote = !string.IsNullOrEmpty(post.QuotePost.Uri) && !post.QuotePost.Uri.Contains(_localDomain);
                    if (isRemoteQuote && remoteInteractionCache.TryGetValue(post.QuotePost.Uri, out var remoteQuote))
                    {
                        if (remoteQuote.TryGetProperty("likeCount", out var lc)) post.QuotePost.LikesCount = lc.GetInt32();
                        if (remoteQuote.TryGetProperty("repostCount", out var rc)) post.QuotePost.RepostsCount = rc.GetInt32();
                        if (remoteQuote.TryGetProperty("replyCount", out var rpc)) post.QuotePost.RepliesCount = rpc.GetInt32();
                        if (remoteQuote.TryGetProperty("quoteCount", out var qc)) post.QuotePost.QuotesCount = qc.GetInt32();
                        
                        if (remoteQuote.TryGetProperty("record", out var rec))
                        {
                            if (rec.TryGetProperty("text", out var txt)) post.QuotePost.Content = txt.GetString();
                            if (rec.TryGetProperty("createdAt", out var cat)) 
                            { 
                                if (DateTime.TryParse(cat.GetString(), out var dt)) post.QuotePost.CreatedAt = dt; 
                            }
                        }

                        if (remoteQuote.TryGetProperty("embed", out var embed)) MapEmbedToDto(post.QuotePost, embed);

                        if (remoteQuote.TryGetProperty("author", out var remAuth) && post.QuotePost.Author != null)
                        {
                            if (remAuth.TryGetProperty("displayName", out var dn)) post.QuotePost.Author.DisplayName = dn.GetString();
                            if (remAuth.TryGetProperty("avatar", out var av)) post.QuotePost.Author.AvatarUrl = av.GetString();
                            if (remAuth.TryGetProperty("handle", out var hndl)) post.QuotePost.Author.Handle = hndl.GetString();
                        }
                    }
                }

                if (post.QuotePost?.Author != null && (post.QuotePost.Author.Did == post.QuotePost.Author.Handle || post.QuotePost.Author.Id == Guid.Empty))
                {
                    if (shouldResolveSync && !string.IsNullOrEmpty(post.QuotePost.Author.Did))
                    {
                        try { using var scope = _scopeFactory.CreateScope(); await scope.ServiceProvider.GetRequiredService<IUserService>().ResolveRemoteProfileAsync(post.QuotePost.Author.Did!); } catch { }
                    }
                    else if (!string.IsNullOrEmpty(post.QuotePost.Author.Did))
                    {
                        _ = Task.Run(async () => { try { using var scope = _scopeFactory.CreateScope(); await scope.ServiceProvider.GetRequiredService<IUserService>().ResolveRemoteProfileAsync(post.QuotePost.Author.Did!); } catch { } });
                    }
                }
                if (post.ParentPost?.Author != null && (post.ParentPost.Author.Did == post.ParentPost.Author.Handle || post.ParentPost.Author.Id == Guid.Empty))
                {
                    if (shouldResolveSync && !string.IsNullOrEmpty(post.ParentPost.Author.Did))
                    {
                        try { using var scope = _scopeFactory.CreateScope(); await scope.ServiceProvider.GetRequiredService<IUserService>().ResolveRemoteProfileAsync(post.ParentPost.Author.Did!); } catch { }
                    }
                    else if (!string.IsNullOrEmpty(post.ParentPost.Author.Did))
                    {
                        _ = Task.Run(async () => { try { using var scope = _scopeFactory.CreateScope(); await scope.ServiceProvider.GetRequiredService<IUserService>().ResolveRemoteProfileAsync(post.ParentPost.Author.Did!); } catch { } });
                    }
                }

                post.IsLiked = post.Viewer.Like != null;
                post.IsBookmarked = post.Id != Guid.Empty && bookmarkedPostIds.Contains(post.Id);
                post.IsReposted = post.Viewer.Repost != null;

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

            _logger.LogInformation("[PostService] EnrichAndFilterPostsAsync: Output Count={OutputCount}", filteredPosts.Count);
            return filteredPosts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PostService] EnrichAndFilterPostsAsync Error: {Message}", ex.Message);
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
            var author = await _unitOfWork.Users.GetByIdAsync(userId);
            var tid = GenerateTid();
            var uriStr = author != null ? $"at://{author.Did}/app.bsky.feed.post/{tid}" : null;

            Guid? replyToPostId = Guid.TryParse(request.ReplyToPostId, out var rpid) ? rpid : null;
            if (replyToPostId == Guid.Empty) replyToPostId = null;
            if (replyToPostId == null && !string.IsNullOrEmpty(request.ReplyToPostId))
            {
                 var rp = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Tid == request.ReplyToPostId || p.Uri == request.ReplyToPostId);
                 if (rp != null) replyToPostId = rp.Id;
                 else if (request.ReplyToPostId.StartsWith("at://"))
                 {
                     var ingested = await IngestRemotePostAsync(request.ReplyToPostId);
                     if (ingested != null) replyToPostId = ingested.Id;
                 }
            }

            Guid? rootPostId = Guid.TryParse(request.RootPostId, out var rootid) ? rootid : null;
            if (rootPostId == Guid.Empty) rootPostId = null;
            if (rootPostId == null && !string.IsNullOrEmpty(request.RootPostId))
            {
                 var rp = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Tid == request.RootPostId || p.Uri == request.RootPostId);
                 if (rp != null) rootPostId = rp.Id;
                 else if (request.RootPostId.StartsWith("at://"))
                 {
                     var ingested = await IngestRemotePostAsync(request.RootPostId);
                     if (ingested != null) rootPostId = ingested.Id;
                 }
            }

            Guid? quotePostId = Guid.TryParse(request.QuotePostId, out var qid) ? qid : null;
            if (quotePostId == Guid.Empty) quotePostId = null;
            if (quotePostId == null && !string.IsNullOrEmpty(request.QuotePostId))
            {
                 var qp = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Tid == request.QuotePostId || p.Uri == request.QuotePostId);
                 if (qp != null) quotePostId = qp.Id;
                 else if (request.QuotePostId.StartsWith("at://"))
                 {
                     var ingested = await IngestRemotePostAsync(request.QuotePostId);
                     if (ingested != null) quotePostId = ingested.Id;
                 }
            }

            var post = new Post
            {
                Id = Guid.NewGuid(),
                Tid = tid,
                Uri = uriStr,
                AuthorId = userId,
                Content = request.Content,
                CreatedAt = DateTime.UtcNow,
                ReplyToPostId = replyToPostId,
                RootPostId = rootPostId,
                QuotePostId = quotePostId,
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
                var (imagePath, imageCid, thumbPath) = await SaveFileAsync(file, "posts");
                post.PostMedia.Add(new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "image",
                    Url = imagePath,
                    Cid = imageCid,
                    AltText = altText,
                    ThumbnailUrl = thumbPath,
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
            var (videoPath, videoCid, _) = await SaveFileAsync(request.Video, "posts");
            post.PostMedia.Add(new PostMedium
            {
                Id = Guid.NewGuid(),
                PostId = post.Id,
                Type = "video",
                Url = videoPath,
                Cid = videoCid,
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
        author = await _unitOfWork.Users.GetByIdAsync(userId);
        if (author != null)
        {
            author.PostsCount = (author.PostsCount ?? 0) + 1;
            _unitOfWork.Users.Update(author);
        }
        
        Notification? replyNotification = null;
        if (replyToPostId.HasValue)
        {
            var parentPost = await _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .FirstOrDefaultAsync(p => p.Id == replyToPostId.Value);

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

        if (quotePostId.HasValue)
        {
            var quotedPost = await _unitOfWork.Posts.GetByIdAsync(quotePostId.Value);
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

                // 0. Facets (Mentions/Links)
                if (!string.IsNullOrEmpty(post.Content))
                {
                    var facets = await GetFacetsAsync(post.Content);
                    if (facets.Any())
                    {
                        postRecord["facets"] = facets;
                        post.FacetsJson = System.Text.Json.JsonSerializer.Serialize(facets);
                    }
                }

                // 1. Reply Lexicon
                if (post.ReplyToPostId != null && post.RootPostId != null)
                {
                    var parentPost = await _unitOfWork.Posts.Query()
                        .Include(p => p.Author)
                        .FirstOrDefaultAsync(p => p.Id == post.ReplyToPostId.Value);

                    var rootPost = await _unitOfWork.Posts.Query()
                        .Include(p => p.Author)
                        .FirstOrDefaultAsync(p => p.Id == post.RootPostId.Value);

                    if (parentPost != null && rootPost != null)
                    {
                        var parentUri = $"at://{parentPost.Author.Did}/app.bsky.feed.post/{parentPost.Tid}";
                        var rootUri = $"at://{rootPost.Author.Did}/app.bsky.feed.post/{rootPost.Tid}";

                        // Use actual CID if available, fallback to Tid
                        var parentCid = parentPost.Cid ?? parentPost.Tid;
                        var rootCid = rootPost.Cid ?? rootPost.Tid;

                        postRecord["reply"] = new Dictionary<string, object>
                        {
                            { "root", new Dictionary<string, object> { { "uri", rootUri }, { "cid", rootCid } } },
                            { "parent", new Dictionary<string, object> { { "uri", parentUri }, { "cid", parentCid } } }
                        };
                    }
                }

                // 2. Embed Lexicon (Media & Quotes & Links)
                Dictionary<string, object>? embedRecord = null;
                
                // Embed: Quote
                if (post.QuotePostId != null)
                {
                    var quotePost = await _unitOfWork.Posts.Query()
                        .Include(p => p.Author)
                        .FirstOrDefaultAsync(p => p.Id == post.QuotePostId.Value);
                        
                    if (quotePost != null)
                    {
                        var quoteUri = $"at://{quotePost.Author.Did}/app.bsky.feed.post/{quotePost.Tid}";
                        var quoteCid = quotePost.Cid ?? quotePost.Tid;

                        embedRecord = new Dictionary<string, object>
                        {
                            { "$type", "app.bsky.embed.record" },
                            { "record", new Dictionary<string, object> { { "uri", quoteUri }, { "cid", quoteCid } } }
                        };
                    }
                }
                
                // Embed: Images (Content-Addressed Blobs)
                if (post.PostMedia.Any(m => m.Type == "image"))
                {
                    var images = new List<Dictionary<string, object>>();
                    foreach (var img in post.PostMedia.Where(m => m.Type == "image" && !string.IsNullOrEmpty(m.Url)))
                    {
                        try
                        {
                            // 1. Upload the media file as an AT Protocol Blob
                            string fullPath = Path.Combine(_environment.WebRootPath, img.Url.TrimStart('/'));
                            if (File.Exists(fullPath))
                            {
                                using var stream = File.OpenRead(fullPath);
                                // Determine MimeType (naive check)
                                string mimeType = "image/jpeg";
                                if (img.Url.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) mimeType = "image/png";
                                if (img.Url.EndsWith(".gif", StringComparison.OrdinalIgnoreCase)) mimeType = "image/gif";
                                if (img.Url.EndsWith(".webp", StringComparison.OrdinalIgnoreCase)) mimeType = "image/webp";

                                var blobCid = await _repoManager.UploadBlobAsync(authorUser.Did, stream, mimeType);
                                img.Cid = blobCid; // Store for SQL

                                images.Add(new Dictionary<string, object>
                                {
                                    { "alt", img.AltText ?? "" },
                                    { "image", new Dictionary<string, object> 
                                        { 
                                            { "$type", "blob" }, 
                                            { "ref", new Dictionary<string, object> { { "$link", blobCid } } },
                                            { "mimeType", mimeType },
                                            { "size", (int)new FileInfo(fullPath).Length }
                                        } 
                                    }
                                });
                            }
                        }
                        catch (Exception ex)
                        {
                            Console.WriteLine($"[CreatePostAsync] Blob Upload Error for {img.Url}: {ex.Message}");
                        }
                    }
                    
                    if (images.Any())
                    {
                        var imageEmbed = new Dictionary<string, object>
                        {
                            { "$type", "app.bsky.embed.images" },
                            { "images", images }
                        };
                        
                        // If there was already a quote embed, AT Protocol uses 'app.bsky.embed.recordWithMedia'
                        if (embedRecord != null && embedRecord["$type"].ToString() == "app.bsky.embed.record")
                        {
                             embedRecord = new Dictionary<string, object>
                             {
                                 { "$type", "app.bsky.embed.recordWithMedia" },
                                 { "record", embedRecord },
                                 { "media", imageEmbed }
                             };
                        }
                        else
                        {
                            embedRecord = imageEmbed;
                        }
                    }
                }
                
                // Embed: External Link
                if (post.LinkPreview != null && embedRecord == null) // Skipping recordWithMedia for links for simplicity here
                {
                    embedRecord = new Dictionary<string, object>
                    {
                        { "$type", "app.bsky.embed.external" },
                        { "external", new Dictionary<string, object>
                            {
                                { "uri", post.LinkPreview.Url },
                                { "title", post.LinkPreview.Title ?? "" },
                                { "description", post.LinkPreview.Description ?? "" }
                            }
                        }
                    };
                }

                if (embedRecord != null)
                {
                    postRecord["embed"] = embedRecord;
                }
                var cid = await _repoManager.CreateRecordAsync(authorUser.Did, "app.bsky.feed.post", postRecord);
                
                post.Cid = cid;
                _unitOfWork.Posts.Update(post);
                await _unitOfWork.CompleteAsync();

                Console.WriteLine($"[CreatePostAsync] Repo updated and signed for User {userId}, CID: {cid}");
            }

            // Automated Labeling
            await _labelingService.RunAutomatedLabelingAsync(post);
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

        // Invalidate ALL user post-type caches so replies/posts/media tabs refresh
        await _cacheService.RemoveAsync($"user:{userId}:timeline");
        await _cacheService.RemoveAsync($"user:{userId}:posts:posts:0:20:v2");
        await _cacheService.RemoveAsync($"user:{userId}:posts:posts:0:30:v2");
        await _cacheService.RemoveAsync($"user:{userId}:posts:replies:0:20:v2");
        await _cacheService.RemoveAsync($"user:{userId}:posts:replies:0:30:v2");
        await _cacheService.RemoveAsync($"user:{userId}:posts:media:0:20:v2");
        await _cacheService.RemoveAsync($"user:{userId}:posts:media:0:30:v2");
        await _cacheService.RemoveAsync($"user:{userId}:posts:likes:0:20:v2");
        await _cacheService.RemoveAsync($"user:{userId}:posts:likes:0:30:v2");
        
        // Invalidate parent/root/quote post caches to update counts (RepliesCount, QuotesCount)
        if (replyToPostId.HasValue) await _cacheService.RemoveAsync($"post:{replyToPostId.Value}");
        if (rootPostId.HasValue) await _cacheService.RemoveAsync($"post:{rootPostId.Value}");
        if (quotePostId.HasValue) await _cacheService.RemoveAsync($"post:{quotePostId.Value}");

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
            if (replyToPostId.HasValue)
            {
                var parent = await _unitOfWork.Posts.GetByIdAsync(replyToPostId.Value);
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
            if (quotePostId.HasValue)
            {
                var quoted = await _unitOfWork.Posts.GetByIdAsync(quotePostId.Value);
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

            Console.WriteLine($"[UpdatePostAsync] Request Info - Content: {request.Content?.Length ?? 0} chars, Images: {request.Images?.Count ?? 0}, Video: {request.Video != null}, GifUrl: {request.GifUrl}, ExistingMediaIdsToKeep: {request.ExistingMediaIdsToKeep?.Count ?? 0}");

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
                .Where(m => request.ExistingMediaIdsToKeep != null && !request.ExistingMediaIdsToKeep.Contains(m.Id))
                .ToList();

            Console.WriteLine($"[UpdatePostAsync] Post has {post.PostMedia.Count} existing media. mediaToRemove count: {mediaToRemove.Count}");

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
                // Only add if it's a NEW GIF (not already in post.PostMedia)
                if (!post.PostMedia.Any(m => m.Type == "gif" && m.Url == request.GifUrl))
                {
                    var gifMedia = new PostMedium
                    {
                        Id = Guid.NewGuid(),
                        PostId = post.Id,
                        Type = "gif",
                        Url = request.GifUrl,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _unitOfWork.PostMedia.AddAsync(gifMedia);
                    post.PostMedia.Add(gifMedia);
                    Console.WriteLine($"[UpdatePostAsync] Added new GIF record: {request.GifUrl}");
                }
            }

            if (request.Video != null)
            {
                var (videoPath, videoCid, _) = await SaveFileAsync(request.Video, "posts");
                var videoMedia = new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "video",
                    Url = videoPath,
                    Cid = videoCid,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.PostMedia.AddAsync(videoMedia);
                post.PostMedia.Add(videoMedia);
                Console.WriteLine($"[UpdatePostAsync] Added new video: {videoPath}");
            }
            else if (!string.IsNullOrEmpty(request.PreUploadedVideoUrl))
            {
                var videoMedia = new PostMedium
                {
                    Id = Guid.NewGuid(),
                    PostId = post.Id,
                    Type = "video",
                    Url = request.PreUploadedVideoUrl,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.PostMedia.AddAsync(videoMedia);
                post.PostMedia.Add(videoMedia);
                Console.WriteLine($"[UpdatePostAsync] Added pre-uploaded video: {request.PreUploadedVideoUrl}");
            }

            // Handle New Images
            if (request.Images != null && request.Images.Any())
            {
                Console.WriteLine($"[UpdatePostAsync] Processing {request.Images.Count} new images");
                int currentMaxPos = post.PostMedia.Select(m => m.Position ?? -1).DefaultIfEmpty(-1).Max();
                for (int i = 0; i < request.Images.Count; i++)
                {
                    var file = request.Images[i];
                    var altText = request.AltTexts != null && i < request.AltTexts.Count ? request.AltTexts[i] : null;
                    var (imagePath, imageCid, thumbPath) = await SaveFileAsync(file, "posts");
                    var imageMedia = new PostMedium
                    {
                        Id = Guid.NewGuid(),
                        PostId = post.Id,
                        Type = "image",
                        Url = imagePath,
                        Cid = imageCid,
                        AltText = altText,
                        ThumbnailUrl = thumbPath,
                        Position = currentMaxPos + 1 + i,
                        CreatedAt = DateTime.UtcNow
                    };
                    await _unitOfWork.PostMedia.AddAsync(imageMedia);
                    post.PostMedia.Add(imageMedia);
                    Console.WriteLine($"[UpdatePostAsync] Added new image {i}: {imagePath}");
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

            // Save basic DB changes with retry logic for concurrency
            int maxRetries = 3;
            int retryCount = 0;
            bool saved = false;

            while (!saved && retryCount < maxRetries)
            {
                try
                {
                    await _unitOfWork.CompleteAsync();
                    saved = true;
                }
                catch (DbUpdateConcurrencyException ex)
                {
                    retryCount++;
                    bool handled = false;
                    foreach (var entry in ex.Entries)
                    {
                        if (entry.Entity is PostMedium pm)
                        {
                            var databaseValues = await entry.GetDatabaseValuesAsync();
                            if (databaseValues == null)
                            {
                                // Entity was already deleted in DB, detach it so EF skips it in the next attempt
                                entry.State = EntityState.Detached;
                                handled = true;
                                Console.WriteLine($"[UpdatePostAsync] Detached missing PostMedium {pm.Id} during retry {retryCount}");
                            }
                        }
                    }

                    if (!handled || retryCount >= maxRetries)
                    {
                        var sb = new StringBuilder();
                        sb.AppendLine("CONCURRENCY ERROR DETAILS:");
                        foreach (var entry in ex.Entries)
                        {
                            var dbValues = await entry.GetDatabaseValuesAsync();
                            if (dbValues == null)
                            {
                                sb.AppendLine($"- {entry.Entity.GetType().Name} (ID: {entry.Property("Id").CurrentValue}): Deleted in DB");
                            }
                            else
                            {
                                sb.AppendLine($"- {entry.Entity.GetType().Name} (ID: {entry.Property("Id").CurrentValue}): Modified in DB. Current State: {entry.State}");
                            }
                        }
                        Console.WriteLine($"[UpdatePostAsync] Fatal Concurrency Error: {sb}");
                        throw new Exception(sb.ToString(), ex);
                    }
                }
                catch (DbUpdateException ex)
                {
                    var inner = ex.InnerException?.Message ?? "No inner exception";
                    Console.WriteLine($"[UpdatePostAsync] DbUpdateException: {ex.Message}. Inner: {inner}");
                    throw new Exception($"Database update failed: {ex.Message}. Inner: {inner}", ex);
                }
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

                    // 0. Facets (Mentions/Links)
                    if (!string.IsNullOrEmpty(post.Content))
                    {
                        var facets = await GetFacetsAsync(post.Content);
                        if (facets.Any())
                        {
                            postRecord["facets"] = facets;
                        }
                    }

                    // 1. Reply Lexicon
                    if (post.ReplyToPostId != null && post.RootPostId != null)
                    {
                        var parentPost = await _unitOfWork.Posts.Query()
                            .Include(p => p.Author)
                            .FirstOrDefaultAsync(p => p.Id == post.ReplyToPostId.Value);

                        var rootPost = await _unitOfWork.Posts.Query()
                            .Include(p => p.Author)
                            .FirstOrDefaultAsync(p => p.Id == post.RootPostId.Value);

                        if (parentPost != null && rootPost != null)
                        {
                            var parentUri = $"at://{parentPost.Author.Did}/app.bsky.feed.post/{parentPost.Tid}";
                            var rootUri = $"at://{rootPost.Author.Did}/app.bsky.feed.post/{rootPost.Tid}";

                            postRecord["reply"] = new Dictionary<string, object>
                            {
                                { "root", new Dictionary<string, object> { { "uri", rootUri }, { "cid", rootPost.Tid } } },
                                { "parent", new Dictionary<string, object> { { "uri", parentUri }, { "cid", parentPost.Tid } } }
                            };
                        }
                    }

                    // 2. Embed Lexicon
                    Dictionary<string, object>? embedRecord = null;
                    
                    if (post.QuotePostId != null)
                    {
                        var quotePost = await _unitOfWork.Posts.Query()
                            .Include(p => p.Author)
                            .FirstOrDefaultAsync(p => p.Id == post.QuotePostId.Value);
                            
                        if (quotePost != null)
                        {
                            var quoteUri = $"at://{quotePost.Author.Did}/app.bsky.feed.post/{quotePost.Tid}";
                            embedRecord = new Dictionary<string, object>
                            {
                                { "$type", "app.bsky.embed.record" },
                                { "record", new Dictionary<string, object> { { "uri", quoteUri }, { "cid", quotePost.Tid } } }
                            };
                        }
                    }
                    
                    if (post.PostMedia.Any(m => m.Type == "image"))
                    {
                        var images = new List<Dictionary<string, object>>();
                        foreach (var img in post.PostMedia.Where(m => m.Type == "image"))
                        {
                            images.Add(new Dictionary<string, object>
                            {
                                { "alt", img.AltText ?? "" },
                                { "image", new Dictionary<string, object> { { "$type", "blob" }, { "ref", img.Id.ToString() } } }
                            });
                        }
                        
                        var imageEmbed = new Dictionary<string, object>
                        {
                            { "$type", "app.bsky.embed.images" },
                            { "images", images }
                        };
                        
                        if (embedRecord != null && embedRecord["$type"].ToString() == "app.bsky.embed.record")
                        {
                             embedRecord = new Dictionary<string, object>
                             {
                                 { "$type", "app.bsky.embed.recordWithMedia" },
                                 { "record", embedRecord },
                                 { "media", imageEmbed }
                             };
                        }
                        else
                        {
                            embedRecord = imageEmbed;
                        }
                    }
                    
                    if (post.LinkPreview != null && embedRecord == null)
                    {
                        embedRecord = new Dictionary<string, object>
                        {
                            { "$type", "app.bsky.embed.external" },
                            { "external", new Dictionary<string, object>
                                {
                                    { "uri", post.LinkPreview.Url },
                                    { "title", post.LinkPreview.Title ?? "" },
                                    { "description", post.LinkPreview.Description ?? "" }
                                }
                            }
                        };
                    }

                    if (embedRecord != null)
                    {
                        postRecord["embed"] = embedRecord;
                    }
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

            // Automated Labeling
            await _labelingService.RunAutomatedLabelingAsync(post);

            // Invalidate caches
            await _cacheService.RemoveAsync($"post:{postId}");
            await _cacheService.RemoveAsync($"user:{userId}:timeline");
            
            // Re-fetch for DTO mapping - USE AS NO TRACKING to get clean DB state
            var savedPost = await _unitOfWork.Posts.Query()
                .AsNoTracking()
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

            Console.WriteLine($"[UpdatePostAsync] Final re-fetch media count: {savedPost?.PostMedia.Count ?? 0}");
                
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

        PostDto? postDto = cachedPost;

        if (postDto == null)
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
            var results = await EnrichAndFilterPostsAsync(new List<PostDto> { postDto }, viewerId.Value);
            return results.FirstOrDefault();
        }

        return postDto;
    }

    public async Task<IEnumerable<PostDto>> GetPostsByIdsAsync(IEnumerable<Guid> postIds, Guid? viewerId = null)
    {
        var ids = postIds.Distinct().ToList();
        if (!ids.Any()) return new List<PostDto>();

        var resultsMap = new Dictionary<Guid, PostDto>();
        var missingIds = new List<Guid>();

        foreach (var id in ids)
        {
            var cached = await _cacheService.GetAsync<PostDto>($"post:{id}");
            if (cached != null) resultsMap[id] = cached;
            else missingIds.Add(id);
        }

        if (missingIds.Any())
        {
            var dbPosts = await _unitOfWork.Posts.Query()
                .Include(p => p.Author)
                .Include(p => p.PostMedia)
                .Include(p => p.LinkPreview)
                .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
                .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                .AsSplitQuery()
                .Where(p => missingIds.Contains(p.Id) && (p.IsDeleted == false || p.IsDeleted == null))
                .ToListAsync();

            foreach (var post in dbPosts)
            {
                var dto = MapToDto(post);
                resultsMap[post.Id] = dto;
                await _cacheService.SetAsync($"post:{post.Id}", dto, TimeSpan.FromMinutes(30));
            }
        }

        var resultsList = ids.Where(id => resultsMap.ContainsKey(id)).Select(id => resultsMap[id]).ToList();

        if (viewerId.HasValue && resultsList.Any())
        {
            return await EnrichAndFilterPostsAsync(resultsList, viewerId.Value);
        }

        return resultsList;
    }
    public async Task<PostDto?> GetPostByTidAsync(string tid, Guid? viewerId = null)
    {
        _logger.LogInformation("[PostService] GetPostByTidAsync: Searching for Tid='{Tid}'", tid);
        
        var post = await _unitOfWork.Posts.Query()
            .FirstOrDefaultAsync(p => p.Tid == tid && (p.IsDeleted == false || p.IsDeleted == null));

        if (post == null) 
        {
            _logger.LogWarning("[PostService] GetPostByTidAsync: Post with Tid='{Tid}' NOT FOUND in database.", tid);
            return null;
        }

        _logger.LogInformation("[PostService] GetPostByTidAsync: Found post {PostId} for Tid='{Tid}'.", post.Id, tid);
        return await GetPostByIdAsync(post.Id, viewerId);
    }

    public async Task<PostDto?> GetPostByUriAsync(string uri, Guid? viewerId = null)
    {
        if (string.IsNullOrEmpty(uri)) return null;

        try
        {
            if (!uri.StartsWith("at://")) return null;

            var parts = uri.Substring(5).Split('/');
            if (parts.Length < 3) return null;

            var didOrHandle = parts[0];
            var collection = parts[1];
            var rkey = parts[2];

            // 1. Check local DB first
            var existing = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Uri == uri || (p.Tid == rkey && p.Author.Did == didOrHandle));
            if (existing != null)
            {
                return await GetPostByIdAsync(existing.Id, viewerId);
            }

            // 2. Remote post - Ingest on-demand
            if (collection == "app.bsky.feed.post")
            {
                var ingested = await IngestRemotePostAsync(uri);
                if (ingested != null)
                {
                    return await GetPostByIdAsync(ingested.Id, viewerId);
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resolving AT-URI: {Uri}", uri);
            return null;
        }
    }

    private async Task<Post?> IngestRemotePostAsync(string uri)
    {
        try
        {
            if (string.IsNullOrEmpty(uri) || !uri.StartsWith("at://")) return null;

            var parts = uri.Substring(5).Split('/');
            if (parts.Length < 3) return null;

            var didOrHandle = parts[0];
            var rkey = parts[2];

            // 1. Resolve author
            var author = await _userService.ResolveRemoteProfileAsync(didOrHandle);
            if (author == null) return null;

            // 2. Fetch post thread (depth 0) to get record data and GLOBAL counts
            var qDict = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
            {
                { "uri", uri },
                { "depth", "0" }
            };
            var qCollection = new QueryCollection(qDict);

            JsonElement postData;
            JsonElement record;
            string? cid = null;
            bool success = false;
            string contentData = "";

            // Try Public AppView first for global stats
            try
            {
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                var response = await client.GetAsync($"https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri={Uri.EscapeDataString(uri)}&depth=0");
                if (response.IsSuccessStatusCode)
                {
                    contentData = await response.Content.ReadAsStringAsync();
                    success = true;
                }
            }
            catch { }

            // Fallback to proxying PDS
            if (!success)
            {
                var proxyResult = await _xrpcProxy.ProxyRequestAsync(author.Did, "app.bsky.feed.getPostThread", qCollection);
                if (proxyResult.Success)
                {
                    contentData = proxyResult.Content;
                    success = true;
                }
            }

            if (success)
            {
                var threadData = System.Text.Json.JsonDocument.Parse(contentData);
                if (threadData.RootElement.TryGetProperty("thread", out var thread) && 
                    thread.TryGetProperty("post", out postData))
                {
                    cid = postData.GetProperty("cid").GetString();
                    record = postData.GetProperty("record");
                }
                else
                {
                    // Fallback to getRecord
                    return await IngestViaGetRecordAsync(author, uri, rkey);
                }
            }
            else
            {
                // Fallback to getRecord if thread fails
                return await IngestViaGetRecordAsync(author, uri, rkey);
            }

            // Check if already exists (race condition)
            var existing = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Uri == uri || p.Cid == cid);
            if (existing != null) return existing;

            var newPost = new Post
            {
                Id = Guid.NewGuid(),
                AuthorId = author.Id,
                Content = record.GetProperty("text").GetString(),
                CreatedAt = DateTime.Parse(record.GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
                Uri = uri,
                Cid = cid,
                Tid = rkey,
                LikesCount = postData.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0,
                RepostsCount = postData.TryGetProperty("repostCount", out var rc) ? rc.GetInt32() : 0,
                RepliesCount = postData.TryGetProperty("replyCount", out var rpc) ? rpc.GetInt32() : 0,
                IsDeleted = false
            };

            await _unitOfWork.Posts.AddAsync(newPost);
            await _unitOfWork.CompleteAsync();

            return newPost;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error ingesting remote post: {Uri}", uri);
            return null;
        }
    }

    private PostDto MapRemotePostToDto(System.Text.Json.JsonElement postData)
    {
        // Minimal mapping for remote posts
        return new PostDto
        {
            Id = Guid.Empty, // Remote posts don't have a local DB Guid
            Content = postData.GetProperty("record").GetProperty("text").GetString() ?? "",
            CreatedAt = DateTime.Parse(postData.GetProperty("record").GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
            Author = new AuthorDto
            {
                Did = postData.GetProperty("author").GetProperty("did").GetString() ?? "",
                Handle = postData.GetProperty("author").GetProperty("handle").GetString() ?? "",
                DisplayName = postData.TryGetProperty("author", out var auth) && auth.TryGetProperty("displayName", out var dn) ? dn.GetString() : null,
                AvatarUrl = postData.TryGetProperty("author", out auth) && auth.TryGetProperty("avatar", out var av) ? av.GetString() : null
            },
            Uri = postData.GetProperty("uri").GetString(),
            Cid = postData.GetProperty("cid").GetString(),
            LikesCount = postData.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0,
            RepostsCount = postData.TryGetProperty("repostCount", out var rc) ? rc.GetInt32() : 0,
            RepliesCount = postData.TryGetProperty("replyCount", out var rpc) ? rpc.GetInt32() : 0,
            IsLiked = postData.TryGetProperty("viewer", out var v) && v.TryGetProperty("like", out var l) ? true : false,
            IsReposted = postData.TryGetProperty("viewer", out v) && v.TryGetProperty("repost", out var r) ? true : false
        };
    }

    private async Task<Post?> IngestViaGetRecordAsync(User author, string uri, string rkey)
    {
        try
        {
            var qDict = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
            {
                { "repo", author.Did },
                { "collection", "app.bsky.feed.post" },
                { "rkey", rkey }
            };
            var qCollection = new QueryCollection(qDict);

            var proxyResult = await _xrpcProxy.ProxyRequestAsync(author.Did, "com.atproto.repo.getRecord", qCollection);
            if (!proxyResult.Success) return null;

            var data = System.Text.Json.JsonDocument.Parse(proxyResult.Content);
            var record = data.RootElement.GetProperty("value");
            var cid = data.RootElement.TryGetProperty("cid", out var c) ? c.GetString() : null;

            var existing = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Uri == uri || (cid != null && p.Cid == cid));
            if (existing != null) return existing;

            var newPost = new Post
            {
                Id = Guid.NewGuid(),
                AuthorId = author.Id,
                Content = record.GetProperty("text").GetString(),
                CreatedAt = DateTime.Parse(record.GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
                Uri = uri,
                Cid = cid,
                Tid = rkey,
                LikesCount = 0, // getRecord doesn't provide counts
                RepostsCount = 0,
                RepliesCount = 0,
                IsDeleted = false
            };

            await _unitOfWork.Posts.AddAsync(newPost);
            await _unitOfWork.CompleteAsync();
            return newPost;
        }
        catch { return null; }
    }

    public async Task<object> GetPostThreadAsync(string uri, int depth, int parentHeight, Guid? viewerId = null)
    {
        if (string.IsNullOrEmpty(uri)) return null;

        try
        {
            if (!uri.StartsWith("at://")) return null;

            var parts = uri.Substring(5).Split('/');
            if (parts.Length < 3) return null;

            var didOrHandle = parts[0];
            var collection = parts[1];
            var rkey = parts[2];

            // 1. Resolve DID/Handle to check if local
            var user = await _unitOfWork.Users.Query()
                .FirstOrDefaultAsync(u => u.Did == didOrHandle || u.Handle == didOrHandle);

            // ONLY use local DB if it's a truly local user (no DID from Bluesky yet or explicitly marked local)
            // If it's a remote user DID, always use proxying to ensure likes/replies sync from Bluesky AppView
            bool isTrulyLocal = user != null && (string.IsNullOrEmpty(user.Did) || !user.Did.StartsWith("did:"));

            if (isTrulyLocal)
            {
                // Local post
                var posts = await _unitOfWork.Posts.Query()
                    .Include(p => p.Author)
                    .Include(p => p.PostMedia)
                    .Include(p => p.LinkPreview)
                    .Include(p => p.Hashtags)
                    .Include(p => p.Interests)
                    .Where(p => p.AuthorId == user!.Id && p.Tid == rkey)
                    .ToListAsync();
                
                var post = posts.FirstOrDefault();
                if (post == null) return null;

                // Sync resolution for single-thread view to avoid DID display
                if (post.Author != null && post.Author.Did == post.Author.Handle)
                {
                    await _userService.ResolveRemoteProfileAsync(post.Author.Did!);
                }

                var postDto = MapToDto(post);
                var enriched = await EnrichAndFilterPostsAsync(new List<PostDto> { postDto }, viewerId ?? Guid.Empty);
                postDto = enriched.First();

                // Build thread structure
                var thread = new
                {
                    thread = new
                    {
                        @type = "app.bsky.feed.defs#threadViewPost",
                        post = postDto,
                        replies = (await GetPostRepliesAsync(post.Id, viewerId)).Select(r => new { post = r, @type = "app.bsky.feed.defs#threadViewPost" }),
                        parent = post.ReplyToPostId.HasValue ? new { post = await GetPostByIdAsync(post.ReplyToPostId.Value, viewerId), @type = "app.bsky.feed.defs#threadViewPost" } : null
                    }
                };

                return thread;
            }

            // 2. Remote post - resolve handle to DID if needed, then proxy
            string didForProxy = didOrHandle;

            if (!didOrHandle.StartsWith("did:"))
            {
                // It's a handle â€” resolve to DID via .well-known
                try
                {
                    var response = await new System.Net.Http.HttpClient().GetAsync($"https://{didOrHandle}/.well-known/atproto-did");
                    if (response.IsSuccessStatusCode)
                        didForProxy = (await response.Content.ReadAsStringAsync()).Trim();
                }
                catch { /* Use handle as-is; proxy will fail gracefully */ }
            }

            var qDict = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
            {
                { "uri", uri },
                { "depth", depth.ToString() },
                { "parentHeight", parentHeight.ToString() }
            };

            // 3. Try Public AppView directly FIRST (to get global counts instead of PDS local counts)
            string rawJson = null;
            try
            {
                _logger.LogInformation("Trying Public AppView for GetPostThread: {Uri}", uri);
                using var client = new System.Net.Http.HttpClient();
                client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                var response = await client.GetAsync($"https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri={Uri.EscapeDataString(uri)}&depth={depth}&parentHeight={parentHeight}");
                if (response.IsSuccessStatusCode)
                {
                    rawJson = await response.Content.ReadAsStringAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Public AppView failed for {Uri}, falling back to Proxy", uri);
            }

            // 4. Fallback to proxying to the PDS if AppView fails
            if (rawJson == null)
            {
                var qCollection = new QueryCollection(qDict);
                var proxyResult = await _xrpcProxy.ProxyRequestAsync(didForProxy, "app.bsky.feed.getPostThread", qCollection);
                if (proxyResult.Success)
                {
                    rawJson = proxyResult.Content;
                }
            }

            if (rawJson != null)
            {
                // Inject local interactions into the remote JSON to ensure UI consistency
                try
                {
                    var jObject = Newtonsoft.Json.Linq.JObject.Parse(rawJson);
                    var allCids = new List<string>();
                    var postNodes = new List<Newtonsoft.Json.Linq.JToken>();
                    var threadNodes = new List<Newtonsoft.Json.Linq.JToken>();

                    // Helper to recursively find all 'post' nodes in the thread
                    Action<Newtonsoft.Json.Linq.JToken> extractPosts = null;
                    extractPosts = (node) =>
                    {
                        if (node == null) return;
                        if (node["post"] != null)
                        {
                            threadNodes.Add(node);
                            postNodes.Add(node["post"]);
                            if (node["post"]["cid"] != null) allCids.Add(node["post"]["cid"].ToString());
                        }
                        if (node["parent"] != null) extractPosts(node["parent"]);
                        if (node["replies"] != null)
                        {
                            foreach (var reply in node["replies"]) extractPosts(reply);
                        }
                    };

                    var threadNode = jObject["thread"];
                    if (threadNode != null)
                    {
                        // Background ingestion to populate local DB with remote replies
                        _ = Task.Run(async () => {
                            try {
                                using var scope = _scopeFactory.CreateScope();
                                var backgroundPostService = scope.ServiceProvider.GetRequiredService<IPostService>();
                                await backgroundPostService.IngestThreadRecursiveAsync(threadNode);
                            } catch (Exception ex) {
                                _logger.LogWarning(ex, "Background thread ingestion failed for {Uri}", uri);
                            }
                        });
                    }

                    extractPosts(threadNode);

                    if (allCids.Any())
                    {
                        // Optimization: Fetch local posts matching these Cids
                        var localPosts = await _unitOfWork.Posts.Query()
                            .Where(p => allCids.Contains(p.Cid) || allCids.Contains(p.Tid))
                            .ToDictionaryAsync(p => p.Cid ?? p.Tid, p => p.Id);

                        if (localPosts.Any())
                        {
                            var postIds = localPosts.Values.ToList();
                            
                             // Get local interactions for ALL posts in the thread
                             var localLikes = await _unitOfWork.Likes.Query()
                                 .Where(l => postIds.Contains(l.PostId))
                                 .GroupBy(l => l.PostId)
                                 .ToDictionaryAsync(g => g.Key, g => g.Count());
 
                             var localReposts = await _unitOfWork.Reposts.Query()
                                 .Where(r => postIds.Contains(r.PostId))
                                 .GroupBy(r => r.PostId)
                                 .ToDictionaryAsync(g => g.Key, g => g.Count());

                            var localReplies = await _unitOfWork.Posts.Query()
                                .Include(p => p.Author)
                                .Include(p => p.PostMedia)
                                .Include(p => p.LinkPreview)
                                .Where(p => p.ReplyToPostId != null && postIds.Contains(p.ReplyToPostId.Value))
                                .ToListAsync();

                            var localRepliesCounts = localReplies.GroupBy(p => p.ReplyToPostId!.Value).ToDictionary(g => g.Key, g => g.Count());

                            var localQuotesCounts = await _unitOfWork.Posts.Query()
                                .Where(p => p.QuotePostId != null && postIds.Contains(p.QuotePostId.Value))
                                .GroupBy(p => p.QuotePostId)
                                .ToDictionaryAsync(g => g.Key!.Value, g => g.Count());

                            Dictionary<Guid, string> userLikes = new();
                            Dictionary<Guid, string> userReposts = new();

                            if (viewerId.HasValue)
                            {
                                userLikes = await _unitOfWork.Likes.Query()
                                    .Where(l => l.UserId == viewerId.Value && postIds.Contains(l.PostId))
                                    .ToDictionaryAsync(l => l.PostId, l => l.Uri ?? "local");
                                
                                userReposts = await _unitOfWork.Reposts.Query()
                                    .Where(r => r.UserId == viewerId.Value && postIds.Contains(r.PostId))
                                    .ToDictionaryAsync(r => r.PostId, r => r.Uri ?? "local");
                            }

                            // Mutate JTokens
                            foreach (var postNode in postNodes)
                            {
                                var cid = postNode["cid"]?.ToString();
                                if (cid != null && localPosts.TryGetValue(cid, out var pid))
                                {
                                    if (localLikes.TryGetValue(pid, out var llCount))
                                    {
                                        var remoteLC = parseInt(postNode["likeCount"]);
                                        postNode["likeCount"] = Math.Max(llCount, remoteLC);
                                    }
                                    if (localReposts.TryGetValue(pid, out var lrCount))
                                    {
                                        var remoteRC = parseInt(postNode["repostCount"]);
                                        postNode["repostCount"] = Math.Max(lrCount, remoteRC);
                                    }
                                    if (localRepliesCounts.TryGetValue(pid, out var lrplCount))
                                    {
                                        var remoteRPC = parseInt(postNode["replyCount"]);
                                        postNode["replyCount"] = Math.Max(lrplCount, remoteRPC);
                                    }
                                    if (localQuotesCounts.TryGetValue(pid, out var lqCount))
                                    {
                                        var remoteQC = parseInt(postNode["quoteCount"]);
                                        postNode["quoteCount"] = Math.Max(lqCount, remoteQC);
                                    }

                                    if (viewerId.HasValue)
                                    {
                                        if (postNode["viewer"] == null) postNode["viewer"] = new Newtonsoft.Json.Linq.JObject();
                                        
                                        if (userLikes.TryGetValue(pid, out var lUri))
                                            postNode["viewer"]["like"] = lUri;
                                        
                                        if (userReposts.TryGetValue(pid, out var rUri))
                                            postNode["viewer"]["repost"] = rUri;
                                    }
                                }
                            }

                            // 5. Inject Local Replies that might not be on the remote server yet (already fetched above)
                            if (localReplies.Any())
                            {
                                foreach (var threadWrapperNode in threadNodes)
                                {
                                    var postNodeForThisThread = threadWrapperNode["post"];
                                    var cid = postNodeForThisThread?["cid"]?.ToString();
                                    
                                    if (cid != null && localPosts.TryGetValue(cid, out var pid))
                                    {
                                        var repliesToThis = localReplies.Where(r => r.ReplyToPostId == pid).ToList();
                                        if (repliesToThis.Any())
                                        {
                                            if (threadWrapperNode["replies"] == null) threadWrapperNode["replies"] = new Newtonsoft.Json.Linq.JArray();
                                            var existingReplyUris = threadWrapperNode["replies"].Select(r => r["post"]?["uri"]?.ToString()).Where(u => u != null).ToHashSet();

                                            foreach (var lr in repliesToThis)
                                            {
                                                if (!existingReplyUris.Contains(lr.Uri))
                                                {
                                                    var lrDto = MapToDto(lr);
                                                    var lrEnriched = (await EnrichAndFilterPostsAsync(new List<PostDto> { lrDto }, viewerId ?? Guid.Empty)).First();
                                                    
                                                    var serializerSettings = new Newtonsoft.Json.JsonSerializerSettings 
                                                    { 
                                                        ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver() 
                                                    };
                                                    var lrJson = Newtonsoft.Json.Linq.JObject.FromObject(lrEnriched, Newtonsoft.Json.JsonSerializer.Create(serializerSettings));
                                                    var parentUriForLr = postNodeForThisThread?["uri"]?.ToString();
                                                    if (!string.IsNullOrEmpty(parentUriForLr))
                                                    {
                                                        lrJson["replyToPostId"] = parentUriForLr;
                                                    }

                                                    var newNode = new Newtonsoft.Json.Linq.JObject
                                                    {
                                                        ["post"] = lrJson,
                                                        ["@type"] = "app.bsky.feed.defs#threadViewPost"
                                                    };
                                                    ((Newtonsoft.Json.Linq.JArray)threadWrapperNode["replies"]).Add(newNode);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            int parseInt(Newtonsoft.Json.Linq.JToken t) => t != null && int.TryParse(t.ToString(), out int v) ? v : 0;
                        }
                    }

                    return System.Text.Json.JsonSerializer.Deserialize<object>(jObject.ToString());
                }
                catch (Exception jsonEx)
                {
                    _logger.LogError(jsonEx, "Failed to inject local counts into JSON, returning raw proxy.");
                    return System.Text.Json.JsonSerializer.Deserialize<object>(rawJson);
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting post thread: {Uri}", uri);
            return null;
        }
    }

    public async Task FetchRemoteAuthorFeedAsync(string did, string? type = null, string? cursor = null)
    {
        try
        {
            var filter = type ?? "posts";
            _logger.LogInformation("Starting fetch for remote feed: {Did}, Type: {Type}, Cursor: {Cursor}", did, filter, cursor);

            var qDict = new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
            {
                { "actor", did },
                { "limit", "50" }
            };
            
            if (!string.IsNullOrEmpty(cursor))
            {
                qDict["cursor"] = cursor;
            }

            var remoteFilter = MapRemoteAuthorFeedFilter(type);
            if (!string.IsNullOrWhiteSpace(remoteFilter))
            {
                qDict["filter"] = remoteFilter;
            }
            var qCollection = new QueryCollection(qDict);

            var proxyResult = await _xrpcProxy.ProxyRequestAsync(did, "app.bsky.feed.getAuthorFeed", qCollection);
            
            if (proxyResult.Success)
            {
                var feedData = System.Text.Json.JsonDocument.Parse(proxyResult.Content);
                var feedItems = feedData.RootElement.GetProperty("feed");

                // Save cursor for pagination
                if (feedData.RootElement.TryGetProperty("cursor", out var cProp))
                {
                    var nextCursor = cProp.GetString();
                    if (!string.IsNullOrEmpty(nextCursor))
                    {
                        var cursorCacheKey = $"remote_feed_cursor:{did}:{filter}";
                        await _cacheService.SetAsync(cursorCacheKey, nextCursor, TimeSpan.FromHours(1));
                    }
                }

                if (feedItems.ValueKind != JsonValueKind.Array || feedItems.GetArrayLength() == 0)
                {
                    _logger.LogInformation(
                        "Remote author feed returned no items for {Did} with type {Type} and filter {Filter}",
                        did,
                        type ?? "posts",
                        remoteFilter ?? "<default>");

                    await _userService.ResolveRemoteProfileAsync(did);
                    return;
                }

                var author = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
                if (author == null)
                {
                    // Create stub user for remote author
                    var actorData = feedItems[0].GetProperty("post").GetProperty("author");
                    var stubHandle = actorData.GetProperty("handle").GetString() ?? did;
                    author = new User
                    {
                        Id = Guid.NewGuid(),
                        Did = did,
                        Handle = stubHandle,
                        Username = stubHandle.Contains('.') ? stubHandle.Split('.').First() : (stubHandle.Length > 20 ? stubHandle.Substring(0, 20) : stubHandle),
                        DisplayName = actorData.TryGetProperty("displayName", out var dn) ? dn.GetString() : null,
                        AvatarUrl = actorData.TryGetProperty("avatar", out var av) ? av.GetString() : null,
                        IsVerified = true, // Assuming remote is verified if they have a feed
                        CreatedAt = DateTime.UtcNow
                    };
                    await _unitOfWork.Users.AddAsync(author);
                    await _unitOfWork.CompleteAsync();
                }

                foreach (var item in feedItems.EnumerateArray())
                {
                    var postData = item.GetProperty("post");
                    var uri = postData.GetProperty("uri").GetString();
                    var cid = postData.GetProperty("cid").GetString();
                    var tid = uri?.Split('/').Last();
                    var record = postData.GetProperty("record");

                    var postAuthorData = postData.GetProperty("author");
                    var postAuthorDid = postAuthorData.GetProperty("did").GetString();
                    
                    // Handle Reposts
                    bool isRepost = item.TryGetProperty("reason", out var reason) && 
                                   reason.TryGetProperty("$type", out var typeProp) && 
                                   typeProp.GetString() == "app.bsky.feed.defs#skeletonReasonRepost";

                    User? realAuthor = author;
                    if (isRepost || postAuthorDid != did)
                    {
                        // This post belongs to someone else (or was reposted)
                        // Ingest the real author first
                        realAuthor = await _userService.ResolveStubRemoteProfileAsync(postAuthorData, new Dictionary<string, User>());
                    }

                    if (realAuthor == null) continue;

                    Guid? replyToPostId = null;
                    Guid? rootPostId = null;
                    if (TryExtractReplyUris(record, out var parentUri, out var rootUri))
                    {
                        var parentPost = await FindOrCreateRemotePostStubAsync(parentUri);
                        replyToPostId = parentPost?.Id;

                        var rootPost = await FindOrCreateRemotePostStubAsync(rootUri ?? parentUri);
                        rootPostId = rootPost?.Id;
                    }

                    // Check if we already have the post
                    var existing = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Uri == uri || p.Cid == cid);
                    if (existing == null)
                    {
                        existing = new Post
                        {
                            Id = Guid.NewGuid(),
                            AuthorId = realAuthor.Id,
                            Content = record.GetProperty("text").GetString(),
                            CreatedAt = DateTime.Parse(record.GetProperty("createdAt").GetString() ?? DateTime.UtcNow.ToString()),
                            Uri = uri,
                            Cid = cid,
                            Tid = tid ?? GenerateTid(),
                            ReplyToPostId = replyToPostId,
                            RootPostId = rootPostId,
                            LikesCount = postData.TryGetProperty("likeCount", out var lc) ? lc.GetInt32() : 0,
                            RepostsCount = postData.TryGetProperty("repostCount", out var rc) ? rc.GetInt32() : 0,
                            RepliesCount = postData.TryGetProperty("replyCount", out var rpc) ? rpc.GetInt32() : 0,
                            IsDeleted = false,
                            FacetsJson = record.TryGetProperty("facets", out var f) ? f.ToString() : null
                        };
                        
                        if (postData.TryGetProperty("embed", out var e))
                        {
                            await IngestEmbedsAsync(existing, e);
                        }
                        
                        await _unitOfWork.Posts.AddAsync(existing);
                    }
                    else
                    {
                        // Update existing post attribution if it was wrong (e.g. previously ingested as a post instead of repost)
                        if (existing.AuthorId != realAuthor.Id)
                        {
                            existing.AuthorId = realAuthor.Id;
                            _unitOfWork.Posts.Update(existing);
                        }
                    }

                    // If it's a repost, create/update the Repost record for the 'author' (the one whose feed we are fetching)
                    if (isRepost)
                    {
                        var existingRepost = await _unitOfWork.Reposts.Query()
                            .FirstOrDefaultAsync(r => r.UserId == author.Id && r.PostId == existing.Id);
                        
                        if (existingRepost == null)
                        {
                            var repost = new Repost
                            {
                                UserId = author.Id,
                                PostId = existing.Id,
                                CreatedAt = DateTime.UtcNow,
                                Uri = item.GetProperty("reason").TryGetProperty("indexedAt", out var idx) ? $"at://{author.Did}/app.bsky.feed.repost/{tid}_repost" : null
                            };
                            await _unitOfWork.Reposts.AddAsync(repost);
                        }
                    }
                }
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("Finished background fetch for remote feed: {Did}", did);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching remote author feed for {Did}", did);
        }
    }

    private static string? MapRemoteAuthorFeedFilter(string? type)
    {
        return type switch
        {
            "replies" => "posts_with_replies",
            "media" => "posts_with_media",
            "video" => "posts_with_media",
            "posts" => "posts_no_replies",
            _ => null
        };
    }

    private async Task IngestEmbedsAsync(Post post, System.Text.Json.JsonElement embed)
    {
        try
        {
            if (!embed.TryGetProperty("$type", out var typeProp)) return;
            var type = typeProp.GetString();
            
            if (type == "app.bsky.embed.images#view")
            {
                if (embed.TryGetProperty("images", out var images))
                {
                    int pos = 0;
                    foreach (var img in images.EnumerateArray())
                    {
                        var thumb = img.GetProperty("thumb").GetString();
                        var full = img.GetProperty("fullsize").GetString();
                        var alt = img.TryGetProperty("alt", out var a) ? a.GetString() : null;

                        if (!string.IsNullOrEmpty(thumb) || !string.IsNullOrEmpty(full))
                        {
                            var medium = new PostMedium
                            {
                                Id = Guid.NewGuid(),
                                PostId = post.Id,
                                Type = "image",
                                Url = full ?? thumb!,
                                ThumbnailUrl = thumb,
                                AltText = alt,
                                Position = pos++,
                                CreatedAt = DateTime.UtcNow
                            };
                            await _unitOfWork.PostMedia.AddAsync(medium);
                        }
                    }
                }
            }
            else if (type == "app.bsky.embed.external#view")
            {
                if (embed.TryGetProperty("external", out var ext))
                {
                    var uri = ext.GetProperty("uri").GetString();
                    if (!string.IsNullOrEmpty(uri))
                    {
                        var preview = new LinkPreview
                        {
                            Id = Guid.NewGuid(),
                            PostId = post.Id,
                            Url = uri,
                            Title = ext.TryGetProperty("title", out var t) ? t.GetString() : null,
                            Description = ext.TryGetProperty("description", out var d) ? d.GetString() : null,
                            Image = ext.TryGetProperty("thumb", out var i) ? i.GetString() : null,
                            Domain = new Uri(uri).Host.Replace("www.", ""),
                            CreatedAt = DateTime.UtcNow
                        };
                        await _unitOfWork.LinkPreviews.AddAsync(preview);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to ingest System.Text.Json embeds for post {Uri}", post.Uri);
        }
    }

    private async Task IngestEmbedsAsync(Post post, Newtonsoft.Json.Linq.JToken? embed)
    {
        if (embed == null) return;
        try
        {
            var type = embed["$type"]?.ToString();
            if (type == "app.bsky.embed.images#view")
            {
                var images = embed["images"] as Newtonsoft.Json.Linq.JArray;
                if (images != null)
                {
                    int pos = 0;
                    foreach (var img in images)
                    {
                        var thumb = img["thumb"]?.ToString();
                        var full = img["fullsize"]?.ToString();
                        var alt = img["alt"]?.ToString();

                        if (!string.IsNullOrEmpty(thumb) || !string.IsNullOrEmpty(full))
                        {
                            var medium = new PostMedium
                            {
                                Id = Guid.NewGuid(),
                                PostId = post.Id,
                                Type = "image",
                                Url = full ?? thumb!,
                                ThumbnailUrl = thumb,
                                AltText = alt,
                                Position = pos++,
                                CreatedAt = DateTime.UtcNow
                            };
                            await _unitOfWork.PostMedia.AddAsync(medium);
                        }
                    }
                }
            }
            else if (type == "app.bsky.embed.external#view")
            {
                var ext = embed["external"];
                if (ext != null)
                {
                    var uri = ext["uri"]?.ToString();
                    if (!string.IsNullOrEmpty(uri))
                    {
                        var preview = new LinkPreview
                        {
                            Id = Guid.NewGuid(),
                            PostId = post.Id,
                            Url = uri,
                            Title = ext["title"]?.ToString(),
                            Description = ext["description"]?.ToString(),
                            Image = ext["thumb"]?.ToString(),
                            Domain = new Uri(uri).Host.Replace("www.", ""),
                            CreatedAt = DateTime.UtcNow
                        };
                        await _unitOfWork.LinkPreviews.AddAsync(preview);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to ingest Newtonsoft embeds for post {Uri}", post.Uri);
        }
    }


    public async Task ProcessRemotePostAsync(string did, string path, string cid, byte[] recordData)
    {
        try
        {
            var uri = $"at://{did}/{path}";
            var tid = path.Split('/').Last();

            // Check if post already exists locally
            var existing = await _unitOfWork.Posts.Query().AnyAsync(p => p.Uri == uri || p.Cid == cid);
            if (existing) return;

            // Decode DAG-CBOR record
            var record = CborUtils.Decode(recordData) as Dictionary<string, object>;
            if (record == null) {
                _logger.LogWarning("Firehose: Failed to decode record CBOR for {Uri}", uri);
                return;
            }

            // Find or create stub author
            var author = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
            if (author == null)
            {
                author = new User
                {
                    Id = Guid.NewGuid(),
                    Did = did,
                    Handle = did, // Placeholder handle
                    Username = did,
                    Email = $"{did}@placeholder.com", // Dummy email for remote users
                    PasswordHash = "remote",
                    Salt = "remote",
                    IsVerified = true,
                    CreatedAt = DateTime.UtcNow
                };
                await _unitOfWork.Users.AddAsync(author);
                await _unitOfWork.CompleteAsync();
                _logger.LogInformation("Firehose: Created stub user for remote DID {Did}", did);

                // Phase 35: Proactively resolve profile
                _ = Task.Run(async () => {
                    try {
                        using var scope = _scopeFactory.CreateScope();
                        var backgroundUserService = scope.ServiceProvider.GetRequiredService<IUserService>();
                        await backgroundUserService.ResolveRemoteProfileAsync(did);
                    } catch (Exception ex) {
                        _logger.LogWarning(ex, "Firehose: Failed to proactively resolve profile for {Did}", did);
                    }
                });
            }
            else if (author.Handle == author.Did) // Still a stub
            {
                // Periodically retry resolution or trigger if accessed
                _ = Task.Run(async () => {
                    try {
                        using var scope = _scopeFactory.CreateScope();
                        var backgroundUserService = scope.ServiceProvider.GetRequiredService<IUserService>();
                        await backgroundUserService.ResolveRemoteProfileAsync(did);
                    } catch { }
                });
            }

            string? facetsJson = null;
            if (record.TryGetValue("facets", out var facetsObj))
            {
                try {
                    facetsJson = System.Text.Json.JsonSerializer.Serialize(facetsObj);
                } catch (Exception ex) {
                    _logger.LogWarning(ex, "Firehose: Failed to serialize facets for {Uri}", uri);
                }
            }

            Guid? replyToPostId = null;
            Guid? rootPostId = null;
            if (TryExtractReplyUris(record, out var parentUri, out var rootUri))
            {
                var parentPost = await FindOrCreateRemotePostStubAsync(parentUri);
                replyToPostId = parentPost?.Id;

                var rootPost = await FindOrCreateRemotePostStubAsync(rootUri ?? parentUri);
                rootPostId = rootPost?.Id;
            }

            var newPost = new Post
            {
                Id = Guid.NewGuid(),
                AuthorId = author.Id,
                Content = record.ContainsKey("text") ? record["text"].ToString() : "" ,
                CreatedAt = record.ContainsKey("createdAt") ? DateTime.Parse(record["createdAt"].ToString() ?? DateTime.UtcNow.ToString()) : DateTime.UtcNow,
                Uri = uri,
                Cid = cid,
                Tid = tid,
                ReplyToPostId = replyToPostId,
                RootPostId = rootPostId,
                FacetsJson = facetsJson,
                IsDeleted = false
            };

            await _unitOfWork.Posts.AddAsync(newPost);
            await _unitOfWork.CompleteAsync();

            // Phase 35: Parse Embeds (Media/Links)
            if (record.TryGetValue("embed", out var embedObj) && embedObj is Dictionary<string, object> embed)
            {
                var type = embed.ContainsKey("$type") ? embed["$type"].ToString() : null;

                if (type == "app.bsky.embed.images" && embed.TryGetValue("images", out var imagesList) && imagesList is List<object> images)
                {
                    int pos = 0;
                    foreach (var imgObj in images)
                    {
                        if (imgObj is Dictionary<string, object> img)
                        {
                            var alt = img.ContainsKey("alt") ? img["alt"].ToString() : "";
                            if (img.TryGetValue("image", out var blobObj) && blobObj is Dictionary<string, object> blob)
                            {
                                string blobCid = "";
                                if (blob.TryGetValue("ref", out var refObj)) {
                                    if (refObj is string s) blobCid = s;
                                    else if (refObj is byte[] bytes) blobCid = ProtocolUtils.Base32Encode(bytes);
                                    else if (refObj is Dictionary<string, object> refDict && refDict.TryGetValue("$link", out var link)) blobCid = link.ToString() ?? "";
                                    else blobCid = refObj.ToString() ?? "";
                                }

                                if (!string.IsNullOrEmpty(blobCid))
                                {
                                    await _unitOfWork.PostMedia.AddAsync(new PostMedium
                                    {
                                        Id = Guid.NewGuid(),
                                        PostId = newPost.Id,
                                        Type = "image",
                                        Url = $"https://cdn.bsky.app/img/feed_fullsize/plain/{did}/{blobCid}@jpeg",
                                        AltText = alt,
                                        Position = pos++,
                                        CreatedAt = DateTime.UtcNow
                                    });
                                }
                            }
                        }
                    }
                }
                else if (type == "app.bsky.embed.video" && embed.TryGetValue("video", out var videoBlobObj) && videoBlobObj is Dictionary<string, object> videoBlob)
                {
                    string videoCid = "";
                    if (videoBlob.TryGetValue("ref", out var refObj)) {
                         if (refObj is string s) videoCid = s;
                         else if (refObj is Dictionary<string, object> refDict && refDict.TryGetValue("$link", out var link)) videoCid = link.ToString() ?? "";
                         else videoCid = refObj.ToString() ?? "";
                    }

                    if (!string.IsNullOrEmpty(videoCid))
                    {
                        await _unitOfWork.PostMedia.AddAsync(new PostMedium
                        {
                            Id = Guid.NewGuid(),
                            PostId = newPost.Id,
                            Type = "video",
                            Url = $"https://video.bsky.app/watch/{did}/{videoCid}/playlist.m3u8",
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }
                else if (type == "app.bsky.embed.external" && embed.TryGetValue("external", out var externalObj) && externalObj is Dictionary<string, object> external)
                {
                    var lp = new LinkPreview
                    {
                        Id = Guid.NewGuid(),
                        PostId = newPost.Id,
                        Url = external.ContainsKey("uri") ? external["uri"].ToString() ?? "" : "",
                        Title = external.ContainsKey("title") ? external["title"].ToString() : null,
                        Description = external.ContainsKey("description") ? external["description"].ToString() : null,
                        CreatedAt = DateTime.UtcNow
                    };

                    if (external.TryGetValue("thumb", out var thumbObj) && thumbObj is Dictionary<string, object> thumb)
                    {
                        string thumbCid = "";
                        if (thumb.TryGetValue("ref", out var refObj)) {
                            if (refObj is string s) thumbCid = s;
                            else if (refObj is Dictionary<string, object> refDict && refDict.TryGetValue("$link", out var link)) thumbCid = link.ToString() ?? "";
                            else thumbCid = refObj.ToString() ?? "";
                        }

                        if (!string.IsNullOrEmpty(thumbCid))
                        {
                             lp.Image = $"https://cdn.bsky.app/img/feed_fullsize/plain/{did}/{thumbCid}@jpeg";
                        }
                    }

                    await _unitOfWork.LinkPreviews.AddAsync(lp);
                }

                await _unitOfWork.CompleteAsync();
            }

            _logger.LogInformation("Firehose: Ingested remote post {Uri}", uri);

            // Real-time notification via SignalR
            try
            {
                var dto = MapToDto(newPost);
                
                // Get followers to notify them in real-time
                var followerIds = await _unitOfWork.Follows.Query()
                    .Where(f => f.FollowingId == author.Id)
                    .Select(f => f.FollowerId.ToString()) // group names are strings
                    .ToListAsync();

                foreach (var followerId in followerIds)
                {
                    await _postHubContext.Clients.Group($"user-{followerId}").SendAsync("newPost", dto);
                }

                // Also push to a global discovery feed if active
                await _postHubContext.Clients.All.SendAsync("newGlobalPost", dto);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "SignalR notification failed for remote post {Uri}", uri);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing remote firehose post");
        }
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

            // 1b. Delete from Repo (Synchronize Federated Content)
            if (post.Author != null && !string.IsNullOrEmpty(post.Author.Did))
            {
                try
                {
                    await _repoManager.DeleteRecordAsync(post.Author.Did, "app.bsky.feed.post", post.Tid);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to delete repo record for post {PostId}", post.Id);
                }
            }

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

            // --- AT Protocol: Delete like record on un-like ---
            try
            {
                var liker = await _unitOfWork.Users.GetByIdAsync(userId);
                if (liker != null && !string.IsNullOrEmpty(liker.Did) && !string.IsNullOrEmpty(existingLike.Tid))
                {
                    var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
                    if (!string.IsNullOrEmpty(token))
                    {
                        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new {
                            repo = liker.Did,
                            collection = "app.bsky.feed.like",
                            rkey = existingLike.Tid
                        }), System.Text.Encoding.UTF8, "application/json");

                        using var httpClient = new HttpClient();
                        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                        await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.repo.deleteRecord", content);
                        
                        _logger.LogInformation("[ToggleLikeAsync] Proxied delete like record {Tid} for user {UserId}", existingLike.Tid, userId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[ToggleLikeAsync] Failed to proxy delete AT like record for user {UserId}", userId);
            }

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
            var newLike = new Like
            {
                PostId = postId,
                UserId = userId,
                Tid = GenerateTid(),
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Likes.AddAsync(newLike);
            isLiked = true;
            post.LikesCount = (post.LikesCount ?? 0) + 1;

            // --- AT Protocol Proxy: Repo Signing for Likes ---
            try
            {
                var liker = await _unitOfWork.Users.GetByIdAsync(userId);
                if (liker != null && !string.IsNullOrEmpty(liker.Did))
                {
                    var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
                    if (!string.IsNullOrEmpty(token))
                    {
                        var likeRecord = new Dictionary<string, object>
                        {
                            { "$type", "app.bsky.feed.like" },
                            { "subject", new Dictionary<string, object> 
                                { 
                                    { "uri", $"at://{post.Author.Did}/app.bsky.feed.post/{post.Tid}" }, 
                                    { "cid", post.Cid ?? post.Tid } 
                                } 
                            },
                            { "createdAt", newLike.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O") }
                        };

                        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new {
                            repo = liker.Did,
                            collection = "app.bsky.feed.like",
                            record = likeRecord
                        }), System.Text.Encoding.UTF8, "application/json");

                        using var httpClient = new HttpClient();
                        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                        var bskyResponse = await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.repo.createRecord", content);

                        if (bskyResponse.IsSuccessStatusCode)
                        {
                            var responseBody = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(await bskyResponse.Content.ReadAsStreamAsync());
                            newLike.Uri = responseBody.GetProperty("uri").GetString();
                            newLike.Cid = responseBody.GetProperty("cid").GetString();
                            newLike.Tid = newLike.Uri?.Split('/').Last() ?? newLike.Tid;
                            Console.WriteLine($"[ToggleLikeAsync] Proxied like to Bluesky for User {userId}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                 Console.WriteLine($"[ToggleLikeAsync] Bluesky Proxy Error: {ex.Message}");
            }

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
                    await SendNotificationAsync(notification.Id);
                }
            }
        }

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

            // --- AT Protocol Proxy: Delete repost record on un-repost ---
            try
            {
                var reposter = await _unitOfWork.Users.GetByIdAsync(userId);
                if (reposter != null && !string.IsNullOrEmpty(reposter.Did) && !string.IsNullOrEmpty(existingRepost.Tid))
                {
                    var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
                    if (!string.IsNullOrEmpty(token))
                    {
                        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new {
                            repo = reposter.Did,
                            collection = "app.bsky.feed.repost",
                            rkey = existingRepost.Tid
                        }), System.Text.Encoding.UTF8, "application/json");

                        using var httpClient = new HttpClient();
                        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                        await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.repo.deleteRecord", content);
                        
                        _logger.LogInformation("[ToggleRepostAsync] Proxied delete repost record {Tid} for user {UserId}", existingRepost.Tid, userId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[ToggleRepostAsync] Failed to proxy delete AT repost record for user {UserId}", userId);
            }

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
            var newRepost = new Repost
            {
                PostId = postId,
                UserId = userId,
                Tid = GenerateTid(),
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Reposts.AddAsync(newRepost);
            isReposted = true;
            post.RepostsCount = (post.RepostsCount ?? 0) + 1;

            // --- AT Protocol Proxy: Repo Signing for Reposts ---
            try
            {
                var reposter = await _unitOfWork.Users.GetByIdAsync(userId);
                if (reposter != null && !string.IsNullOrEmpty(reposter.Did))
                {
                    var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
                    if (!string.IsNullOrEmpty(token))
                    {
                        var repostRecord = new Dictionary<string, object>
                        {
                            { "$type", "app.bsky.feed.repost" },
                            { "subject", new Dictionary<string, object> 
                                { 
                                    { "uri", $"at://{post.Author.Did}/app.bsky.feed.post/{post.Tid}" }, 
                                    { "cid", post.Cid ?? post.Tid } 
                                } 
                            },
                            { "createdAt", newRepost.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O") }
                        };

                        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new {
                            repo = reposter.Did,
                            collection = "app.bsky.feed.repost",
                            record = repostRecord
                        }), System.Text.Encoding.UTF8, "application/json");

                        using var httpClient = new HttpClient();
                        httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                        var bskyResponse = await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.repo.createRecord", content);

                        if (bskyResponse.IsSuccessStatusCode)
                        {
                            var responseBody = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(await bskyResponse.Content.ReadAsStreamAsync());
                            newRepost.Uri = responseBody.GetProperty("uri").GetString();
                            newRepost.Cid = responseBody.GetProperty("cid").GetString();
                            newRepost.Tid = newRepost.Uri?.Split('/').Last() ?? newRepost.Tid;
                            Console.WriteLine($"[ToggleRepostAsync] Proxied repost to Bluesky for User {userId}");
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                 Console.WriteLine($"[ToggleRepostAsync] Bluesky Proxy Error: {ex.Message}");
            }

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
                    await SendNotificationAsync(notification.Id);
                }
            }
        }

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

    public async Task<IEnumerable<PostDto>> GetPostRepliesAsync(Guid postId, Guid? viewerId = null, int skip = 0, int take = 20)
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
            .Skip(skip)
            .Take(take)
            .ToListAsync();

        var replyDtos = replies.Select(MapToDto).ToList();

        if (viewerId.HasValue)
        {
            replyDtos = await EnrichAndFilterPostsAsync(replyDtos, viewerId.Value);
        }

        return replyDtos;
    }

        public async Task<IEnumerable<PostDto>> GetTrendingPostsAsync(Guid? viewerId = null, int skip = 0, int take = 20, List<string>? userInterests = null)
    {
        var cacheKey = $"posts:trending:v3";
        var now = DateTime.UtcNow;

        // 1. Get the "Global Trending Pool" (1000 posts)
        var globalPool = await _cacheService.GetAsync<List<PostDto>>(cacheKey);

        if (globalPool == null)
        {
            try
            {
                var threeDaysAgo = now.AddDays(-3);
                var topPosts = await _unitOfWork.Posts.Query()
                    .Include(p => p.Author)
                    .Include(p => p.PostMedia)
                    .Include(p => p.LinkPreview)
                    .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
                    .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
                    .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                    .Include(p => p.Interests)
                    .Include(p => p.Hashtags)
                    .Where(p => (p.IsDeleted == false || p.IsDeleted == null) && p.ReplyToPostId == null && p.CreatedAt >= threeDaysAgo)
                    .OrderByDescending(p => (double)(p.LikesCount ?? 0) + (double)(p.RepostsCount ?? 0) + (double)(p.RepliesCount ?? 0))
                    .Take(1000)
                    .ToListAsync();

                // Initial Global Scoring (Sorts by hotness once)
                var scoredGlobal = topPosts
                    .Select(p => {
                        var ageInHours = (now - (p.CreatedAt ?? now)).TotalHours;
                        var rawScore = (double)((p.LikesCount ?? 0) * 2 + (p.RepostsCount ?? 0) * 3 + (p.RepliesCount ?? 0));
                        var decayScore = rawScore / Math.Pow(ageInHours + 2, 1.5);
                        return new { Post = p, BaseScore = decayScore };
                    })
                    .OrderByDescending(x => x.BaseScore)
                    .Take(500) // Keep top 500 in global pool
                    .Select(x => MapToDto(x.Post))
                    .ToList();

                globalPool = scoredGlobal;
                await _cacheService.SetAsync(cacheKey, globalPool, TimeSpan.FromMinutes(5));
            }
            catch (Exception ex)
            {
                System.Console.WriteLine($"[PostService] GetTrendingPostsAsync Error: {ex.Message}");
                return new List<PostDto>();
            }
        }

        // 2. Apply Personalization if Interests are provided
        IEnumerable<PostDto> resultPool = globalPool;
        if (userInterests != null && userInterests.Any())
        {
            var normalizedInterests = userInterests.Select(i => i.ToLower()).ToList();
            resultPool = globalPool
                .Select((p, index) => {
                    double boost = 1.0;
                    var tags = p.Tags.Select(t => t.ToLower()).ToList();
                    var interests = p.Interests.Select(i => i.ToLower()).ToList();
                    
                    foreach (var ui in normalizedInterests)
                    {
                        if (tags.Contains(ui) || interests.Contains(ui)) boost += 0.5;
                        else if (p.Content != null && p.Content.ToLower().Contains(ui)) boost += 0.2;
                    }

                    // Score = Inverse original rank * boost
                    // This way a moderately trending post that matches interests can jump to the top
                    double personalizedScore = (500 - index) * boost;
                    return new { Post = p, Score = personalizedScore };
                })
                .OrderByDescending(x => x.Score)
                .Select(x => x.Post);
        }

        var resultDtos = resultPool.Skip(skip).Take(take).ToList();

        if (viewerId.HasValue && resultDtos.Any())
        {
            resultDtos = await EnrichAndFilterPostsAsync(resultDtos, viewerId.Value);
        }

        return resultDtos;
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
            .AsNoTracking()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.Hashtags)
            .AsSplitQuery()
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

    public PostDto MapToDto(Post post)
    {
        try
        {
            if (post == null)
            {
                _logger.LogWarning("[MapToDto] Post object is null!");
                return new PostDto();
            }
            return MapToDto(post, true, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[MapToDto] Error mapping Post {PostId}: {Message}", post?.Id, ex.Message);
            return new PostDto { Id = post?.Id ?? Guid.Empty, Content = post?.Content ?? "" };
        }
    }

    private PostDto MapToDto(Post post, bool includeQuote, bool includeParent)
    {
        var dto = new PostDto
        {
            Id = post.Id,
            Tid = post.Tid,
            Content = post.Content,
            Facets = string.IsNullOrEmpty(post.FacetsJson) 
                ? new List<FacetDto>() 
                : System.Text.Json.JsonSerializer.Deserialize<List<FacetDto>>(post.FacetsJson, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<FacetDto>(),
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
                Type = m.Type,
                ThumbnailUrl = m.ThumbnailUrl,
                Cid = m.Cid
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
            Cid = post.Cid ?? post.Id.ToString(),
            Viewer = new PostViewerDto()
        };

        if (post.Author != null)
        {
            dto.Author.Viewer = new AuthorViewerDto();
        }

        return dto;
    }

    private void MapEmbedToDto(PostDto dto, JsonElement embed)
    {
        if (embed.ValueKind == JsonValueKind.Null) return;

        string? type = embed.TryGetProperty("$type", out var t) ? t.GetString() : null;

        if (type == "app.bsky.embed.images#view" || embed.TryGetProperty("images", out _))
        {
            var images = new List<string>();
            var media = new List<MediaDto>();
            if (embed.TryGetProperty("images", out var imgs))
            {
                foreach (var img in imgs.EnumerateArray())
                {
                    string thumb = img.TryGetProperty("thumb", out var th) ? th.GetString() ?? "" : "";
                    string full = img.TryGetProperty("fullsize", out var f) ? f.GetString() ?? "" : "";
                    string alt = img.TryGetProperty("alt", out var a) ? a.GetString() ?? "" : "";
                    
                    images.Add(full);
                    media.Add(new MediaDto
                    {
                        Url = thumb,
                        AltText = alt,
                        Type = "image",
                        Cid = img.TryGetProperty("cid", out var c) ? c.GetString() : null
                    });
                }
            }
            dto.ImageUrls = images;
            dto.Media = media;
        }
        else if (type == "app.bsky.embed.video#view" || embed.TryGetProperty("playlist", out _))
        {
            dto.VideoUrl = embed.TryGetProperty("playlist", out var p) ? p.GetString() : null;
            if (embed.TryGetProperty("thumbnail", out var th))
            {
                dto.Media = new List<MediaDto> { 
                    new MediaDto { 
                        Url = th.GetString() ?? "", 
                        Type = "video",
                        AltText = embed.TryGetProperty("alt", out var a) ? a.GetString() : null
                    } 
                };
            }
        }
        else if (type == "app.bsky.embed.external#view" || embed.TryGetProperty("external", out _))
        {
            if (embed.TryGetProperty("external", out var ext))
            {
                dto.LinkPreview = new LinkPreviewDto
                {
                    Url = ext.TryGetProperty("uri", out var u) ? u.GetString() ?? "" : "",
                    Title = ext.TryGetProperty("title", out var ti) ? ti.GetString() ?? "" : "",
                    Description = ext.TryGetProperty("description", out var ds) ? ds.GetString() ?? "" : "",
                    Image = ext.TryGetProperty("thumb", out var th) ? th.GetString() : null,
                    Domain = "" // Calculated on frontend or here
                };
                if (!string.IsNullOrEmpty(dto.LinkPreview.Url))
                {
                    try { dto.LinkPreview.Domain = new Uri(dto.LinkPreview.Url).Host; } catch { }
                }
            }
        }
        else if (type == "app.bsky.embed.recordWithMedia#view" || embed.TryGetProperty("media", out _))
        {
            if (embed.TryGetProperty("media", out var media))
            {
                MapEmbedToDto(dto, media);
            }
        }
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

        public async Task<(string path, string cid, string? thumbnail)> SaveBlobAsync(Stream stream, string contentType, string folder)
        {
            using var ms = new MemoryStream();
            await stream.CopyToAsync(ms);
            var data = ms.ToArray();
            var cid = ProtocolUtils.GenerateCid(data, 0x55); // Use 'raw' multicodec for blobs

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

            var fileName = $"{cid}{extension}";
            var filePath = Path.Combine(uploadsRoot, fileName);

            if (!File.Exists(filePath))
            {
                await File.WriteAllBytesAsync(filePath, data);
            }

            string? thumbnailPath = null;
            if (contentType.StartsWith("image/"))
            {
                thumbnailPath = await GenerateThumbnailAsync(filePath);
            }

            return ($"/uploads/{folder}/{fileName}", cid, thumbnailPath);
        }

        private async Task<(string path, string cid, string? thumbnail)> SaveFileAsync(IFormFile file, string folder)
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
        var cacheKey = $"posts:discover:{userId}:{limit}:{skip}";
        var cachedResult = await _cacheService.GetAsync<IEnumerable<PostDto>>(cacheKey);
        if (cachedResult != null) return cachedResult;

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
                .OrderByDescending(p => p.CreatedAt) // Order by Recency first, then score
                .Take(500) // Reduced pool size from 5000 to 500 for massive performance gain
                .ToListAsync();
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[PostService] GetDiscoverPostsAsync: Error fetching post pool: {ex.Message}");
            return await GetTrendingPosts24hAsync(userId, limit, skip);
        }

        // 3. Score and rank posts
        // 3. Score and rank posts in parallel
        var scoredPosts = new System.Collections.Concurrent.ConcurrentBag<(Post Post, float Score)>();
        var random = new Random();

        var scoringTasks = postPool.Select(async post =>
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
            score += ((post.LikesCount ?? 0) * 1.0f) + ((post.RepostsCount ?? 0) * 2.0f);

            // Recency Score (decay)
            var hoursOld = (DateTime.UtcNow - (post.CreatedAt ?? DateTime.UtcNow)).TotalHours;
            var recencyFactor = (float)Math.Exp(-hoursOld / 168.0); // 7 days half-life for Discover
            score *= recencyFactor;

            // Add a small random factor to provide variety
            var varietyBoost = (float)random.NextDouble() * 10.0f; 
            score += varietyBoost;

            // Include either interest matches, or highly engaging trending posts, or fresh posts
            if (matchedInterest || score > 1.0f || hoursOld < 168.0)
            {
                scoredPosts.Add((post, score));
            }
        });

        await Task.WhenAll(scoringTasks);

        // 4. Return top ranked posts
        var result = scoredPosts
            .OrderByDescending(x => x.Score)
            .Skip(skip)
            .Take(limit)
            .Select(x => MapToDto(x.Post))
            .ToList();

        var enriched = await EnrichAndFilterPostsAsync(result, userId);
        await _cacheService.SetAsync(cacheKey, enriched, TimeSpan.FromMinutes(5));
        return enriched;
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

    private async Task<List<Dictionary<string, object>>> GetFacetsAsync(string text)
    {
        var facets = new List<Dictionary<string, object>>();
        var utf8Bytes = System.Text.Encoding.UTF8.GetBytes(text);

        // 1. Mentions (@handle)
        var mentionMatches = System.Text.RegularExpressions.Regex.Matches(text, @"(?:^|\s)@([a-zA-Z0-9.-]+)");
        foreach (System.Text.RegularExpressions.Match match in mentionMatches)
        {
            var handle = match.Groups[1].Value;
            var user = await _unitOfWork.Users.GetByHandleAsync($"{handle}.bsky.social") ?? await _unitOfWork.Users.GetByHandleAsync(handle);
            
            if (user != null && !string.IsNullOrEmpty(user.Did))
            {
                int charStart = match.Groups[1].Index - 1; // Include the '@'
                int charEnd = match.Groups[1].Index + match.Groups[1].Length;
                int byteStart = System.Text.Encoding.UTF8.GetByteCount(text.Substring(0, charStart));
                int byteEnd = byteStart + System.Text.Encoding.UTF8.GetByteCount(text.Substring(charStart, charEnd - charStart));

                facets.Add(new Dictionary<string, object>
                {
                    { "index", new Dictionary<string, object> { { "byteStart", byteStart }, { "byteEnd", byteEnd } } },
                    { "features", new List<Dictionary<string, object>> { new Dictionary<string, object> { { "$type", "app.bsky.richtext.facet#mention" }, { "did", user.Did } } } }
                });
            }
        }

        // 2. Links (http/https)
        var linkMatches = System.Text.RegularExpressions.Regex.Matches(text, @"(?:^|\s)(https?://[^\s]+)");
        foreach (System.Text.RegularExpressions.Match match in linkMatches)
        {
            var url = match.Groups[1].Value;
            int charStart = match.Groups[1].Index;
            int charEnd = charStart + match.Groups[1].Length;
            int byteStart = System.Text.Encoding.UTF8.GetByteCount(text.Substring(0, charStart));
            int byteEnd = byteStart + System.Text.Encoding.UTF8.GetByteCount(text.Substring(charStart, charEnd - charStart));

            facets.Add(new Dictionary<string, object>
            {
                { "index", new Dictionary<string, object> { { "byteStart", byteStart }, { "byteEnd", byteEnd } } },
                { "features", new List<Dictionary<string, object>> { new Dictionary<string, object> { { "$type", "app.bsky.richtext.facet#link" }, { "uri", url } } } }
            });
        }

        return facets.OrderBy(f => ((Dictionary<string, object>)f["index"])["byteStart"]).ToList();
    }

    /// <summary>
    /// Called by FirehoseService when a remote Like/Repost of a local post is detected.
    /// Only updates the count if the subject AT URI belongs to a local post (i.e., the post is in our DB).
    /// Fire-and-forget safe: all exceptions are swallowed.
    /// </summary>
    public async Task IncrementRemoteInteractionAsync(string? subjectUri, string type, int delta,
        string? actorDid = null, string? recordPath = null)
    {
        try
        {
            if (string.IsNullOrEmpty(subjectUri)) return;

            // Only process URIs that reference local posts.
            // Local posts have URIs like: at://<localDid>/app.bsky.feed.post/<tid>
            var post = await _unitOfWork.Posts.Query()
                .FirstOrDefaultAsync(p => p.Uri == subjectUri || 
                                          (p.Tid != null && subjectUri.EndsWith("/" + p.Tid)));

            if (post == null)
            {
                _logger.LogTrace("[Firehose] IncrementRemoteInteraction: No local post for URI {Uri}", subjectUri);
                return;
            }

            if (type == "like")
            {
                post.LikesCount = Math.Max(0, (post.LikesCount ?? 0) + delta);
            }
            else if (type == "repost")
            {
                post.RepostsCount = Math.Max(0, (post.RepostsCount ?? 0) + delta);
            }

            _unitOfWork.Posts.Update(post);
            await _unitOfWork.CompleteAsync();

            _logger.LogInformation("[Firehose] Incremented {Type} by {Delta} for local post {PostId}", type, delta, post.Id);

            // Broadcast the updated counts via SignalR for real-time UI sync
            await _postHubContext.Clients.All.SendAsync("UpdatePostStats", new
            {
                postId = post.Id,
                uri = post.Uri,
                likesCount = post.LikesCount,
                repostsCount = post.RepostsCount,
                bookmarksCount = post.BookmarksCount,
                repliesCount = post.RepliesCount,
                quotesCount = post.QuotesCount,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Firehose] IncrementRemoteInteractionAsync failed for URI {Uri}", subjectUri);
        }
    }

    private async Task<string?> GenerateThumbnailAsync(string fullPath)
    {
        try
        {
            var fileName = Path.GetFileName(fullPath);
            var folder = Path.GetFileName(Path.GetDirectoryName(fullPath));
            
            var thumbDirectory = Path.Combine(_environment.WebRootPath, "uploads", "thumbnails", folder);
            if (!Directory.Exists(thumbDirectory)) Directory.CreateDirectory(thumbDirectory);

            var thumbPath = Path.Combine(thumbDirectory, fileName);

            if (!File.Exists(thumbPath))
            {
                using (var image = await Image.LoadAsync(fullPath))
                {
                    image.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Size = new Size(400, 400),
                        Mode = ResizeMode.Max
                    }));
                    await image.SaveAsync(thumbPath);
                }
            }

            return $"/uploads/thumbnails/{folder}/{fileName}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating thumbnail for {FullPath}", fullPath);
            return null;
        }
    }

    private bool TryExtractReplyUris(JsonElement record, out string? parentUri, out string? rootUri)
    {
        parentUri = null;
        rootUri = null;

        if (!record.TryGetProperty("reply", out var replyElement))
        {
            return false;
        }

        if (replyElement.TryGetProperty("parent", out var parentElement) &&
            parentElement.TryGetProperty("uri", out var parentUriElement))
        {
            parentUri = parentUriElement.GetString();
        }

        if (replyElement.TryGetProperty("root", out var rootElement) &&
            rootElement.TryGetProperty("uri", out var rootUriElement))
        {
            rootUri = rootUriElement.GetString();
        }

        return !string.IsNullOrWhiteSpace(parentUri);
    }

    private bool TryExtractReplyUris(Dictionary<string, object> record, out string? parentUri, out string? rootUri)
    {
        parentUri = null;
        rootUri = null;

        if (!record.TryGetValue("reply", out var replyObj) || replyObj is not Dictionary<string, object> replyDict)
        {
            return false;
        }

        if (replyDict.TryGetValue("parent", out var parentObj) && parentObj is Dictionary<string, object> parentDict)
        {
            parentUri = TryGetUriValue(parentDict);
        }

        if (replyDict.TryGetValue("root", out var rootObj) && rootObj is Dictionary<string, object> rootDict)
        {
            rootUri = TryGetUriValue(rootDict);
        }

        return !string.IsNullOrWhiteSpace(parentUri);
    }

    private static string? TryGetUriValue(Dictionary<string, object> node)
    {
        if (node.TryGetValue("uri", out var uriValue))
        {
            return uriValue?.ToString();
        }

        return null;
    }

    private async Task<Post?> FindOrCreateRemotePostStubAsync(string? atUri)
    {
        if (string.IsNullOrWhiteSpace(atUri))
        {
            return null;
        }

        var existingPost = await _unitOfWork.Posts.Query()
            .FirstOrDefaultAsync(p => p.Uri == atUri);
        if (existingPost != null)
        {
            return existingPost;
        }

        var segments = atUri.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 4)
        {
            return null;
        }

        var did = segments[1];
        var tid = segments[^1];

        var author = await _unitOfWork.Users.Query()
            .FirstOrDefaultAsync(u => u.Did == did);
        if (author == null)
        {
            author = new User
            {
                Id = Guid.NewGuid(),
                Did = did,
                Handle = did,
                Username = did.Length > 20 ? did.Substring(0, 20) : did,
                Email = $"{did}@placeholder.com",
                PasswordHash = "remote",
                Salt = "remote",
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Users.AddAsync(author);
        }

        var stubPost = new Post
        {
            Id = Guid.NewGuid(),
            AuthorId = author.Id,
            Tid = tid,
            Uri = atUri,
            Content = string.Empty,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _unitOfWork.Posts.AddAsync(stubPost);
        await _unitOfWork.CompleteAsync();
        return stubPost;
    }

    public async Task IngestThreadRecursiveAsync(Newtonsoft.Json.Linq.JToken? node)
    {
        if (node == null) return;

        // 1. Ingest the current post
        var postNode = node["post"];
        if (postNode != null)
        {
            await IngestPostNodeAsync(postNode);
        }

        // 2. Recursively ingest parent
        var parentNode = node["parent"];
        if (parentNode != null && parentNode["post"] != null)
        {
            await IngestThreadRecursiveAsync(parentNode);
        }

        // 3. Recursively ingest replies
        var replies = node["replies"];
        if (replies != null && replies.Type == Newtonsoft.Json.Linq.JTokenType.Array)
        {
            foreach (var reply in replies)
            {
                await IngestThreadRecursiveAsync(reply);
            }
        }
    }

    private async Task<Guid?> IngestPostNodeAsync(Newtonsoft.Json.Linq.JToken? postNode)
    {
        if (postNode == null) return null;

        var uri = postNode["uri"]?.ToString();
        var cid = postNode["cid"]?.ToString();
        if (string.IsNullOrEmpty(uri)) return null;

        var existing = await _unitOfWork.Posts.Query().FirstOrDefaultAsync(p => p.Uri == uri || p.Cid == cid);
        if (existing != null && !string.IsNullOrEmpty(existing.Content)) 
            return existing.Id;

        var authorNode = postNode["author"];
        if (authorNode == null) return null;

        var did = authorNode["did"]?.ToString();
        if (string.IsNullOrEmpty(did)) return null;

        var author = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
        if (author == null)
        {
            var stubHandle = authorNode["handle"]?.ToString() ?? did;
            author = new User
            {
                Id = Guid.NewGuid(),
                Did = did,
                Handle = stubHandle,
                Username = stubHandle.Contains('.') ? stubHandle.Split('.').First() : (stubHandle.Length > 20 ? stubHandle.Substring(0, 20) : stubHandle),
                DisplayName = authorNode["displayName"]?.ToString(),
                AvatarUrl = authorNode["avatar"]?.ToString(),
                IsVerified = true,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.Users.AddAsync(author);
            await _unitOfWork.CompleteAsync();
        }

        var recordNode = postNode["record"];
        if (recordNode == null) return null;

        Guid? replyToPostId = null;
        Guid? rootPostId = null;

        // Extract reply info from record if available
        if (recordNode["reply"] != null)
        {
            var parentUri = recordNode["reply"]["parent"]?["uri"]?.ToString();
            var rootUri = recordNode["reply"]["root"]?["uri"]?.ToString();

            if (!string.IsNullOrEmpty(parentUri))
            {
                var parentPost = await FindOrCreateRemotePostStubAsync(parentUri);
                replyToPostId = parentPost?.Id;
            }

            if (!string.IsNullOrEmpty(rootUri))
            {
                var rootPost = await FindOrCreateRemotePostStubAsync(rootUri);
                rootPostId = rootPost?.Id;
            }
        }

        var post = existing ?? new Post { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow };
        post.AuthorId = author.Id;
        post.Uri = uri;
        post.Cid = cid;
        post.Tid = uri.Split('/').Last();
        post.Content = recordNode["text"]?.ToString() ?? "";
        post.ReplyToPostId = replyToPostId;
        post.RootPostId = rootPostId;
        post.LikesCount = postNode["likeCount"]?.ToObject<int>() ?? 0;
        post.RepostsCount = postNode["repostCount"]?.ToObject<int>() ?? 0;
        post.RepliesCount = postNode["replyCount"]?.ToObject<int>() ?? 0;
        post.IsDeleted = false;

        if (existing == null)
        {
            await _unitOfWork.Posts.AddAsync(post);
        }
        else
        {
            _unitOfWork.Posts.Update(post);
        }

        await _unitOfWork.CompleteAsync();
        return post.Id;
    }
}