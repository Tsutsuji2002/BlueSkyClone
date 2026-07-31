using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using BSkyClone.DTOs;

namespace BSkyClone.Services
{
    public interface IChatProxyService
    {
        Task<IEnumerable<ConversationDto>> GetConversationsAsync(string token, int limit = 50, string? cursor = null);
        Task<IEnumerable<ConversationDto>> GetConvoRequestsAsync(string token, int limit = 50, string? cursor = null);
        Task<ConversationDto?> GetConversationAsync(string token, string conversationId);
        Task<IEnumerable<MessageDto>> GetMessagesAsync(string token, string conversationId, int limit = 50, string? cursor = null);
        Task<MessageDto> SendMessageAsync(string token, string conversationId, string content, string? replyToId = null, string? replyToRev = null, string? imageUrl = null, LinkPreviewDto? linkPreview = null);
        Task<bool> UpdateReadAsync(string token, string conversationId, string? messageId = null);
        Task<bool> AcceptConvoAsync(string token, string conversationId);
        Task<bool> DeclineConvoAsync(string token, string conversationId);
        Task<ConversationDto> GetOrCreateConversationAsync(string token, List<string> members);
        Task<ConversationDto> CreateConvoAsync(string token, List<string> members, string name);
        Task<ConversationDto> AddMembersAsync(string token, string conversationId, List<string> members);
        Task<ConversationDto> EditGroupAsync(string token, string conversationId, string displayName);
        Task<JoinLinkDto> CreateJoinLinkAsync(string token, string conversationId, bool requireApproval, string joinRule);
        Task<JoinLinkDto> EditJoinLinkAsync(string token, string conversationId, bool? requireApproval = null, string? joinRule = null);
        Task<JoinLinkDto> EnableJoinLinkAsync(string token, string conversationId);
        Task<JoinLinkDto> DisableJoinLinkAsync(string token, string conversationId);
        Task<bool> AddReactionAsync(string token, string conversationId, string messageId, string emoji);
        Task<bool> RemoveReactionAsync(string token, string conversationId, string messageId, string emoji);
        Task<bool> DeleteMessageForSelfAsync(string token, string conversationId, string messageId);
        Task<ChatSettingsDto> GetChatDeclarationAsync(string token, string did);
        Task<(bool Success, string? Message)> UpdateChatDeclarationAsync(string token, string did, string allowIncoming, string? allowGroupInvites = null);
        Task<bool> MuteConversationAsync(string token, string conversationId);
        Task<bool> UnmuteConversationAsync(string token, string conversationId);
        Task<bool> LockConversationAsync(string token, string conversationId);
        Task<bool> UnlockConversationAsync(string token, string conversationId);
        Task<ConversationDto> RemoveMembersAsync(string token, string conversationId, List<string> members);
    }
}
