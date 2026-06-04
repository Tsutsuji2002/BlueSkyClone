using BSkyClone.DTOs;
using BSkyClone.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface INotificationService
{
    Task<PagedNotificationsDto> GetNotificationsAsync(Guid userId, int limit = 50, string? cursor = null);
    Task<int> GetUnreadCountAsync(Guid userId, System.Threading.CancellationToken ct = default);
    Task MarkAsReadAsync(Guid userId, Guid notificationId);
    Task MarkAllAsReadAsync(Guid userId);
    Task CreateNotificationAsync(Notification notification);
}
