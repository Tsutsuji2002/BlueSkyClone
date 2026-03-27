using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using BSkyClone.Utilities;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using BSkyClone.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;
using DnsClient;
using System.Net.Http;
using System.Text.Json;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;

namespace BSkyClone.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ICacheService _cacheService;
    private readonly ISearchService _searchService;
    private readonly IFileService _fileService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IDidResolver _didResolver;
    private readonly IRepoManager _repoManager;
    private readonly ILogger<UserService> _logger;
    private readonly IConfiguration _configuration;

    public UserService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, IHubContext<ChatHub> hubContext, ICacheService cacheService, ISearchService searchService, IFileService fileService, IRepoManager repoManager, IHttpClientFactory httpClientFactory, IDidResolver didResolver, ILogger<UserService> logger, IConfiguration configuration)
    {
        _unitOfWork = unitOfWork;
        _environment = environment;
        _hubContext = hubContext;
        _cacheService = cacheService;
        _searchService = searchService;
        _fileService = fileService;
        _repoManager = repoManager;
        _httpClientFactory = httpClientFactory;
        _didResolver = didResolver;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<User?> GetUserByIdAsync(Guid id)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user != null)
        {
            if (!string.IsNullOrEmpty(user.Did))
            {
                // Try to get live count from cache or proxy (simplified here for brevity, usually fetched during feed load)
                // For now, if it's a network user, we prioritize the local sync, 
                // but ideally we should fetch from app.bsky.actor.getProfile
            }
            user.PostsCount = await _unitOfWork.Posts.Query().CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);
        }
        return user;
    }

    public async Task<IEnumerable<User>> GetUsersByIdsAsync(IEnumerable<Guid> userIds)
    {
        var ids = userIds.Distinct().ToList();
        if (!ids.Any()) return new List<User>();

        return await _unitOfWork.Users.Query()
            .AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToListAsync();
    }

    public async Task<User?> GetUserByHandleAsync(string handle)
    {
        var user = await _unitOfWork.Users.GetByHandleAsync(handle);
        if (user != null)
        {
            user.PostsCount = await _unitOfWork.Posts.Query().CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);
        }
        return user;
    }

    public async Task<User?> GetUserByUsernameAsync(string username)
    {
        var user = await _unitOfWork.Users.GetByUsernameAsync(username);
        if (user != null)
        {
            user.PostsCount = await _unitOfWork.Posts.Query().CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);
        }
        return user;
    }

    public async Task<User?> GetUserByDidAsync(string did)
    {
        var user = await _unitOfWork.Users.GetByDidAsync(did);
        if (user != null)
        {
            user.PostsCount = await _unitOfWork.Posts.Query().CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);
        }
        return user;
    }

    public async Task<User> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null)
        {
            throw new Exception("User not found");
        }

        if (!string.IsNullOrEmpty(request.DisplayName)) user.DisplayName = request.DisplayName;
        if (request.Bio != null) user.Bio = request.Bio;
        if (request.Location != null) user.Location = request.Location;
        if (request.Website != null) user.Website = request.Website;

        // Handle Avatar: remove, upload new, or keep existing
        if (request.RemoveAvatar)
        {
            if (!string.IsNullOrEmpty(user.AvatarUrl))
            {
                _fileService.DeleteFile(user.AvatarUrl);
            }
            user.AvatarUrl = null;
        }
        else if (request.Avatar != null)
        {
            // Delete old one if exists
            if (!string.IsNullOrEmpty(user.AvatarUrl))
            {
                _fileService.DeleteFile(user.AvatarUrl);
            }
            
            // Resize Avatar to 400x400
            using var stream = request.Avatar.OpenReadStream();
            using var image = await Image.LoadAsync(stream);
            image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(400, 400), Mode = ResizeMode.Crop }));
            using var outStream = new MemoryStream();
            await image.SaveAsJpegAsync(outStream, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 85 });
            outStream.Position = 0;
            
            var avatarPath = await SaveFileAsync(outStream, request.Avatar.FileName, "avatars");
            user.AvatarUrl = avatarPath;
        }

        // Handle Cover Image: remove, upload new, or keep existing
        if (request.RemoveCoverImage)
        {
            if (!string.IsNullOrEmpty(user.CoverImageUrl))
            {
                _fileService.DeleteFile(user.CoverImageUrl);
            }
            user.CoverImageUrl = null;
        }
        else if (request.CoverImage != null)
        {
            // Delete old one if exists
            if (!string.IsNullOrEmpty(user.CoverImageUrl))
            {
                _fileService.DeleteFile(user.CoverImageUrl);
            }
            
            // Resize Banner to 1500x500
            using var stream = request.CoverImage.OpenReadStream();
            using var image = await Image.LoadAsync(stream);
            image.Mutate(x => x.Resize(new ResizeOptions { Size = new Size(1500, 500), Mode = ResizeMode.Crop }));
            using var outStream = new MemoryStream();
            await image.SaveAsJpegAsync(outStream, new SixLabors.ImageSharp.Formats.Jpeg.JpegEncoder { Quality = 85 });
            outStream.Position = 0;

            var coverPath = await SaveFileAsync(outStream, request.CoverImage.FileName, "covers");
            user.CoverImageUrl = coverPath;
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

        // --- Phase 4: Repo Signing for Profile Updates ---
        try
        {
            if (!string.IsNullOrEmpty(user.Did))
            {
                var profileRecord = new Dictionary<string, object>
                {
                    { "$type", "app.bsky.actor.profile" }
                };

                if (!string.IsNullOrEmpty(user.DisplayName)) profileRecord.Add("displayName", user.DisplayName);
                if (!string.IsNullOrEmpty(user.Bio)) profileRecord.Add("description", user.Bio);
                
                // --- AT Protocol Blobs for Profile Images ---
                if (!string.IsNullOrEmpty(user.AvatarUrl))
                {
                    try
                    {
                        string fullPath = Path.Combine(_environment.WebRootPath, user.AvatarUrl.TrimStart('/'));
                        if (File.Exists(fullPath))
                        {
                            using var stream = File.OpenRead(fullPath);
                            string mimeType = "image/jpeg";
                            if (user.AvatarUrl.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) mimeType = "image/png";
                            
                            var blobCid = await _repoManager.UploadBlobAsync(user.Did, stream, mimeType);
                            profileRecord["avatar"] = new Dictionary<string, object>
                            {
                                { "$type", "blob" },
                                { "ref", new Dictionary<string, object> { { "$link", blobCid } } },
                                { "mimeType", mimeType },
                                { "size", (int)new FileInfo(fullPath).Length }
                            };
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"[UpdateProfileAsync] Avatar Blob error: {ex.Message}"); }
                }

                if (!string.IsNullOrEmpty(user.CoverImageUrl))
                {
                    try
                    {
                        string fullPath = Path.Combine(_environment.WebRootPath, user.CoverImageUrl.TrimStart('/'));
                        if (File.Exists(fullPath))
                        {
                            using var stream = File.OpenRead(fullPath);
                            string mimeType = "image/jpeg";
                            if (user.CoverImageUrl.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) mimeType = "image/png";

                            var blobCid = await _repoManager.UploadBlobAsync(user.Did, stream, mimeType);
                            profileRecord["banner"] = new Dictionary<string, object>
                            {
                                { "$type", "blob" },
                                { "ref", new Dictionary<string, object> { { "$link", blobCid } } },
                                { "mimeType", mimeType },
                                { "size", (int)new FileInfo(fullPath).Length }
                            };
                        }
                    }
                    catch (Exception ex) { Console.WriteLine($"[UpdateProfileAsync] Banner Blob error: {ex.Message}"); }
                }

                // 3. Create Record on Bluesky PDS
                var token = await _cacheService.GetAsync<string>($"BlueskyToken_{userId}");
                if (!string.IsNullOrEmpty(token))
                {
                    using var client = new HttpClient();
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    var bskyResponse = await client.PostAsync("https://bsky.social/xrpc/com.atproto.repo.createRecord", 
                        new StringContent(JsonSerializer.Serialize(new { repo = user.Did, collection = "app.bsky.actor.profile", record = profileRecord }), Encoding.UTF8, "application/json"));

                    if (bskyResponse.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"[UpdateProfileAsync] Proxied profile update to Bluesky for User {userId}");
                    }
                    else
                    {
                        var error = await bskyResponse.Content.ReadAsStringAsync();
                        Console.WriteLine($"[UpdateProfileAsync] Bluesky Profile Update Failed: {bskyResponse.StatusCode} - {error}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
             Console.WriteLine($"[UpdateProfileAsync] Profile Repo Signing Error: {ex.Message}");
        }

        // Index in Elasticsearch
        await _searchService.IndexUserAsync(user);

        return user;
    }

    public async Task<User> UpdateAccountAsync(Guid userId, UpdateAccountRequest request)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null)
        {
            throw new Exception("User not found");
        }

        // Sensitive changes REQUIRE current password verification
        bool sensitiveChange = !string.IsNullOrEmpty(request.Email) || !string.IsNullOrEmpty(request.NewPassword);
        if (sensitiveChange)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword) || !BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                throw new Exception("Incorrect current password");
            }
        }

        // Update Email
        if (!string.IsNullOrWhiteSpace(request.Email) && request.Email != user.Email)
        {
            var existing = await _unitOfWork.Users.GetByEmailAsync(request.Email);
            if (existing != null) throw new Exception("Email already in use");
            user.Email = request.Email;
        }

        // Update Username / Handle
        if (!string.IsNullOrWhiteSpace(request.Username) && request.Username.ToLower() != user.Username)
        {
            var username = request.Username.Trim().ToLower();
            if (username.Length > 16 || !Regex.IsMatch(username, @"^[a-z0-9.]+$"))
            {
                throw new Exception("Handle can only contain lowercase Latin characters, numbers, and dots, and be maximum 16 characters long.");
            }

            var newHandle = $"{username}.bsky.social";
            var existing = await _unitOfWork.Users.GetByHandleAsync(newHandle);
            if (existing != null) throw new Exception("Username already in use");
            
            user.Username = username;
            user.Handle = newHandle;
        }

        // Update Password
        if (!string.IsNullOrWhiteSpace(request.NewPassword))
        {
            var salt = BCrypt.Net.BCrypt.GenerateSalt();
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, salt);
            user.Salt = salt;
        }

        // Update Date of Birth
        if (request.DateOfBirth != null) // Explicitly check for null vs empty string
        {
            if (string.IsNullOrWhiteSpace(request.DateOfBirth))
            {
                user.DateOfBirth = null;
            }
            else if (DateTime.TryParse(request.DateOfBirth, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out var dob))
            {
                user.DateOfBirth = dob;
            }
        }

        _unitOfWork.Users.Update(user); // Force entity state to Modified
        await _unitOfWork.CompleteAsync();

        _unitOfWork.Users.Update(user); // Force entity state to Modified
        await _unitOfWork.CompleteAsync();

        // Index in Elasticsearch
        await _searchService.IndexUserAsync(user);

        return user;
    }

    public async Task<UserSetting> UpdateSettingsAsync(Guid userId, UserSettingDto request)
    {
        User? user = null;
        try
        {
            user = await _unitOfWork.Users.Query()
                .Include(u => u.UserSetting)
                .FirstOrDefaultAsync(u => u.Id == userId);
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[UserService] UpdateSettingsAsync: Error fetching User + settings: {ex.Message}");
            // Critical failure if we can't even get the user, but let's try to get user without settings as fallback
            user = await _unitOfWork.Users.GetByIdAsync(userId);
        }

        if (user == null) throw new Exception("User not found");

        if (user.UserSetting == null)
        {
            user.UserSetting = new UserSetting { UserId = userId };
        }

        var s = user.UserSetting;
        if (request.AdultContentFilter != null) s.AdultContentFilter = request.AdultContentFilter;
        if (request.EnableAdultContent != null) s.EnableAdultContent = request.EnableAdultContent;
        if (request.SortReplies != null) s.SortReplies = request.SortReplies;
        if (request.RequireAltText != null) s.RequireAltText = request.RequireAltText;
        if (request.AutoplayVideoGif != null) s.AutoplayVideoGif = request.AutoplayVideoGif;
        if (request.AppLanguage != null) s.AppLanguage = request.AppLanguage;
        if (request.ThemeMode != null) s.ThemeMode = request.ThemeMode;
        if (request.FontSize != null) s.FontSize = request.FontSize;
        if (request.EnableTrending != null) s.EnableTrending = request.EnableTrending;
        if (request.EnableDiscoverVideo != null) s.EnableDiscoverVideo = request.EnableDiscoverVideo;
        if (request.EnableTreeView != null) s.EnableTreeView = request.EnableTreeView;
        if (request.RequireLogoutVisibility != null) s.RequireLogoutVisibility = request.RequireLogoutVisibility;
        if (request.LargerAltBadge != null) s.LargerAltBadge = request.LargerAltBadge;
        
        if (request.ShowReplies != null) s.ShowReplies = request.ShowReplies;
        if (request.ShowReposts != null) s.ShowReposts = request.ShowReposts;
        if (request.ShowQuotePosts != null) s.ShowQuotePosts = request.ShowQuotePosts;
        if (request.ShowSampleSavedFeeds != null) s.ShowSampleSavedFeeds = request.ShowSampleSavedFeeds;
        if (request.EnabledMediaProviders != null) s.EnabledMediaProviders = request.EnabledMediaProviders;

        // Notification toggles
        if (request.NotifyLikes != null) s.NotifyLikes = request.NotifyLikes;
        if (request.NotifyFollowers != null) s.NotifyFollowers = request.NotifyFollowers;
        if (request.NotifyReplies != null) s.NotifyReplies = request.NotifyReplies;
        if (request.NotifyMentions != null) s.NotifyMentions = request.NotifyMentions;
        if (request.NotifyQuotes != null) s.NotifyQuotes = request.NotifyQuotes;
        if (request.NotifyReposts != null) s.NotifyReposts = request.NotifyReposts;

        // Push
        if (request.PushNotifyLikes != null) s.PushNotifyLikes = request.PushNotifyLikes;
        if (request.PushNotifyFollowers != null) s.PushNotifyFollowers = request.PushNotifyFollowers;
        if (request.PushNotifyReplies != null) s.PushNotifyReplies = request.PushNotifyReplies;
        if (request.PushNotifyMentions != null) s.PushNotifyMentions = request.PushNotifyMentions;
        if (request.PushNotifyQuotes != null) s.PushNotifyQuotes = request.PushNotifyQuotes;
        if (request.PushNotifyReposts != null) s.PushNotifyReposts = request.PushNotifyReposts;

        // In-App
        if (request.InAppNotifyLikes != null) s.InAppNotifyLikes = request.InAppNotifyLikes;
        if (request.InAppNotifyFollowers != null) s.InAppNotifyFollowers = request.InAppNotifyFollowers;
        if (request.InAppNotifyReplies != null) s.InAppNotifyReplies = request.InAppNotifyReplies;
        if (request.InAppNotifyMentions != null) s.InAppNotifyMentions = request.InAppNotifyMentions;
        if (request.InAppNotifyQuotes != null) s.InAppNotifyQuotes = request.InAppNotifyQuotes;
        if (request.InAppNotifyReposts != null) s.InAppNotifyReposts = request.InAppNotifyReposts;

        // Extended notification settings
        if (request.NotifyActivity != null) s.NotifyActivity = request.NotifyActivity;
        if (request.PushNotifyActivity != null) s.PushNotifyActivity = request.PushNotifyActivity;
        if (request.InAppNotifyActivity != null) s.InAppNotifyActivity = request.InAppNotifyActivity;
        if (request.NotifyLikesOfReposts != null) s.NotifyLikesOfReposts = request.NotifyLikesOfReposts;
        if (request.PushNotifyLikesOfReposts != null) s.PushNotifyLikesOfReposts = request.PushNotifyLikesOfReposts;
        if (request.InAppNotifyLikesOfReposts != null) s.InAppNotifyLikesOfReposts = request.InAppNotifyLikesOfReposts;
        if (request.NotifyRepostsOfReposts != null) s.NotifyRepostsOfReposts = request.NotifyRepostsOfReposts;
        if (request.PushNotifyRepostsOfReposts != null) s.PushNotifyRepostsOfReposts = request.PushNotifyRepostsOfReposts;
        if (request.InAppNotifyRepostsOfReposts != null) s.InAppNotifyRepostsOfReposts = request.InAppNotifyRepostsOfReposts;
        if (request.NotifyOthers != null) s.NotifyOthers = request.NotifyOthers;
        if (request.PushNotifyOthers != null) s.PushNotifyOthers = request.PushNotifyOthers;
        if (request.InAppNotifyOthers != null) s.InAppNotifyOthers = request.InAppNotifyOthers;

        if (request.DefaultReplyRestriction != null)
        {
            s.DefaultReplyRestriction = request.DefaultReplyRestriction;
            
            // Proactively update existing posts to match the new default to meet user expectations of a "global" setting.
            var postsToUpdate = await _unitOfWork.Posts.Query()
                .Where(p => p.AuthorId == userId && (p.IsDeleted == false || p.IsDeleted == null))
                .ToListAsync();
            
            foreach (var post in postsToUpdate)
            {
                post.ReplyRestriction = request.DefaultReplyRestriction;
            }
        }
        if (request.DefaultAllowQuotes != null)
        {
            s.DefaultAllowQuotes = request.DefaultAllowQuotes;
            
            var postsToUpdate = await _unitOfWork.Posts.Query()
                .Where(p => p.AuthorId == userId && (p.IsDeleted == false || p.IsDeleted == null))
                .ToListAsync();
            
            foreach (var post in postsToUpdate)
            {
                post.AllowQuotes = request.DefaultAllowQuotes;
            }
        }

        await _unitOfWork.CompleteAsync();
        return s;
    }


    public async Task<string?> FollowUserAsync(Guid followerId, Guid followingId)
    {
        if (followerId == followingId) return null;

        var lockKey = $"lock:follow:{followerId}:{followingId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
            return null;
        }

        try
        {
            var existing = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (existing != null) return existing.Uri;

        var follower = await _unitOfWork.Users.GetByIdAsync(followerId);
        var following = await _unitOfWork.Users.GetByIdAsync(followingId);

        if (follower == null || following == null) return null;

        var follow = new UserFollow
        {
            FollowerId = followerId,
            FollowingId = followingId,
            Tid = ProtocolUtils.GenerateTid(),
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Follows.AddAsync(follow);
        
        follower.FollowingCount++;
        following.FollowersCount++;

        // --- Phase 4: Repo Signing for Follows ---
        try
        {
            if (!string.IsNullOrEmpty(follower.Did) && !string.IsNullOrEmpty(following.Did))
            {
                var followRecord = new Dictionary<string, object>
                {
                    { "$type", "app.bsky.graph.follow" },
                    { "subject", following.Did },
                    { "createdAt", follow.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O") }
                };
                
                // 1. Proxy to Bluesky PDS
                var token = await _cacheService.GetAsync<string>($"BlueskyToken_{followerId}");
                if (!string.IsNullOrEmpty(token))
                {
                    using var client = new HttpClient();
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    var bskyResponse = await client.PostAsync("https://bsky.social/xrpc/com.atproto.repo.createRecord", 
                        new StringContent(JsonSerializer.Serialize(new { repo = follower.Did, collection = "app.bsky.graph.follow", record = followRecord }), Encoding.UTF8, "application/json"));

                    if (bskyResponse.IsSuccessStatusCode)
                    {
                        var responseBody = await bskyResponse.Content.ReadAsStringAsync();
                        var json = JsonDocument.Parse(responseBody);
                        follow.Uri = json.RootElement.GetProperty("uri").GetString();
                        follow.Cid = json.RootElement.GetProperty("cid").GetString();
                        follow.Tid = follow.Uri?.Split('/').Last() ?? follow.Tid;
                        
                        _unitOfWork.Follows.Update(follow);
                        Console.WriteLine($"[FollowUserAsync] Proxied follow to Bluesky for User {followerId}");
                    }
                    else
                    {
                        var error = await bskyResponse.Content.ReadAsStringAsync();
                        Console.WriteLine($"[FollowUserAsync] Bluesky Follow Failed: {bskyResponse.StatusCode} - {error}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
             Console.WriteLine($"[FollowUserAsync] Repo Signing Error: {ex.Message}");
        }

        // Create notification
        bool createNotif = await ShouldCreateNotificationAsync(followingId, "follow");
        Notification? notification = null;
        if (createNotif)
        {
            notification = new Notification
            {
                Id = Guid.NewGuid(),
                Tid = ProtocolUtils.GenerateTid(),
                Type = "follow",
                SenderId = followerId,
                RecipientId = followingId,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false
            };
            await _unitOfWork.Notifications.AddAsync(notification);
        }

        await _unitOfWork.CompleteAsync();

        if (createNotif && notification != null)
        {
            // Broadcast notification via SignalR
            // Need to fetch notification with sender for DTO
            var savedNotification = await _unitOfWork.Notifications.Query()
                .Include(n => n.Sender)
                .FirstOrDefaultAsync(n => n.Id == notification.Id);

            if (savedNotification != null)
            {
                var notificationDto = new NotificationDto(
                    savedNotification.Id,
                    $"at://local/app.bsky.notification.event/{savedNotification.Tid}",
                    "pseudo-cid-" + savedNotification.Id,
                    savedNotification.Type ?? "follow",
                    savedNotification.Type ?? "follow",
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
                    null,
                    savedNotification.ListId,
                    savedNotification.Title,
                    savedNotification.Content,
                    savedNotification.IsRead ?? false,
                    DateTime.SpecifyKind(savedNotification.CreatedAt ?? DateTime.UtcNow, DateTimeKind.Utc)
                );

                await _hubContext.Clients.Group($"user-{followingId}")
                    .SendAsync("ReceiveNotification", notificationDto);
            }
        }

        return follow?.Uri;
    }
    finally
    {
        await _cacheService.ReleaseLockAsync(lockKey);
    }
}

    public async Task<bool> UnfollowUserAsync(Guid followerId, Guid followingId)
    {
        var existing = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (existing == null) return true;

        var follower = await _unitOfWork.Users.GetByIdAsync(followerId);
        var following = await _unitOfWork.Users.GetByIdAsync(followingId);

        _unitOfWork.Follows.Remove(existing);

        if (follower != null) follower.FollowingCount--;
        if (following != null) following.FollowersCount--;

        await _unitOfWork.CompleteAsync();

        // --- AT Protocol: Delete follow record on unfollow ---
        try
        {
            if (follower != null && !string.IsNullOrEmpty(follower.Did) && !string.IsNullOrEmpty(existing.Tid))
            {
                var token = await _cacheService.GetAsync<string>($"BlueskyToken_{followerId}");
                if (!string.IsNullOrEmpty(token))
                {
                    using var client = new HttpClient();
                    client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                    var bskyResponse = await client.PostAsync("https://bsky.social/xrpc/com.atproto.repo.deleteRecord", 
                        new StringContent(JsonSerializer.Serialize(new { repo = follower.Did, collection = "app.bsky.graph.follow", rkey = existing.Tid }), Encoding.UTF8, "application/json"));

                    if (bskyResponse.IsSuccessStatusCode)
                    {
                        Console.WriteLine($"[UnfollowUserAsync] Proxied unfollow to Bluesky for User {followerId}");
                    }
                    else
                    {
                        var error = await bskyResponse.Content.ReadAsStringAsync();
                        Console.WriteLine($"[UnfollowUserAsync] Bluesky Unfollow Failed: {bskyResponse.StatusCode} - {error}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[UnfollowUserAsync] Failed to delete AT follow record: {ex.Message}");
        }

        return true;
    }

    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
    {
        return await _unitOfWork.Follows.IsFollowingAsync(followerId, followingId);
    }

    public async Task<UserFollow?> GetFollowAsync(Guid followerId, Guid followingId)
    {
        return await _unitOfWork.Follows.GetAsync(followerId, followingId);
    }

    public async Task<Dictionary<Guid, UserRelationshipStatusDto>> GetInteractionStatusesAsync(Guid viewerId, IEnumerable<Guid> targetIds)
    {
        var targetIdList = targetIds.Distinct().ToList();
        if (!targetIdList.Any()) return new Dictionary<Guid, UserRelationshipStatusDto>();

        // 1. Fetch Follows (viewer follows target)
        var follows = await _unitOfWork.Follows.Query()
            .Where(f => f.FollowerId == viewerId && targetIdList.Contains(f.FollowingId))
            .ToListAsync();

        var followsMap = follows.ToDictionary(f => f.FollowingId);

        // 2. Fetch Blocks (viewer blocks target)
        var blocking = await _unitOfWork.Blocks.Query()
            .Where(b => b.UserId == viewerId && targetIdList.Contains(b.BlockedUserId))
            .ToListAsync();
            
        var blockingMap = blocking.ToDictionary(b => b.BlockedUserId);

        // 3. Fetch BlockedBy (target blocks viewer)
        var blockedBy = await _unitOfWork.Blocks.Query()
            .Where(b => b.BlockedUserId == viewerId && targetIdList.Contains(b.UserId))
            .Select(b => b.UserId)
            .ToListAsync();

        // 4. Fetch Mutes (viewer mutes target)
        var mutes = await _unitOfWork.Mutes.Query()
            .Where(m => m.UserId == viewerId && targetIdList.Contains(m.MutedUserId))
            .Select(m => m.MutedUserId)
            .ToListAsync();

        var result = new Dictionary<Guid, UserRelationshipStatusDto>();
        foreach (var id in targetIdList)
        {
            result[id] = new UserRelationshipStatusDto(
                IsFollowing: followsMap.ContainsKey(id),
                IsBlocking: blockingMap.ContainsKey(id),
                IsBlockedBy: blockedBy.Contains(id),
                IsMuted: mutes.Contains(id),
                FollowingReference: followsMap.TryGetValue(id, out var f) ? f.Uri : null,
                BlockingReference: blockingMap.TryGetValue(id, out var b) ? b.Uri : null
            );
        }

        return result;
    }

    public async Task<(List<User> Users, string? Cursor)> GetFollowersAsync(string actor, int limit = 50, string? cursor = null)
    {
        User? user = null;
        if (Guid.TryParse(actor, out var userId))
            user = await GetUserByIdAsync(userId);
        else
            user = await GetUserByHandleAsync(actor);

        if (user == null)
        {
            user = await ResolveRemoteProfileAsync(actor);
            if (user == null) return (new List<User>(), null);
        }

        var localDomain = _configuration["DomainName"] ?? "bskyclone.site";
        bool isRemote = !string.IsNullOrEmpty(user.Did) && (user.Did.StartsWith("did:") && !user.Handle.EndsWith(localDomain, StringComparison.OrdinalIgnoreCase));
        
        if (isRemote)
        {
            _logger.LogInformation("[GetFollowersAsync] Triggering remote fetch for {Actor}", actor);
            return await GetRemoteFollowersAsync(user.Did, limit, cursor);
        }

        // Local followers
        int skip = 0;
        if (int.TryParse(cursor, out var skipVal)) skip = skipVal;
        
        var follows = await _unitOfWork.Follows.GetFollowersAsync(user.Id, skip, limit);
        var users = follows.Select(f => f.Follower).ToList();
        var nextCursor = users.Count == limit ? (skip + limit).ToString() : null;
        
        return (users, nextCursor);
    }

    public async Task<(List<User> Users, string? Cursor)> GetFollowingAsync(string actor, int limit = 50, string? cursor = null)
    {
        User? user = null;
        if (Guid.TryParse(actor, out var userId))
            user = await GetUserByIdAsync(userId);
        else if (actor.StartsWith("did:"))
            user = await GetUserByDidAsync(actor);
        else
            user = await GetUserByHandleAsync(actor);

        if (user == null)
        {
            user = await ResolveRemoteProfileAsync(actor);
            if (user == null) return (new List<User>(), null);
        }

        var localDomain = _configuration["DomainName"] ?? "bskyclone.site";
        bool isRemote = !string.IsNullOrEmpty(user.Did) && (user.Did.StartsWith("did:") && !user.Handle.EndsWith(localDomain, StringComparison.OrdinalIgnoreCase));
        
        if (isRemote)
        {
            _logger.LogInformation("[GetFollowingAsync] Triggering remote fetch for {Actor}", actor);
            return await GetRemoteFollowingAsync(user.Did, limit, cursor);
        }

        // Local following
        int skip = 0;
        if (int.TryParse(cursor, out var skipVal)) skip = skipVal;
        
        var follows = await _unitOfWork.Follows.GetFollowingAsync(user.Id, skip, limit);
        var users = follows.Select(f => f.Following).ToList();
        var nextCursor = users.Count == limit ? (skip + limit).ToString() : null;
        
        return (users, nextCursor);
    }

    private async Task<(List<User> Users, string? Cursor)> GetRemoteFollowersAsync(string did, int limit, string? cursor)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            var url = $"https://api.bsky.app/xrpc/app.bsky.graph.getFollowers?actor={did}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            _logger.LogInformation("[GetRemoteFollowersAsync] Fetching from: {Url}", url);
            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) 
            {
                _logger.LogWarning("[GetRemoteFollowersAsync] Failed: {StatusCode}", response.StatusCode);
                return (new List<User>(), null);
            }

            var content = await response.Content.ReadAsStringAsync();
            
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var users = new List<User>();
            if (root.TryGetProperty("followers", out var followersProp))
            {
                var followersArray = followersProp.EnumerateArray().ToList();
                
                var dids = followersArray
                    .Select(f => f.TryGetProperty("did", out var d) ? d.GetString() : null)
                    .Where(d => d != null)
                    .Cast<string>()
                    .Distinct()
                    .ToList();

                _logger.LogInformation("[GetRemoteFollowersAsync] Extracted {DidsCount} unique DIDs", dids.Count);

                // Batch lookup existing users
                var existingUsers = await _unitOfWork.Users.Query()
                    .Where(u => dids.Contains(u.Did))
                    .ToDictionaryAsync(u => u.Did);

                _logger.LogInformation("[GetRemoteFollowersAsync] Found {ExistingCount} existing users in local DB", existingUsers.Count);

                foreach (var item in followersArray)
                {
                    var u = await ResolveStubRemoteProfileAsync(item, existingUsers, false);
                    if (u != null) 
                    {
                        // Resiliently ensure we don't have stubs for users we actually know
                        if (string.IsNullOrEmpty(u.DisplayName) || u.DisplayName == u.Handle)
                        {
                             // If Bio/DisplayName missing, it might be a very basic stub.
                             // We could trigger a full resolution here, but let's avoid blocking too much.
                             // ResolveStubRemoteProfileAsync already extracts what's in 'item'.
                        }
                        users.Add(u);
                    }
                }
                
                await _unitOfWork.CompleteAsync(); // Complete once for all stubs
                
                // Re-index in search (resiliently)
                foreach(var u in users)
                {
                    try { await _searchService.IndexUserAsync(u); } catch { }
                }
            }
            else
            {
                 _logger.LogWarning("[GetRemoteFollowersAsync] 'followers' property missing in response");
            }

            string? nextCursor = root.TryGetProperty("cursor", out var cursorProp) ? cursorProp.GetString() : null;
            return (users, nextCursor);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GetRemoteFollowersAsync] Error");
            return (new List<User>(), null);
        }
    }

    private async Task<(List<User> Users, string? Cursor)> GetRemoteFollowingAsync(string did, int limit, string? cursor)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            var url = $"https://api.bsky.app/xrpc/app.bsky.graph.getFollows?actor={did}&limit={limit}";
            if (!string.IsNullOrEmpty(cursor)) url += $"&cursor={cursor}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return (new List<User>(), null);

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var users = new List<User>();
            if (root.TryGetProperty("follows", out var followsProp))
            {
                var followsArray = followsProp.EnumerateArray().ToList();
                var dids = followsArray
                    .Select(f => f.TryGetProperty("did", out var d) ? d.GetString() : null)
                    .Where(d => d != null)
                    .Cast<string>()
                    .Distinct()
                    .ToList();

                // Batch lookup existing users
                var existingUsers = await _unitOfWork.Users.Query()
                    .Where(u => dids.Contains(u.Did))
                    .ToDictionaryAsync(u => u.Did);

                foreach (var item in followsArray)
                {
                    var u = await ResolveStubRemoteProfileAsync(item, existingUsers, false);
                    if (u != null) users.Add(u);
                }
                
                await _unitOfWork.CompleteAsync(); // Complete once for all stubs
                
                // Re-index in search (resiliently)
                foreach(var u in users)
                {
                    try { await _searchService.IndexUserAsync(u); } catch { /* Ignore search errors in background */ }
                }
            }

            string? nextCursor = root.TryGetProperty("cursor", out var cursorProp) ? cursorProp.GetString() : null;
            return (users, nextCursor);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GetRemoteFollowingAsync] Error");
            return (new List<User>(), null);
        }
    }

    public async Task<User?> ResolveStubRemoteProfileAsync(JsonElement profileElement, Dictionary<string, User> existingUsers, bool complete = true)
    {
        if (!profileElement.TryGetProperty("did", out var didProp)) return null;
        var did = didProp.GetString()!;

        existingUsers.TryGetValue(did, out var user);
        bool isNew = false;

        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Did = did,
                Username = $"remote_{did.Replace(":", "_")}",
                Email = $"{did.Replace(":", "_")}@remote.atproto",
                PasswordHash = "REMOTE_USER",
                Salt = "REMOTE_USER",
                CreatedAt = DateTime.UtcNow,
                IsVerified = true
            };
            isNew = true;
        }

        if (profileElement.TryGetProperty("handle", out var handleProp)) user.Handle = handleProp.GetString() ?? user.Handle;
        
        // Populate metadata ONLY if not already present or if the new data is 'better' (longer bio, etc.)
        if (profileElement.TryGetProperty("displayName", out var nameProp)) 
        {
            var newName = nameProp.GetString();
            if (!string.IsNullOrEmpty(newName) && (string.IsNullOrEmpty(user.DisplayName) || user.DisplayName == user.Handle))
                user.DisplayName = newName;
        }
        
        if (profileElement.TryGetProperty("avatar", out var avatarProp)) 
        {
            var newAvatar = avatarProp.GetString();
            if (!string.IsNullOrEmpty(newAvatar) && string.IsNullOrEmpty(user.AvatarUrl))
                user.AvatarUrl = newAvatar;
        }
        
        if (profileElement.TryGetProperty("description", out var bioProp)) 
        {
            var newBio = bioProp.GetString();
            if (!string.IsNullOrEmpty(newBio) && (string.IsNullOrEmpty(user.Bio) || newBio.Length > (user.Bio?.Length ?? 0)))
                user.Bio = newBio;
        }
        
        if (profileElement.TryGetProperty("followersCount", out var followersProp)) user.FollowersCount = followersProp.GetInt32();
        if (profileElement.TryGetProperty("followsCount", out var followsCountProp)) user.FollowingCount = followsCountProp.GetInt32();
        if (profileElement.TryGetProperty("postsCount", out var postsCountProp)) user.PostsCount = postsCountProp.GetInt32();

        if (isNew)
        {
            await _unitOfWork.Users.AddAsync(user);
            existingUsers[did] = user; // Track for potential duplicates in the same batch
        }
        else
        {
            _unitOfWork.Users.Update(user);
        }
        
        if (complete)
        {
            await _unitOfWork.CompleteAsync();
            // Re-index in search (resiliently)
            try { await _searchService.IndexUserAsync(user); } catch { }
        }

        return user;
    }

    private async Task<string> SaveFileAsync(Stream stream, string fileName, string folderName)
    {
        var uploadsRoot = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", folderName);
        if (!Directory.Exists(uploadsRoot)) Directory.CreateDirectory(uploadsRoot);

        var extension = Path.GetExtension(fileName);
        var newFileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsRoot, newFileName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await stream.CopyToAsync(fileStream);
        }

        return $"/uploads/{folderName}/{newFileName}";
    }

    private async Task<string> SaveFileAsync(IFormFile file, string folderName)
    {
        using var stream = file.OpenReadStream();
        return await SaveFileAsync(stream, file.FileName, folderName);
    }

    public async Task<bool> BlockUserAsync(Guid userId, Guid blockedUserId)
    {
        if (userId == blockedUserId) return false;
        
        var existing = await _unitOfWork.Blocks.GetAsync(userId, blockedUserId);
        
        if (existing != null) return true;

        var blocker = await _unitOfWork.Users.GetByIdAsync(userId);
        var blocked = await _unitOfWork.Users.GetByIdAsync(blockedUserId);

        if (blocker == null || blocked == null) return false;

        var block = new BlockedAccount
        {
            UserId = userId,
            BlockedUserId = blockedUserId,
            CreatedAt = DateTime.UtcNow
        };

        // --- Phase 4: Repo Signing for Blocks ---
        try
        {
            if (!string.IsNullOrEmpty(blocker.Did) && !string.IsNullOrEmpty(blocked.Did))
            {
                var tid = ProtocolUtils.GenerateTid();
                var blockRecord = new Dictionary<string, object>
                {
                    { "$type", "app.bsky.graph.block" },
                    { "subject", blocked.Did },
                    { "createdAt", block.CreatedAt?.ToString("O") ?? DateTime.UtcNow.ToString("O") }
                };

                var cid = await _repoManager.CreateRecordAsync(blocker.Did, "app.bsky.graph.block", blockRecord);
                block.Uri = $"at://{blocker.Did}/app.bsky.graph.block/{tid}";
            }
        }
        catch (Exception ex)
        {
             Console.WriteLine($"[BlockUserAsync] Repo Signing Error: {ex.Message}");
        }

        await _unitOfWork.Blocks.AddAsync(block);
        
        // Also unfollow if following
        await UnfollowUserAsync(userId, blockedUserId);
        await UnfollowUserAsync(blockedUserId, userId);

        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<BlockedAccount?> GetBlockAsync(Guid userId, Guid blockedUserId)
    {
        return await _unitOfWork.Blocks.GetAsync(userId, blockedUserId);
    }


    public async Task<bool> UnblockUserAsync(Guid userId, Guid blockedUserId)
    {
        var block = await _unitOfWork.Blocks.GetAsync(userId, blockedUserId);
        if (block == null) return true;

        _unitOfWork.Blocks.Remove(block);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> IsBlockedAsync(Guid userId, Guid potentialBlockedUserId)
    {
        return await _unitOfWork.Blocks.IsBlockedAsync(userId, potentialBlockedUserId);
    }

    public async Task<bool> IsBlockedByAsync(Guid userId, Guid potentialBlockerId)
    {
        return await _unitOfWork.Blocks.IsBlockedAsync(potentialBlockerId, userId);
    }

    public async Task<bool> MuteUserAsync(Guid userId, Guid mutedUserId)
    {
        if (userId == mutedUserId) return false;

        if (await _unitOfWork.Mutes.IsMutedAsync(userId, mutedUserId)) return true;

        var mute = new MutedAccount
        {
            UserId = userId,
            MutedUserId = mutedUserId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Mutes.AddAsync(mute);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> UnmuteUserAsync(Guid userId, Guid mutedUserId)
    {
        var mute = await _unitOfWork.Mutes.GetAsync(userId, mutedUserId);
        if (mute == null) return true;

        _unitOfWork.Mutes.Remove(mute);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> IsMutedAsync(Guid userId, Guid potentialMutedUserId)
    {
        return await _unitOfWork.Mutes.IsMutedAsync(userId, potentialMutedUserId);
    }

    public async Task<List<User>> GetMutedUsersAsync(Guid userId)
    {
        var mutes = await _unitOfWork.Mutes.GetMutedAccountsAsync(userId);
        return mutes.Select(m => m.MutedUser).ToList();
    }

    public async Task<List<User>> GetBlockedUsersAsync(Guid userId)
    {
        var blocks = await _unitOfWork.Blocks.GetBlockedAccountsAsync(userId);
        return blocks.Select(b => b.BlockedUser).ToList();
    }

    public async Task<List<User>> SearchUsersAsync(string query, int limit = 10)
    {
        if (string.IsNullOrWhiteSpace(query)) return new List<User>();

        query = query.ToLower().Trim();
        // Search by handle or username or display name
        return await _unitOfWork.Users.Query()
            .AsNoTracking()
            .Where(u => u.Handle.ToLower().Contains(query) || 
                        u.Username.ToLower().Contains(query) || 
                        (u.DisplayName != null && u.DisplayName.ToLower().Contains(query)))
            .Take(limit)
            .ToListAsync();
    }

    public async Task<List<MutedWord>> GetMutedWordsAsync(Guid userId)
    {
        return await _unitOfWork.MutedWords.Query()
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();
    }

    public async Task<MutedWord> AddMutedWordAsync(Guid userId, string word, string behavior)
    {
        var mutedWord = new MutedWord
        {
            UserId = userId,
            Word = word.Trim().ToLower(),
            MuteBehavior = behavior,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.MutedWords.AddAsync(mutedWord);
        await _unitOfWork.CompleteAsync();
        return mutedWord;
    }

    public async Task<bool> DeleteMutedWordAsync(Guid userId, int mutedWordId)
    {
        var word = await _unitOfWork.MutedWords.Query()
            .FirstOrDefaultAsync(w => w.Id == mutedWordId && w.UserId == userId);
        
        if (word == null) return false;

        _unitOfWork.MutedWords.Remove(word);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<List<string>> GetSelectedInterestsAsync(Guid userId)
    {
        try
        {
            var settings = await _unitOfWork.Users.Query()
                .Where(u => u.Id == userId)
                .Select(u => u.UserSetting)
                .FirstOrDefaultAsync();

            if (settings?.SelectedInterests == null) return new List<string>();

            return System.Text.Json.JsonSerializer.Deserialize<List<string>>(settings.SelectedInterests) ?? new List<string>();
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[UserService] GetSelectedInterestsAsync: Error: {ex.Message}");
            return new List<string>();
        }
    }

    public async Task SaveSelectedInterestsAsync(Guid userId, List<string> interests)
    {
        User? user = null;
        try
        {
            user = await _unitOfWork.Users.Query()
                .Include(u => u.UserSetting)
                .FirstOrDefaultAsync(u => u.Id == userId);
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[UserService] SaveSelectedInterestsAsync: Error: {ex.Message}");
            user = await _unitOfWork.Users.GetByIdAsync(userId);
        }

        if (user == null) throw new Exception("User not found");

        if (user.UserSetting == null)
        {
            user.UserSetting = new UserSetting { UserId = userId };
        }

        user.UserSetting.SelectedInterests = System.Text.Json.JsonSerializer.Serialize(interests);
        await _unitOfWork.CompleteAsync();
    }

    private async Task<bool> ShouldCreateNotificationAsync(Guid userId, string type)
    {
        try
        {
            var settings = await _unitOfWork.UserSettings.Query()
                .FirstOrDefaultAsync(s => s.UserId == userId);
                
            if (settings == null) return true;

            return type.ToLower() switch
            {
                "follow" => (settings.NotifyFollowers ?? true) && (settings.InAppNotifyFollowers ?? true),
                "activity" => (settings.NotifyActivity ?? true) && (settings.InAppNotifyActivity ?? true),
                _ => (settings.NotifyOthers ?? true) && (settings.InAppNotifyOthers ?? true)
            };
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[UserService] ShouldCreateNotificationAsync: Error: {ex.Message}");
            return true;
        }
    }

    public async Task<bool> VerifyDomainAsync(Guid userId, string? handle = null)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return false;

        // Use provided handle or existing handle
        var handleToVerify = handle ?? user.Handle;
        if (string.IsNullOrEmpty(handleToVerify)) return false;

        // If it's the current handle and it ends with .bsky.social, it's already verified
        // But if a NEW handle is provided, we MUST verify it regardless of extension
        if (handle == null && handleToVerify.EndsWith(".bsky.social"))
        {
            user.IsVerified = true;
            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();
            return true;
        }

        var didValue = $"did={user.Did}";
        bool verified = false;

        // 1. Check DNS TXT record: _atproto.handle
        try
        {
            var lookup = new LookupClient();
            var result = await lookup.QueryAsync($"_atproto.{handleToVerify}", QueryType.TXT);
            foreach (var txtRecord in result.Answers.TxtRecords())
            {
                if (txtRecord.Text.Any(t => t.Contains(didValue)))
                {
                    verified = true;
                    break;
                }
            }
        }
        catch { /* Fallback to HTTP */ }

        // 2. Check HTTP: https://handle/.well-known/atproto-did
        if (!verified)
        {
            try
            {
                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromSeconds(5);
                var response = await client.GetStringAsync($"https://{handleToVerify}/.well-known/atproto-did");
                if (response.Trim() == user.Did)
                {
                    verified = true;
                }
            }
            catch { }
        }

        if (verified)
        {
            user.IsVerified = true;
            // If we verified a new handle, update it
            if (!string.IsNullOrEmpty(handle) && handle.ToLower() != user.Handle)
            {
                user.Handle = handle.ToLower();
            }

            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();
            
            // Re-index in Elasticsearch
            await _searchService.IndexUserAsync(user);
        }

        return verified;
    }

    public async Task<bool> UpdateHandleAsync(Guid userId, string newHandle)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return false;

        var oldHandle = user.Handle;
        user.Handle = newHandle.ToLower().Trim();
        user.Username = user.Handle.Split('.').First();

        _unitOfWork.Users.Update(user);
        var success = await _unitOfWork.CompleteAsync() > 0;

        if (success)
        {
            // Update search index
            await _searchService.IndexUserAsync(user);
            Console.WriteLine($"[UserService] Handle updated for {userId}: {oldHandle} -> {newHandle}");
        }

        return success;
    }

    public async Task<User?> ResolveRemoteProfileAsync(string identifier)
    {
        if (string.IsNullOrEmpty(identifier)) return null;

        string did = identifier;
        if (!identifier.StartsWith("did:"))
        {
            // Resolve handle to DID
            var resolved = await _didResolver.ResolveHandleAsync(identifier);
            if (resolved == null || string.IsNullOrEmpty(resolved.Did)) return null;
            did = resolved.Did;
        }

        var user = await _unitOfWork.Users.Query().FirstOrDefaultAsync(u => u.Did == did);
        bool isNew = false;
        
        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Did = did,
                Username = $"remote_{did.Replace(":", "_")}",
                Email = $"{did.Replace(":", "_")}@remote.atproto",
                PasswordHash = "REMOTE_USER",
                Salt = "REMOTE_USER",
                Handle = did,
                CreatedAt = DateTime.UtcNow,
                IsVerified = true
            };
            isNew = true;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
            var response = await client.GetAsync($"https://api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={did}");

            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(content);
                var root = doc.RootElement;

                if (root.TryGetProperty("handle", out var handleProp)) user.Handle = handleProp.GetString() ?? user.Handle;
                if (root.TryGetProperty("displayName", out var nameProp)) user.DisplayName = nameProp.GetString();
                if (root.TryGetProperty("avatar", out var avatarProp)) user.AvatarUrl = avatarProp.GetString();
                if (root.TryGetProperty("banner", out var bannerProp)) user.CoverImageUrl = bannerProp.GetString();
                if (root.TryGetProperty("description", out var bioProp)) user.Bio = bioProp.GetString();
                // Persist remote counts — local DB won't have follow records for remote users
                if (root.TryGetProperty("followersCount", out var followersProp)) user.FollowersCount = followersProp.GetInt32();
                if (root.TryGetProperty("followsCount", out var followsProp)) user.FollowingCount = followsProp.GetInt32();
                if (root.TryGetProperty("postsCount", out var postsProp)) user.PostsCount = postsProp.GetInt32();

                if (isNew)
                {
                    await _unitOfWork.Users.AddAsync(user);
                }
                else
                {
                    _unitOfWork.Users.Update(user);
                }
                
                await _unitOfWork.CompleteAsync();

                // Re-index in search (resiliently)
                try { await _searchService.IndexUserAsync(user); } catch { }
                
                _logger.LogInformation("[ResolveRemoteProfileAsync] Resolved {Status}DID {Did} to handle {Handle}", isNew ? "NEW " : "", did, user.Handle);
            }
            else
            {
                _logger.LogWarning("[ResolveRemoteProfileAsync] Failed to resolve DID {Did}: {StatusCode}", did, response.StatusCode);
                if (isNew) return null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ResolveRemoteProfileAsync] Error resolving {Did}", did);
            if (isNew) return null;
        }

        return user;
    }

    public async Task<IEnumerable<User>> SearchActorsRemoteAsync(string query, string token, int skip = 0, int take = 20)
    {
        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
            
            var url = $"https://api.bsky.app/xrpc/app.bsky.actor.searchActors?q={Uri.EscapeDataString(query)}&limit={take}";
            // Note: skip/cursor pagination could be added here if needed

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return new List<User>();

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;

            var users = new List<User>();
            if (root.TryGetProperty("actors", out var actorsProp))
            {
                var actorsArray = actorsProp.EnumerateArray().ToList();
                var dids = actorsArray
                    .Select(a => a.TryGetProperty("did", out var d) ? d.GetString() : null)
                    .Where(d => d != null)
                    .Cast<string>()
                    .Distinct()
                    .ToList();

                var existingUsers = await _unitOfWork.Users.Query()
                    .Where(u => dids.Contains(u.Did))
                    .ToDictionaryAsync(u => u.Did);

                foreach (var item in actorsArray)
                {
                    var u = await ResolveStubRemoteProfileAsync(item, existingUsers, false);
                    if (u != null) users.Add(u);
                }
                
                await _unitOfWork.CompleteAsync();
            }

            return users;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[SearchActorsRemoteAsync] Error searching for {Query}", query);
            return new List<User>();
        }
    }
}
