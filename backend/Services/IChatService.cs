using BSkyClone.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface IChatService
{
    Task<IEnumerable<ConversationDto>> GetConversationsAsync(Guid userId);
    Task<ConversationDto?> GetConversationAsync(Guid userId, Guid conversationId);
    Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid userId, Guid conversationId, int limit = 50, DateTimeOffset? before = null);
    Task<ConversationDto> GetOrCreateConversationAsync(Guid userId, List<Guid> participantIds);
    Task<MessageDto> SendMessageAsync(Guid userId, Guid conversationId, string? content, string? imageUrl = null, Guid? replyToId = null, LinkPreviewDto? linkPreview = null);
    Task<MessageDto> EditMessageAsync(Guid userId, Guid messageId, string newContent);
    Task<MessageDto> RecallMessageAsync(Guid userId, Guid messageId);
    Task<MessageDto> AddOrUpdateReactionAsync(Guid userId, Guid messageId, string emoji);
    Task<IEnumerable<MessageDto>> ForwardMessageAsync(Guid userId, Guid messageId, List<Guid> targetConversationIds);
    Task MarkAsReadAsync(Guid userId, Guid conversationId);
    Task<List<Guid>> GetParticipantIdsAsync(Guid conversationId);
}
