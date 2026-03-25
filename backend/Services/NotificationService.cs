using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using BSkyClone.Lexicons.App.Bsky.Notification;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace BSkyClone.Services;

public class NotificationService : INotificationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly IDistributedCache _cache;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        IUnitOfWork unitOfWork,
        IXrpcProxyService xrpcProxy,
        IDistributedCache cache,
        ILogger<NotificationService> logger)
    {
        _unitOfWork = unitOfWork;
        _xrpcProxy = xrpcProxy;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IEnumerable<NotificationDto>> GetNotificationsAsync(Guid userId, int limit = 50)
    {
        var localNotifications = await _unitOfWork.Notifications.GetUserNotificationsAsync(userId, limit);
        var resultList = new List<NotificationDto>();

        // 1. Fetch remote notifications if user is linked to Bluesky
        var authorUser = await _unitOfWork.Users.GetByIdAsync(userId);
        if (authorUser != null && !string.IsNullOrEmpty(authorUser.Did))
        {
            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            if (!string.IsNullOrEmpty(token))
            {
                try
                {
                    var queryParams = new QueryCollection(new Dictionary<string, Microsoft.Extensions.Primitives.StringValues>
                    {
                        { "limit", limit.ToString() }
                    });

                    var response = await _xrpcProxy.ProxyRequestAsync(authorUser.Did, "app.bsky.notification.listNotifications", queryParams, token);
                    if (response.Success)
                    {
                        var remoteResponse = JsonSerializer.Deserialize<ListNotificationsResponse>(response.Content);
                        if (remoteResponse?.Notifications != null)
                        {
                            foreach (var remote in remoteResponse.Notifications)
                            {
                                resultList.Add(MapRemoteToDto(remote));
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error fetching remote notifications for user {UserId}", userId);
                }
            }
        }

        // 2. Fetch membership statuses for local list invitations
        var invitationListIds = localNotifications
            .Where(n => n.Type == "list_invitation" && n.ListId.HasValue)
            .Select(n => n.ListId!.Value)
            .Distinct()
            .ToList();

        var membershipStatuses = new Dictionary<Guid, int>();
        if (invitationListIds.Any())
        {
            membershipStatuses = await _unitOfWork.ListMembers.Query()
                .Where(lm => lm.UserId == userId && invitationListIds.Contains(lm.ListId))
                .ToDictionaryAsync(lm => lm.ListId, lm => lm.Status);
        }

        // 3. Map local notifications
        foreach (var n in localNotifications)
        {
            int? status = null;
            if (n.Type == "list_invitation" && n.ListId.HasValue && membershipStatuses.TryGetValue(n.ListId.Value, out var s))
            {
                status = s;
            }
            resultList.Add(MapToDto(n, status));
        }

        // 4. Return merged, sorted by date (newest first)
        return resultList.OrderByDescending(n => n.CreatedAt).Take(limit);
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        int localCount = await _unitOfWork.Notifications.GetUnreadCountAsync(userId);
        
        var authorUser = await _unitOfWork.Users.GetByIdAsync(userId);
        if (authorUser != null && !string.IsNullOrEmpty(authorUser.Did))
        {
            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            if (!string.IsNullOrEmpty(token))
            {
                try
                {
                    var response = await _xrpcProxy.ProxyRequestAsync(authorUser.Did, "app.bsky.notification.getUnreadCount", null, token);
                    if (response.Success)
                    {
                        var unreadResponse = JsonSerializer.Deserialize<GetUnreadCountResponse>(response.Content);
                        return localCount + (unreadResponse?.Count ?? 0);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error fetching remote unread count for user {UserId}", userId);
                }
            }
        }

        return localCount;
    }

    public async Task MarkAsReadAsync(Guid userId, Guid notificationId)
    {
        var notification = await _unitOfWork.Notifications.GetByIdAsync(notificationId);
        if (notification != null && notification.RecipientId == userId)
        {
            notification.IsRead = true;
            await _unitOfWork.CompleteAsync();
        }
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        // 1. Mark local as read
        await _unitOfWork.Notifications.MarkAllAsReadAsync(userId);
        await _unitOfWork.CompleteAsync();

        // 2. Sync with Bluesky if possible
        var authorUser = await _unitOfWork.Users.GetByIdAsync(userId);
        if (authorUser != null && !string.IsNullOrEmpty(authorUser.Did))
        {
            var token = await _cache.GetStringAsync($"BlueskyToken_{userId}");
            if (!string.IsNullOrEmpty(token))
            {
                try
                {
                    var body = new UpdateSeenRequest { SeenAt = DateTime.UtcNow.ToString("O") };
                    await _xrpcProxy.ProxyRequestAsync(authorUser.Did, "app.bsky.notification.updateSeen", null, token, "POST", body);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Error syncing notifications seen status for user {UserId}", userId);
                }
            }
        }
    }

    private NotificationDto MapToDto(Notification n) => MapToDto(n, null);

    private NotificationDto MapToDto(Notification n, int? invitationStatus)
    {
        string uri = "";
        string cid = "pseudo-cid-" + n.Id;
        string reason = n.Type ?? "unknown";
        string? reasonSubject = null;

        if (n.Post != null)
        {
            var postUri = $"at://{n.Post.Author?.Did ?? "local"}/app.bsky.feed.post/{n.Post.Tid}";
            if (n.Type == "like" || n.Type == "repost")
            {
                uri = $"at://local/app.bsky.notification.event/{n.Tid}";
                reasonSubject = postUri;
            }
            else if (n.Type == "reply" || n.Type == "mention" || n.Type == "quote")
            {
                uri = postUri;
            }
        }
        else if (n.Type == "follow")
        {
            uri = $"at://local/app.bsky.notification.event/{n.Tid}";
        }

        return new NotificationDto(
            n.Id,
            uri,
            cid,
            n.Type ?? "unknown",
            reason,
            reasonSubject,
            MapToUserDto(n.Sender ?? new User { Id = n.SenderId, Username = "unknown", Handle = "unknown" }),
            n.Post?.Tid ?? (n.PostId?.ToString()),
            n.Post?.Author?.Handle,
            n.ListId,
            n.Title,
            n.Content,
            n.IsRead ?? false,
            DateTime.SpecifyKind(n.CreatedAt ?? DateTime.UtcNow, DateTimeKind.Utc),
            invitationStatus
        );
    }

    private NotificationDto MapRemoteToDto(NotificationView remote)
    {
        // Reason subjects in Bluesky are usually AT URIs
        string? postId = null;
        if (!string.IsNullOrEmpty(remote.ReasonSubject) && remote.ReasonSubject.Contains("/app.bsky.feed.post/"))
        {
            postId = remote.ReasonSubject.Split('/').Last();
        }
        else if (!string.IsNullOrEmpty(remote.Uri) && remote.Uri.Contains("/app.bsky.feed.post/"))
        {
            postId = remote.Uri.Split('/').Last();
        }

        return new NotificationDto(
            Guid.NewGuid(), // Virtual ID for remote notification
            remote.Uri,
            remote.Cid,
            remote.Reason,
            remote.Reason,
            remote.ReasonSubject,
            MapProfileToUserDto(remote.Author),
            postId,
            remote.PostAuthorHandle,
            remote.ListId,
            remote.Title,
            remote.Content,
            remote.IsRead,
            DateTime.TryParse(remote.IndexedAt, out var dt) ? dt.ToUniversalTime() : DateTime.UtcNow,
            remote.InvitationStatus
        );
    }

    private UserDto MapProfileToUserDto(BSkyClone.Lexicons.App.Bsky.Actor.Defs.ProfileViewBasic profile)
    {
        return new UserDto(
            Guid.Empty,
            profile.Handle ?? "unknown",
            profile.Handle ?? "unknown",
            "",
            profile.DisplayName,
            profile.Avatar,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "user",
            null,
            false,
            profile.Did
        );
    }

    private UserDto MapToUserDto(User u)
    {
        if (u == null) return new UserDto(Guid.Empty, "unknown", "unknown", "unknown@local", "Unknown", null, null, null, null, null, null, 0, 0, 0, "user", null, false, null);

        return new UserDto(
            u.Id,
            u.Username,
            u.Handle,
            u.Email,
            u.DisplayName,
            u.AvatarUrl,
            u.CoverImageUrl,
            u.Bio,
            u.Location,
            u.Website,
            u.DateOfBirth,
            u.FollowersCount,
            u.FollowingCount,
            u.PostsCount,
            u.Role,
            null, // ListMembershipStatus
            u.IsVerified,
            u.Did
        );
    }
}
