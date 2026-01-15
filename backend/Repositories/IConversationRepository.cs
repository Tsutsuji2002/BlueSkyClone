using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IConversationRepository : IRepository<Conversation>
{
    Task<IEnumerable<Conversation>> GetUserConversationsAsync(Guid userId);
    Task<Conversation?> GetConversationWithParticipantsAsync(Guid conversationId);
}
