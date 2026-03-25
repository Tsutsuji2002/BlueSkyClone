using BSkyClone.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface IChatService
{
    Task<IEnumerable<ConversationDto>> GetConversationsAsync(Guid userId);
    Task<ConversationDto?> GetConversationAsync(Guid userId, string conversationId);
    Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid userId, string conversationId, int limit = 50, DateTimeOffset? before = null);
    Task<ConversationDto> GetOrCreateConversationAsync(Guid userId, List<string> participantIds);
    Task<MessageDto> SendMessageAsync(Guid userId, string conversationId, string? content, string? imageUrl = null, string? replyToId = null, LinkPreviewDto? linkPreview = null);
    Task<MessageDto> EditMessageAsync(Guid userId, string messageId, string newContent);
    Task<MessageDto> RecallMessageAsync(Guid userId, string messageId);
    Task<MessageDto> AddOrUpdateReactionAsync(Guid userId, string messageId, string emoji);
    Task<IEnumerable<MessageDto>> ForwardMessageAsync(Guid userId, string messageId, List<string> targetConversationIds);
    Task MarkAsReadAsync(Guid userId, string conversationId);
    Task<List<Guid>> GetParticipantIdsAsync(string conversationId);
    Task<ChatLogResult> GetLogAsync(Guid userId, string conversationId, string? cursor);
}

public record ChatLogResult(IEnumerable<MessageDto> Messages, string? Cursor);

