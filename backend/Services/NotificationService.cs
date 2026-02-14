using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public class NotificationService : INotificationService
{
    private readonly IUnitOfWork _unitOfWork;

    public NotificationService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<IEnumerable<NotificationDto>> GetNotificationsAsync(Guid userId, int limit = 50)
    {
        var notifications = await _unitOfWork.Notifications.GetUserNotificationsAsync(userId, limit);
        
        // Fetch membership statuses for list invitations in bulk
        var invitationListIds = notifications
            .Where(n => n.Type == "list_invitation" && n.ListId.HasValue)
            .Select(n => n.ListId.Value)
            .Distinct()
            .ToList();

        var membershipStatuses = new Dictionary<Guid, int>();
        if (invitationListIds.Any())
        {
            membershipStatuses = await _unitOfWork.ListMembers.Query()
                .Where(lm => lm.UserId == userId && invitationListIds.Contains(lm.ListId))
                .ToDictionaryAsync(lm => lm.ListId, lm => lm.Status);
                
            // Debug logging
            Console.WriteLine($"[NotificationService] Found {invitationListIds.Count} invitation lists for user {userId}");
            foreach(var kvp in membershipStatuses) {
                Console.WriteLine($"[NotificationService] List {kvp.Key} Status: {kvp.Value}");
            }
        }

        return notifications.Select(n => {
            int? status = null;
            if (n.Type == "list_invitation" && n.ListId.HasValue && membershipStatuses.TryGetValue(n.ListId.Value, out var s))
            {
                status = s;
                Console.WriteLine($"[NotificationService] Notification {n.Id} mapped to status {status}");
            }
            return MapToDto(n, status);
        });
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _unitOfWork.Notifications.GetUnreadCountAsync(userId);
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
        await _unitOfWork.Notifications.MarkAllAsReadAsync(userId);
        await _unitOfWork.CompleteAsync();
    }

    private NotificationDto MapToDto(Notification n) => MapToDto(n, null);

    private NotificationDto MapToDto(Notification n, int? invitationStatus)
    {
        return new NotificationDto(
            n.Id,
            n.Type ?? "unknown",
            MapToUserDto(n.Sender),
            n.PostId,
            n.ListId,
            n.Title,
            n.Content,
            n.IsRead ?? false,
            DateTime.SpecifyKind(n.CreatedAt ?? DateTime.UtcNow, DateTimeKind.Utc),
            invitationStatus
        );
    }

    private UserDto MapToUserDto(User u)
    {
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
            u.PostsCount
        );
    }
}
