using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class MessageRepository : Repository<Message>, IMessageRepository
{
    public MessageRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Message>> GetConversationMessagesAsync(Guid conversationId, int limit = 50, DateTime? before = null)
    {
        var query = _dbSet
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Where(m => m.ConversationId == conversationId && (m.IsDeleted == false || m.IsDeleted == null));

        if (before.HasValue)
        {
            query = query.Where(m => m.CreatedAt < before.Value);
        }

        return await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .Reverse()
            .ToListAsync();
    }

    public async Task MarkAsReadAsync(Guid conversationId, Guid userId)
    {
        var unreadMessages = await _dbSet
            .Where(m => m.ConversationId == conversationId && m.SenderId != userId && (m.IsRead == false || m.IsRead == null))
            .ToListAsync();

        foreach (var message in unreadMessages)
        {
            message.IsRead = true;
        }
    }

    public async Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId)
    {
        return await _dbSet
            .CountAsync(m => m.ConversationId == conversationId 
                && m.SenderId != userId 
                && (m.IsRead == false || m.IsRead == null)
                && (m.IsDeleted == false || m.IsDeleted == null));
    }
}
