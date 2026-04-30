using BSkyClone.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Repositories;

public interface INotificationRepository : IRepository<Notification>
{
    Task<IEnumerable<Notification>> GetUserNotificationsAsync(Guid userId, int limit = 50, DateTime? cursor = null);
    Task<int> GetUnreadCountAsync(Guid userId);
    Task MarkAllAsReadAsync(Guid userId);
}
