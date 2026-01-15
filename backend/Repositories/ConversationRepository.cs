using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Repositories;

public class ConversationRepository : Repository<Conversation>, IConversationRepository
{
    public ConversationRepository(BSkyDbContext context) : base(context)
    {
    }

    public async Task<IEnumerable<Conversation>> GetUserConversationsAsync(Guid userId)
    {
        return await _dbSet
            .Include(c => c.ConversationParticipants)
                .ThenInclude(p => p.User)
            .Include(c => c.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .Where(c => c.ConversationParticipants.Any(p => p.UserId == userId) 
                && (c.IsDeleted == false || c.IsDeleted == null)
                && c.Messages.Any()) // Only show conversations with messages
            .OrderByDescending(c => c.Messages.Max(m => m.CreatedAt) ?? c.CreatedAt)
            .ToListAsync();
    }

    public async Task<Conversation?> GetConversationWithParticipantsAsync(Guid conversationId)
    {
        return await _dbSet
            .Include(c => c.ConversationParticipants)
                .ThenInclude(p => p.User)
            .FirstOrDefaultAsync(c => c.Id == conversationId);
    }
}
