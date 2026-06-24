using BSkyClone.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface IChatService
{
    Task<IEnumerable<ConversationDto>> GetConversationsAsync(Guid userId, int limit = 50, string? cursor = null, bool? isRequest = null);
    Task<ConversationDto?> GetConversationAsync(Guid userId, string conversationId);
    Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid userId, string conversationId, int limit = 50, DateTimeOffset? before = null);
    Task<ConversationDto> GetOrCreateConversationAsync(Guid userId, List<string> participantIds);
    Task<MessageDto> SendMessageAsync(Guid userId, string conversationId, string? content, string? imageUrl = null, string? replyToId = null, LinkPreviewDto? linkPreview = null, string? replyToRev = null);
    Task<MessageDto> EditMessageAsync(Guid userId, string messageId, string newContent);
    Task<MessageDto> RecallMessageAsync(Guid userId, string messageId);
    Task<MessageDto> AddOrUpdateReactionAsync(Guid userId, string conversationId, string messageId, string emoji);
    Task<IEnumerable<MessageDto>> ForwardMessageAsync(Guid userId, string messageId, List<string> targetConversationIds);
    Task MarkAsReadAsync(Guid userId, string conversationId, string? messageId = null);
    Task DeleteMessageForSelfAsync(Guid userId, string conversationId, string messageId);
    Task<List<Guid>> GetParticipantIdsAsync(string conversationId);
    Task<ChatLogResult> GetLogAsync(Guid userId, string conversationId, string? cursor);
    Task<ChatSettingsDto> GetChatSettingsAsync(Guid userId);
    Task<(bool Success, string? Message)> UpdateChatSettingsAsync(Guid userId, string allowIncoming, string? allowGroupInvites = null);
    Task<bool> AcceptConversationAsync(Guid userId, string conversationId);
    Task<ConversationDto> AddMembersAsync(Guid userId, string conversationId, List<string> members);
    Task<ConversationDto> UpdateConversationNameAsync(Guid userId, string conversationId, string name);
    Task<JoinLinkDto?> GetInviteLinkAsync(Guid userId, string conversationId);
    Task<JoinLinkDto> CreateJoinLinkAsync(Guid userId, string conversationId, bool requireApproval, string joinRule);
    Task<JoinLinkDto> EditJoinLinkAsync(Guid userId, string conversationId, bool? requireApproval = null, string? joinRule = null);
    Task<JoinLinkDto> EnableInviteLinkAsync(Guid userId, string conversationId);
    Task<JoinLinkDto> DisableInviteLinkAsync(Guid userId, string conversationId);
    Task<bool> MuteConversationAsync(Guid userId, string conversationId);
    Task<bool> UnmuteConversationAsync(Guid userId, string conversationId);
    Task<bool> LockConversationAsync(Guid userId, string conversationId);
    Task<bool> UnlockConversationAsync(Guid userId, string conversationId);
}

public record ChatLogResult(IEnumerable<MessageDto> Messages, string? Cursor);

