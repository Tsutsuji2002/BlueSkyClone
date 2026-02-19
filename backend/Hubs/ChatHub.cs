using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BSkyClone.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IChatService _chatService;

    public ChatHub(IChatService chatService)
    {
        _chatService = chatService;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserIdFromContext();
        if (userId != Guid.Empty)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user-{userId}");
        }
        await base.OnConnectedAsync();
    }

    public async Task SendMessage(string conversationId, string? content, string? imageUrl = null, string? replyToId = null, LinkPreviewDto? linkPreview = null)
    {
        var userId = GetUserIdFromContext();
        if (userId == Guid.Empty) throw new HubException("Unauthorized");

        if (!Guid.TryParse(conversationId, out var convId))
            throw new HubException("Invalid conversation ID format.");

        Guid? rId = null;
        if (!string.IsNullOrEmpty(replyToId) && Guid.TryParse(replyToId, out var parsedReplyId))
            rId = parsedReplyId;

        try
        {
            var messageDto = await _chatService.SendMessageAsync(userId, convId, content, imageUrl, rId, linkPreview);
            var participantIds = await _chatService.GetParticipantIdsAsync(convId);
            
            foreach (var pId in participantIds)
            {
                await Clients.Group($"user-{pId}").SendAsync("ReceiveMessage", messageDto);
            }
        }
        catch (Exception ex) { throw new HubException(ex.Message); }
    }

    public async Task EditMessage(string messageId, string newContent)
    {
        var userId = GetUserIdFromContext();
        if (userId == Guid.Empty) throw new HubException("Unauthorized");

        if (!Guid.TryParse(messageId, out var msgId))
            throw new HubException("Invalid message ID format.");

        try
        {
            var messageDto = await _chatService.EditMessageAsync(userId, msgId, newContent);
            var participantIds = await _chatService.GetParticipantIdsAsync(messageDto.ConversationId);
            
            foreach (var pId in participantIds)
            {
                await Clients.Group($"user-{pId}").SendAsync("UpdateMessage", messageDto);
            }
        }
        catch (Exception ex) { throw new HubException(ex.Message); }
    }

    public async Task RecallMessage(string messageId)
    {
        var userId = GetUserIdFromContext();
        if (userId == Guid.Empty) throw new HubException("Unauthorized");

        if (!Guid.TryParse(messageId, out var msgId))
            throw new HubException("Invalid message ID format.");

        try
        {
            var messageDto = await _chatService.RecallMessageAsync(userId, msgId);
            var participantIds = await _chatService.GetParticipantIdsAsync(messageDto.ConversationId);
            
            foreach (var pId in participantIds)
            {
                await Clients.Group($"user-{pId}").SendAsync("UpdateMessage", messageDto);
            }
        }
        catch (Exception ex) { throw new HubException(ex.Message); }
    }

    public async Task AddReaction(string messageId, string emoji)
    {
        var userId = GetUserIdFromContext();
        if (userId == Guid.Empty) throw new HubException("Unauthorized");

        if (!Guid.TryParse(messageId, out var msgId))
            throw new HubException("Invalid message ID format.");

        try
        {
            var messageDto = await _chatService.AddOrUpdateReactionAsync(userId, msgId, emoji);
            var participantIds = await _chatService.GetParticipantIdsAsync(messageDto.ConversationId);
            
            foreach (var pId in participantIds)
            {
                await Clients.Group($"user-{pId}").SendAsync("UpdateMessage", messageDto);
            }
        }
        catch (Exception ex) { throw new HubException(ex.Message); }
    }

    private Guid GetUserIdFromContext()
    {
        var userIdString = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Guid.Empty;
        }
        return userId;
    }

    public async Task JoinConversation(string conversationId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, conversationId);
    }

    public async Task LeaveConversation(string conversationId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, conversationId);
    }
}
