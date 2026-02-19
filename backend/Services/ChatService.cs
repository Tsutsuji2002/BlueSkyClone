using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using BSkyClone.Hubs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public class ChatService : IChatService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILinkService _linkService;
    private readonly ICacheService _cacheService;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatService(IUnitOfWork unitOfWork, ILinkService linkService, ICacheService cacheService, IHubContext<ChatHub> hubContext)
    {
        _unitOfWork = unitOfWork;
        _linkService = linkService;
        _cacheService = cacheService;
        _hubContext = hubContext;
    }

    public async Task<IEnumerable<ConversationDto>> GetConversationsAsync(Guid userId)
    {
        var cacheKey = $"user:{userId}:conversations";
        var cached = await _cacheService.GetAsync<IEnumerable<ConversationDto>>(cacheKey);
        if (cached != null) return cached;

        var conversations = await _unitOfWork.Conversations.GetUserConversationsAsync(userId);
        var dtos = new List<ConversationDto>();
        foreach (var c in conversations)
        {
            var unreadCount = await _unitOfWork.Messages.GetUnreadCountAsync(c.Id, userId);
            dtos.Add(MapToConversationDto(c, userId, unreadCount));
        }

        await _cacheService.SetAsync(cacheKey, (IEnumerable<ConversationDto>)dtos, TimeSpan.FromMinutes(10));
        return dtos;
    }

    public async Task<ConversationDto?> GetConversationAsync(Guid userId, Guid conversationId)
    {
        // For single conversation, we can check if it's in the user's conversation list cache
        // but for now, we'll just implement a simple cache for the specific conversation
        var cacheKey = $"user:{userId}:conv:{conversationId}";
        var cached = await _cacheService.GetAsync<ConversationDto>(cacheKey);
        if (cached != null) return cached;

        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(conversationId);
        if (conversation == null || !conversation.ConversationParticipants.Any(p => p.UserId == userId))
        {
            return null;
        }

        var unreadCount = await _unitOfWork.Messages.GetUnreadCountAsync(conversationId, userId);
        var dto = MapToConversationDto(conversation, userId, unreadCount);
        
        await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(10));
        return dto;
    }

    public async Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid userId, Guid conversationId, int limit = 50, DateTimeOffset? before = null)
    {
        // Don't cache when fetching historical messages (before is set) for simplicity
        if (!before.HasValue && limit == 50)
        {
            var cacheKey = $"conv:{conversationId}:messages";
            var cached = await _cacheService.GetAsync<IEnumerable<MessageDto>>(cacheKey);
            if (cached != null)
            {
                // When serving from cache, we still need to mark as read
                await MarkAsReadAsync(userId, conversationId);
                return cached;
            }
        }

        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(conversationId);
        if (conversation == null || !conversation.ConversationParticipants.Any(p => p.UserId == userId))
        {
            throw new Exception("Conversation not found or access denied");
        }

        // When user fetches messages, mark the conversation as read
        await MarkAsReadAsync(userId, conversationId);

        var query = _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .Where(m => m.ConversationId == conversationId && (m.IsDeleted == false || m.IsDeleted == null));

        if (before.HasValue)
        {
            var beforeUtc = before.Value.UtcDateTime;
            query = query.Where(m => m.CreatedAt < beforeUtc);
        }

        var messages = await query
            .OrderByDescending(m => m.CreatedAt)
            .Take(limit)
            .ToListAsync();

        var dtos = messages.OrderBy(m => m.CreatedAt).Select(MapToMessageDto).ToList();

        if (!before.HasValue && limit == 50)
        {
            await _cacheService.SetAsync($"conv:{conversationId}:messages", (IEnumerable<MessageDto>)dtos, TimeSpan.FromMinutes(5));
        }

        return dtos;
    }

    public async Task<ConversationDto> GetOrCreateConversationAsync(Guid userId, List<Guid> participantIds)
    {
        if (!participantIds.Contains(userId))
        {
            participantIds.Add(userId);
        }

        var existingConversations = await _unitOfWork.Conversations.Query()
            .Include(c => c.ConversationParticipants)
            .Where(c => c.ConversationParticipants.Count == participantIds.Count)
            .ToListAsync();

        var existing = existingConversations.FirstOrDefault(c => 
            c.ConversationParticipants.All(p => participantIds.Contains(p.UserId)));

        if (existing != null)
        {
            var fullConv = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(existing.Id);
            var unreadCount = await _unitOfWork.Messages.GetUnreadCountAsync(existing.Id, userId);
            return MapToConversationDto(fullConv!, userId, unreadCount);
        }

        var newConversation = new Conversation
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        foreach (var pId in participantIds)
        {
            newConversation.ConversationParticipants.Add(new ConversationParticipant
            {
                UserId = pId,
                JoinedAt = DateTime.UtcNow
            });
            // Prepare to invalidate these users' conversation list caches
            await _cacheService.RemoveAsync($"user:{pId}:conversations");
        }

        await _unitOfWork.Conversations.AddAsync(newConversation);
        await _unitOfWork.CompleteAsync();

        var created = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(newConversation.Id);
        return MapToConversationDto(created!, userId, 0);
    }

    public async Task<MessageDto> SendMessageAsync(Guid userId, Guid conversationId, string? content, string? imageUrl = null, Guid? replyToId = null, LinkPreviewDto? linkPreviewDto = null)
    {
        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(conversationId);
        if (conversation == null || !conversation.ConversationParticipants.Any(p => p.UserId == userId))
        {
            throw new Exception("Conversation not found or access denied");
        }

        var message = new Message
        {
            Id = Guid.NewGuid(),
            Tid = GenerateTid(),
            ConversationId = conversationId,
            SenderId = userId,
            Content = content,
            ImageUrl = imageUrl,
            ReplyToId = replyToId,
            CreatedAt = DateTime.UtcNow,
            IsRead = false,
            IsDeleted = false,
            IsModified = false,
            IsRecalled = false
        };

        if (!string.IsNullOrEmpty(content))
        {
            // Internal variable to hold the preview to save
            LinkPreview? previewToSave = null;

            if (linkPreviewDto != null && !string.IsNullOrEmpty(linkPreviewDto.Url))
            {
                 previewToSave = new LinkPreview
                 {
                     Id = Guid.NewGuid(),
                     MessageId = message.Id,
                     Url = linkPreviewDto.Url,
                     Title = linkPreviewDto.Title,
                     Description = linkPreviewDto.Description,
                     Image = linkPreviewDto.Image,
                     Domain = linkPreviewDto.Domain ?? new Uri(linkPreviewDto.Url).Host.Replace("www.", ""),
                     CreatedAt = DateTime.UtcNow
                 };
            }
            else
            {
                 previewToSave = await _linkService.GetLinkPreviewAsync(content);
                 if (previewToSave != null)
                 {
                     previewToSave.MessageId = message.Id;
                 }
            }

            if (previewToSave != null)
            {
                message.LinkPreview = previewToSave;
            }
        }

        await _unitOfWork.Messages.AddAsync(message);
        await _unitOfWork.CompleteAsync();

        // Invalidate caches
        await _cacheService.RemoveAsync($"conv:{conversationId}:messages");
        foreach (var p in conversation.ConversationParticipants)
        {
            await _cacheService.RemoveAsync($"user:{p.UserId}:conversations");
            await _cacheService.RemoveAsync($"user:{p.UserId}:conv:{conversationId}");
        }

        var savedMessage = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == message.Id);

        // Send SignalR notifications for other participants
        foreach (var p in conversation.ConversationParticipants.Where(p => p.UserId != userId))
        {
            var notification = new Notification
            {
                Id = Guid.NewGuid(),
                Tid = GenerateTid(),
                Type = "message",
                SenderId = userId,
                RecipientId = p.UserId,
                Title = "Tin nhắn mới",
                Content = content?.Length > 50 ? content.Substring(0, 47) + "..." : content,
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false,
                Sender = savedMessage?.Sender!
            };
            
            await SendNotificationAsync(notification);
        }

        return MapToMessageDto(savedMessage!);
    }

    public async Task<MessageDto> EditMessageAsync(Guid userId, Guid messageId, string newContent)
    {
        var message = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null || message.SenderId != userId || message.IsRecalled)
        {
            throw new Exception("Message not found or cannot be edited");
        }

        message.Content = newContent;
        message.IsModified = true;

        if (!string.IsNullOrEmpty(newContent))
        {
            var linkPreview = await _linkService.GetLinkPreviewAsync(newContent);
            if (linkPreview != null)
            {
                if (message.LinkPreview != null)
                {
                    _unitOfWork.LinkPreviews.Remove(message.LinkPreview);
                }
                linkPreview.MessageId = message.Id;
                message.LinkPreview = linkPreview;
            }
        }

        await _unitOfWork.CompleteAsync();

        // Invalidate message cache
        await _cacheService.RemoveAsync($"conv:{message.ConversationId}:messages");

        return MapToMessageDto(message);
    }

    public async Task<MessageDto> RecallMessageAsync(Guid userId, Guid messageId)
    {
        var message = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null || message.SenderId != userId)
        {
            throw new Exception("Message not found or cannot be recalled");
        }

        message.IsRecalled = true;
        message.Content = null;
        message.ImageUrl = null;
        if (message.LinkPreview != null)
        {
            _unitOfWork.LinkPreviews.Remove(message.LinkPreview);
            message.LinkPreview = null;
        }

        await _unitOfWork.CompleteAsync();

        // Invalidate message cache
        await _cacheService.RemoveAsync($"conv:{message.ConversationId}:messages");

        return MapToMessageDto(message);
    }

    public async Task<MessageDto> AddOrUpdateReactionAsync(Guid userId, Guid messageId, string emoji)
    {
        var existingReaction = await _unitOfWork.MessageReactions.Query()
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

        Guid conversationId = Guid.Empty;

        if (existingReaction != null)
        {
            if (existingReaction.Emoji == emoji)
            {
                // Toggle off
                _unitOfWork.MessageReactions.Remove(existingReaction);
            }
            else
            {
                // Update emoji
                existingReaction.Emoji = emoji;
                existingReaction.CreatedAt = DateTime.UtcNow;
            }
        }
        else
        {
            // Verify message exists before adding
            var message = await _unitOfWork.Messages.Query().FirstOrDefaultAsync(m => m.Id == messageId && !m.IsRecalled);
            if (message == null)
            {
                throw new Exception("Message not found or has been recalled");
            }
            conversationId = message.ConversationId;

            var reaction = new MessageReaction
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                UserId = userId,
                Emoji = emoji,
                CreatedAt = DateTime.UtcNow
            };
            await _unitOfWork.MessageReactions.AddAsync(reaction);
        }

        await _unitOfWork.CompleteAsync();

        // Fetch the message with updated reactions to return
        var updatedMessage = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (updatedMessage == null) throw new Exception("Message disappeared after update");

        // Invalidate message cache
        await _cacheService.RemoveAsync($"conv:{updatedMessage.ConversationId}:messages");

        return MapToMessageDto(updatedMessage);
    }

    public async Task<IEnumerable<MessageDto>> ForwardMessageAsync(Guid userId, Guid messageId, List<Guid> targetConversationIds)
    {
        var originalMessage = await _unitOfWork.Messages.Query()
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (originalMessage == null || originalMessage.IsRecalled)
        {
            throw new Exception("Message not found");
        }

        var forwardedMessages = new List<MessageDto>();
        foreach (var convId in targetConversationIds)
        {
            var msg = await SendMessageAsync(userId, convId, originalMessage.Content, originalMessage.ImageUrl);
            forwardedMessages.Add(msg);
        }

        return forwardedMessages;
    }

    public async Task MarkAsReadAsync(Guid userId, Guid conversationId)
    {
        await _unitOfWork.Messages.MarkAsReadAsync(conversationId, userId);
        await _unitOfWork.CompleteAsync();
        
        // Invalidate conversation-related caches specifically for the user
        await _cacheService.RemoveAsync($"user:{userId}:conversations");
        await _cacheService.RemoveAsync($"user:{userId}:conv:{conversationId}");
    }

    public async Task<List<Guid>> GetParticipantIdsAsync(Guid conversationId)
    {
        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(conversationId);
        return conversation?.ConversationParticipants.Select(p => p.UserId).ToList() ?? new List<Guid>();
    }

    private ConversationDto MapToConversationDto(Conversation c, Guid userId, int unreadCount)
    {
        var participants = c.ConversationParticipants.Select(p => MapToUserDto(p.User)).ToList();
        var lastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        
        return new ConversationDto(
            c.Id,
            participants,
            lastMessage != null ? MapToMessageDto(lastMessage) : null,
            unreadCount,
            c.CreatedAt.HasValue ? DateTime.SpecifyKind(c.CreatedAt.Value, DateTimeKind.Utc) : DateTimeOffset.UtcNow
        );
    }

    private MessageDto MapToMessageDto(Message m)
    {
        return new MessageDto(
            m.Id,
            m.ConversationId,
            m.SenderId,
            m.Content,
            m.ImageUrl,
            m.AltText,
            m.CreatedAt.HasValue ? DateTime.SpecifyKind(m.CreatedAt.Value, DateTimeKind.Utc) : DateTimeOffset.UtcNow,
            m.IsRead ?? false,
            m.IsModified,
            m.IsRecalled,
            m.Sender != null ? MapToUserDto(m.Sender) : null,
            m.LinkPreview == null ? null : new LinkPreviewDto
            {
                Url = m.LinkPreview.Url,
                Title = m.LinkPreview.Title,
                Description = m.LinkPreview.Description,
                Image = m.LinkPreview.Image,
                Domain = m.LinkPreview.Domain
            },
            m.ReplyTo != null ? MapToMessageDtoSimple(m.ReplyTo) : null,
            m.Reactions?.Select(r => new MessageReactionDto(r.UserId, r.Emoji, r.User?.DisplayName)).ToList()
        );
    }

    private MessageDto MapToMessageDtoSimple(Message m)
    {
        return new MessageDto(
            m.Id,
            m.ConversationId,
            m.SenderId,
            m.Content,
            m.ImageUrl,
            m.AltText,
            m.CreatedAt.HasValue ? DateTime.SpecifyKind(m.CreatedAt.Value, DateTimeKind.Utc) : DateTimeOffset.UtcNow,
            m.IsRead ?? false,
            m.IsModified,
            m.IsRecalled,
            m.Sender != null ? MapToUserDto(m.Sender) : null
        );
    }

    private UserDto MapToUserDto(User u)
    {
        return new UserDto(
            u.Id,
            u.Username,
            u.Handle,
            u.Email,
            u.DisplayName,
            u.AvatarUrl,
            u.CoverImageUrl,
            u.Bio,
            u.Location,
            u.Website,
            u.DateOfBirth,
            u.FollowersCount,
            u.FollowingCount,
            u.PostsCount
        );
    }

    private string GenerateTid()
    {
        return DateTime.UtcNow.Ticks.ToString();
    }

    private async Task SendNotificationAsync(Notification notification)
    {
        var notificationDto = new NotificationDto(
            notification.Id,
            notification.Type ?? "message",
            MapToUserDto(notification.Sender),
            notification.PostId,
            notification.ListId,
            notification.Title,
            notification.Content,
            notification.IsRead ?? false,
            DateTime.SpecifyKind(notification.CreatedAt ?? DateTime.UtcNow, DateTimeKind.Utc)
        );

        await _hubContext.Clients.Group($"user-{notification.RecipientId}")
            .SendAsync("ReceiveNotification", notificationDto);
    }
}
