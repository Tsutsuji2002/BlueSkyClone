using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BSkyClone.Repositories;

public class NotificationRepository : Repository<Notification>, INotificationRepository
{
    public NotificationRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Notification>> GetUserNotificationsAsync(Guid userId, int limit = 50)
    {
        return await _dbSet
            .Include(n => n.Sender)
            .Include(n => n.Post)
                .ThenInclude(p => p!.Author)
            .Where(n => n.RecipientId == userId 
                && n.Type != "message"
                && (n.IsDeleted == false || n.IsDeleted == null))
            .OrderByDescending(n => n.CreatedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(Guid userId)
    {
        return await _dbSet
            .CountAsync(n => n.RecipientId == userId 
                && n.Type != "message"
                && (n.IsRead == false || n.IsRead == null) 
                && (n.IsDeleted == false || n.IsDeleted == null));
    }

    public async Task MarkAllAsReadAsync(Guid userId)
    {
        var unread = await _dbSet
            .Where(n => n.RecipientId == userId 
                && n.Type != "message"
                && (n.IsRead == false || n.IsRead == null))
            .ToListAsync();

        foreach (var n in unread)
        {
            n.IsRead = true;
        }
    }
}
