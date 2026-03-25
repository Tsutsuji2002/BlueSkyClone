using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BSkyClone.DTOs;

namespace BSkyClone.Services
{
    public interface IChatProxyService
    {
        Task<IEnumerable<ConversationDto>> GetConversationsAsync(string token, int limit = 50, string? cursor = null);
        Task<ConversationDto?> GetConversationAsync(string token, string conversationId);
        Task<IEnumerable<MessageDto>> GetMessagesAsync(string token, string conversationId, int limit = 50, string? cursor = null);
        Task<MessageDto> SendMessageAsync(string token, string conversationId, string content);
        Task<bool> UpdateReadAsync(string token, string conversationId, string? messageId = null);
        Task<ConversationDto> GetOrCreateConversationAsync(string token, List<string> members);
    }
}
