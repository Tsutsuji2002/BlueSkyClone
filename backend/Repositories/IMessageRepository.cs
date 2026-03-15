using BSkyClone.Models;

namespace BSkyClone.Repositories;

public interface IMessageRepository : IRepository<Message>
{
    Task<IEnumerable<Message>> GetConversationMessagesAsync(Guid conversationId, int limit = 50, DateTime? before = null);
    Task MarkAsReadAsync(Guid conversationId, Guid userId);
    Task<int> GetUnreadCountAsync(Guid conversationId, Guid userId);
    Task<Dictionary<Guid, int>> GetUnreadCountsAsync(IEnumerable<Guid> conversationIds, Guid userId);
}
