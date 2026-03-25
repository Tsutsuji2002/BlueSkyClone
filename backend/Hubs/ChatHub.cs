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

        try
        {
            var messageDto = await _chatService.SendMessageAsync(userId, conversationId, content, imageUrl, replyToId, linkPreview);
            // Broadcast to the conversation group
            await Clients.Group(conversationId).SendAsync("ReceiveMessage", messageDto);
            
            // Still broadcast to participants' personal groups if they are local
            var participantIds = await _chatService.GetParticipantIdsAsync(conversationId);
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

        try
        {
            var messageDto = await _chatService.EditMessageAsync(userId, messageId, newContent);
            var participantIds = await _chatService.GetParticipantIdsAsync(messageDto.ConversationId);
            
            foreach (var pId in participantIds)
            {
                await Clients.Group($"user-{pId}").SendAsync("UpdateMessage", messageDto);
            }
            await Clients.Group(messageDto.ConversationId).SendAsync("UpdateMessage", messageDto);
        }
        catch (Exception ex) { throw new HubException(ex.Message); }
    }

    public async Task RecallMessage(string messageId)
    {
        var userId = GetUserIdFromContext();
        if (userId == Guid.Empty) throw new HubException("Unauthorized");

        try
        {
            var messageDto = await _chatService.RecallMessageAsync(userId, messageId);
            var participantIds = await _chatService.GetParticipantIdsAsync(messageDto.ConversationId);
            
            foreach (var pId in participantIds)
            {
                await Clients.Group($"user-{pId}").SendAsync("UpdateMessage", messageDto);
            }
            await Clients.Group(messageDto.ConversationId).SendAsync("UpdateMessage", messageDto);
        }
        catch (Exception ex) { throw new HubException(ex.Message); }
    }

    public async Task AddReaction(string conversationId, string messageId, string emoji)
    {
        var userId = GetUserIdFromContext();
        if (userId == Guid.Empty) throw new HubException("Unauthorized");

        try
        {
            var messageDto = await _chatService.AddOrUpdateReactionAsync(userId, conversationId, messageId, emoji);
            var participantIds = await _chatService.GetParticipantIdsAsync(messageDto.ConversationId);
            
            foreach (var pId in participantIds)
            {
                await Clients.Group($"user-{pId}").SendAsync("UpdateMessage", messageDto);
            }
            await Clients.Group(messageDto.ConversationId).SendAsync("UpdateMessage", messageDto);
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
