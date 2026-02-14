using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using BSkyClone.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class UserService : IUserService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ICacheService _cacheService;

    public UserService(IUnitOfWork unitOfWork, IWebHostEnvironment environment, IHubContext<ChatHub> hubContext, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _environment = environment;
        _hubContext = hubContext;
        _cacheService = cacheService;
    }

    public async Task<User?> GetUserByIdAsync(Guid id)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(id);
        if (user != null)
        {
            user.PostsCount = await _unitOfWork.Posts.Query().CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);
        }
        return user;
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
            user.AvatarUrl = null;
        }
        else if (request.Avatar != null)
        {
            var avatarPath = await SaveFileAsync(request.Avatar, "avatars");
            user.AvatarUrl = avatarPath;
        }

        // Handle Cover Image: remove, upload new, or keep existing
        if (request.RemoveCoverImage)
        {
            user.CoverImageUrl = null;
        }
        else if (request.CoverImage != null)
        {
            var coverPath = await SaveFileAsync(request.CoverImage, "covers");
            user.CoverImageUrl = coverPath;
        }

        _unitOfWork.Users.Update(user);
        await _unitOfWork.CompleteAsync();

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
        if (!string.IsNullOrWhiteSpace(request.Username) && request.Username != user.Username)
        {
            var newHandle = $"{request.Username.Trim().ToLower()}.bsky.social";
            var existing = await _unitOfWork.Users.GetByHandleAsync(newHandle);
            if (existing != null) throw new Exception("Username already in use");
            
            user.Username = request.Username.Trim();
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

        return user;
    }

    public async Task<UserSetting> UpdateSettingsAsync(Guid userId, UserSettingDto request)
    {
        var user = await _unitOfWork.Users.Query()
            .Include(u => u.UserSetting)
            .FirstOrDefaultAsync(u => u.Id == userId);

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

        if (request.DefaultReplyRestriction != null) s.DefaultReplyRestriction = request.DefaultReplyRestriction;
        if (request.DefaultAllowQuotes != null) s.DefaultAllowQuotes = request.DefaultAllowQuotes;

        await _unitOfWork.CompleteAsync();
        return s;
    }


    public async Task<bool> FollowUserAsync(Guid followerId, Guid followingId)
    {
        if (followerId == followingId) return false;

        var lockKey = $"lock:follow:{followerId}:{followingId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
            return false;
        }

        try
        {
            var existing = await _unitOfWork.Follows.GetAsync(followerId, followingId);
        if (existing != null) return true;

        var follower = await _unitOfWork.Users.GetByIdAsync(followerId);
        var following = await _unitOfWork.Users.GetByIdAsync(followingId);

        if (follower == null || following == null) return false;

        var follow = new UserFollow
        {
            FollowerId = followerId,
            FollowingId = followingId,
            CreatedAt = DateTime.UtcNow
        };

        await _unitOfWork.Follows.AddAsync(follow);
        
        follower.FollowingCount++;
        following.FollowersCount++;

        // Create notification
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            Tid = DateTime.UtcNow.Ticks.ToString(),
            Type = "follow",
            RecipientId = followingId,
            SenderId = followerId,
            CreatedAt = DateTime.UtcNow,
            IsRead = false,
            IsDeleted = false
        };
        await _unitOfWork.Notifications.AddAsync(notification);

        await _unitOfWork.CompleteAsync();

        // Broadcast notification via SignalR
        // Need to fetch notification with sender for DTO
        var savedNotification = await _unitOfWork.Notifications.Query()
            .Include(n => n.Sender)
            .FirstOrDefaultAsync(n => n.Id == notification.Id);

        if (savedNotification != null)
        {
            var notificationDto = new NotificationDto(
                savedNotification.Id,
                savedNotification.Type ?? "follow",
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

            await _hubContext.Clients.Group($"user-{followingId}")
                .SendAsync("ReceiveNotification", notificationDto);
        }

        return true;
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
        return true;
    }

    public async Task<bool> IsFollowingAsync(Guid followerId, Guid followingId)
    {
        return await _unitOfWork.Follows.IsFollowingAsync(followerId, followingId);
    }

    public async Task<List<User>> GetFollowersAsync(Guid userId)
    {
        var follows = await _unitOfWork.Follows.GetFollowersAsync(userId);
        return follows.Select(f => f.Follower).ToList();
    }

    public async Task<List<User>> GetFollowingAsync(Guid userId)
    {
        var follows = await _unitOfWork.Follows.GetFollowingAsync(userId);
        return follows.Select(f => f.Following).ToList();
    }

    private async Task<string> SaveFileAsync(IFormFile file, string folderName)
    {
        var uploadsFolder = Path.Combine(_environment.WebRootPath ?? "wwwroot", "uploads", folderName);
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream);
        }

        // Return relative path for URL
        return $"/uploads/{folderName}/{uniqueFileName}";
    }

    public async Task<bool> BlockUserAsync(Guid userId, Guid blockedUserId)
    {
        if (userId == blockedUserId) return false;

        var lockKey = $"lock:block:{userId}:{blockedUserId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
            return false;
        }

        try
        {
            // Check if already blocked
        if (await _unitOfWork.Blocks.IsBlockedAsync(userId, blockedUserId)) return true;

        // Create Block
        var block = new BlockedAccount
        {
            UserId = userId,
            BlockedUserId = blockedUserId,
            CreatedAt = DateTime.UtcNow
        };
        await _unitOfWork.Blocks.AddAsync(block);

        // Remove mutual follows
        await UnfollowUserAsync(userId, blockedUserId);
        await UnfollowUserAsync(blockedUserId, userId);

        await _unitOfWork.CompleteAsync();
        return true;
        }
        finally
        {
            await _cacheService.ReleaseLockAsync(lockKey);
        }
    }

    public async Task<bool> UnblockUserAsync(Guid userId, Guid blockedUserId)
    {
        var lockKey = $"lock:unblock:{userId}:{blockedUserId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
            return false;
        }

        try
        {
            var block = await _unitOfWork.Blocks.GetAsync(userId, blockedUserId);
        if (block == null) return true;

        _unitOfWork.Blocks.Remove(block);
        await _unitOfWork.CompleteAsync();
        return true;
        }
        finally
        {
            await _cacheService.ReleaseLockAsync(lockKey);
        }
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

        var lockKey = $"lock:mute:{userId}:{mutedUserId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
            return false;
        }

        try
        {
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
        finally
        {
            await _cacheService.ReleaseLockAsync(lockKey);
        }
    }

    public async Task<bool> UnmuteUserAsync(Guid userId, Guid mutedUserId)
    {
        var lockKey = $"lock:unmute:{userId}:{mutedUserId}";
        if (!await _cacheService.TryLockAsync(lockKey, TimeSpan.FromSeconds(2)))
        {
            return false;
        }

        try
        {
            var mute = await _unitOfWork.Mutes.GetAsync(userId, mutedUserId);
            if (mute == null) return true;

            _unitOfWork.Mutes.Remove(mute);
            await _unitOfWork.CompleteAsync();
            return true;
        }
        finally
        {
            await _cacheService.ReleaseLockAsync(lockKey);
        }
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
            .Where(u => u.Handle.ToLower().Contains(query) || 
                        u.Username.ToLower().Contains(query) || 
                        (u.DisplayName != null && u.DisplayName.ToLower().Contains(query)))
            .Take(limit)
            .ToListAsync();
    }
}
