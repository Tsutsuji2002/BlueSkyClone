using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using BSkyClone.Hubs;
using System;
using System.Collections.Generic;
using BSkyClone.Utilities;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;

namespace BSkyClone.Services;

public class ChatService : IChatService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILinkService _linkService;
    private readonly ICacheService _cacheService;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly IChatProxyService _chatProxy;
    private readonly Microsoft.Extensions.Caching.Distributed.IDistributedCache _distributedCache;

    public ChatService(IUnitOfWork unitOfWork, ILinkService linkService, ICacheService cacheService, IHubContext<ChatHub> hubContext, IChatProxyService chatProxy, Microsoft.Extensions.Caching.Distributed.IDistributedCache distributedCache)
    {
        _unitOfWork = unitOfWork;
        _linkService = linkService;
        _cacheService = cacheService;
        _hubContext = hubContext;
        _chatProxy = chatProxy;
        _distributedCache = distributedCache;
    }

    public async Task<IEnumerable<ConversationDto>> GetConversationsAsync(Guid userId)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token))
        {
            try 
            {
                var proxyConvos = await _chatProxy.GetConversationsAsync(token);
                if (proxyConvos.Any()) return proxyConvos;
            }
            catch (Exception ex)
            {
                // Log and continue to local fallback
                System.Diagnostics.Debug.WriteLine($"Chat proxy fetch failed: {ex.Message}");
            }
        }

        var cacheKey = $"user:{userId}:conversations";
        var cached = await _cacheService.GetAsync<IEnumerable<ConversationDto>>(cacheKey);
        if (cached != null) return cached;

        var conversations = await _unitOfWork.Conversations.GetUserConversationsAsync(userId);
        var conversationIds = conversations.Select(c => c.Id).ToList();
        var unreadCounts = await _unitOfWork.Messages.GetUnreadCountsAsync(conversationIds, userId);

        var dtos = conversations.Select(c => 
        {
            unreadCounts.TryGetValue(c.Id, out var unreadCount);
            return MapToConversationDto(c, userId, unreadCount);
        }).ToList();

        await _cacheService.SetAsync(cacheKey, (IEnumerable<ConversationDto>)dtos, TimeSpan.FromMinutes(10));
        return dtos;
    }

    public async Task<ConversationDto?> GetConversationAsync(Guid userId, string conversationId)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token) && !IsGuid(conversationId))
        {
            return await _chatProxy.GetConversationAsync(token, conversationId);
        }

        var convId = Guid.TryParse(conversationId, out var g) ? g : Guid.Empty;
        var cacheKey = $"user:{userId}:conv:{conversationId}";
        var cached = await _cacheService.GetAsync<ConversationDto>(cacheKey);
        if (cached != null) return cached;

        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(convId);
        if (conversation == null || !conversation.ConversationParticipants.Any(p => p.UserId == userId))
        {
            return null;
        }

        var unreadCount = await _unitOfWork.Messages.GetUnreadCountAsync(convId, userId);
        var dto = MapToConversationDto(conversation, userId, unreadCount);
        
        await _cacheService.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(10));
        return dto;
    }

    public async Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid userId, string conversationId, int limit = 50, DateTimeOffset? before = null)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token) && !IsGuid(conversationId))
        {
            return await _chatProxy.GetMessagesAsync(token, conversationId, limit, before?.ToString("O"));
        }

        var convId = Guid.TryParse(conversationId, out var g) ? g : Guid.Empty;
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

        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(convId);
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
            .Where(m => m.ConversationId == convId && (m.IsDeleted == false || m.IsDeleted == null));

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

    public async Task<ConversationDto> GetOrCreateConversationAsync(Guid userId, List<string> participantIds)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token))
        {
            // For proxy, we need the participant IDs to be DIDs or handles
            // Assume the frontend sends DIDs/handles for remote users
            try 
            {
                return await _chatProxy.GetOrCreateConversationAsync(token, participantIds);
            }
            catch (Exception ex)
            {
                // Fallback to local or log error
                System.Diagnostics.Debug.WriteLine($"Proxy GetOrCreateConversation failed: {ex.Message}");
            }
        }

        var ids = new List<Guid>();
        foreach (var id in participantIds)
        {
            if (Guid.TryParse(id, out var g)) ids.Add(g);
        }

        if (!ids.Contains(userId))
        {
            ids.Add(userId);
        }

        var existingConversations = await _unitOfWork.Conversations.Query()
            .Include(c => c.ConversationParticipants)
            .Where(c => c.ConversationParticipants.Count == ids.Count)
            .ToListAsync();

        var existing = existingConversations.FirstOrDefault(c => 
            c.ConversationParticipants.All(p => ids.Contains(p.UserId)));

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

        foreach (var pId in ids)
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

    public async Task<MessageDto> SendMessageAsync(Guid userId, string conversationId, string? content, string? imageUrl = null, string? replyToId = null, LinkPreviewDto? linkPreviewDto = null)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token) && !IsGuid(conversationId))
        {
            return await _chatProxy.SendMessageAsync(token, conversationId, content ?? "");
        }

        var convId = Guid.TryParse(conversationId, out var g) ? g : Guid.Empty;
        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(convId);
        if (conversation == null || !conversation.ConversationParticipants.Any(p => p.UserId == userId))
        {
            throw new Exception("Conversation not found or access denied");
        }

        var message = new Message
        {
            Id = Guid.NewGuid(),
            Tid = GenerateTid(),
            ConversationId = convId,
            SenderId = userId,
            Content = content,
            ImageUrl = imageUrl,
            ReplyToId = Guid.TryParse(replyToId, out var rId) ? rId : null,
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

    public async Task<MessageDto> EditMessageAsync(Guid userId, string messageId, string newContent)
    {
        var msgId = Guid.TryParse(messageId, out var g) ? g : Guid.Empty;
        var message = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == msgId);

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

    public async Task<MessageDto> RecallMessageAsync(Guid userId, string messageId)
    {
        var msgId = Guid.TryParse(messageId, out var g) ? g : Guid.Empty;
        var message = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == msgId);

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

    public async Task<MessageDto> AddOrUpdateReactionAsync(Guid userId, string conversationId, string messageId, string emoji)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        
        if (!string.IsNullOrEmpty(token) && !IsGuid(messageId))
        {
            // For proxy messages, we use the proxy service
            var messages = await _chatProxy.GetMessagesAsync(token, conversationId, 100);
            var message = messages.FirstOrDefault(m => m.Id == messageId);
            
            if (message != null)
            {
                var userReaction = message.Reactions?.FirstOrDefault(r => r.UserId == userId.ToString() && r.Emoji == emoji);
                bool success;
                
                if (userReaction != null)
                {
                    success = await _chatProxy.RemoveReactionAsync(token, conversationId, messageId, emoji);
                }
                else
                {
                    success = await _chatProxy.AddReactionAsync(token, conversationId, messageId, emoji);
                }
                
                if (success)
                {
                    // Fetch updated message to return
                    var updatedMessages = await _chatProxy.GetMessagesAsync(token, conversationId, 100);
                    var updated = updatedMessages.FirstOrDefault(m => m.Id == messageId);
                    if (updated != null) return updated;
                }
            }
        }

        var msgId = Guid.TryParse(messageId, out var g) ? g : Guid.Empty;
        var existingReaction = await _unitOfWork.MessageReactions.Query()
            .FirstOrDefaultAsync(r => r.MessageId == msgId && r.UserId == userId);

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
            var message = await _unitOfWork.Messages.Query().FirstOrDefaultAsync(m => m.Id == msgId && !m.IsRecalled);
            if (message == null)
            {
                throw new Exception("Message not found or has been recalled");
            }

            var reaction = new MessageReaction
            {
                Id = Guid.NewGuid(),
                MessageId = msgId,
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
            .FirstOrDefaultAsync(m => m.Id == msgId);

        if (updatedMessage == null) throw new Exception("Message disappeared after update");

        // Invalidate message cache
        await _cacheService.RemoveAsync($"conv:{updatedMessage.ConversationId}:messages");

        return MapToMessageDto(updatedMessage);
    }

    public async Task<IEnumerable<MessageDto>> ForwardMessageAsync(Guid userId, string messageId, List<string> targetConversationIds)
    {
        var msgId = Guid.TryParse(messageId, out var g) ? g : Guid.Empty;
        var originalMessage = await _unitOfWork.Messages.Query()
            .FirstOrDefaultAsync(m => m.Id == msgId);

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

    public async Task MarkAsReadAsync(Guid userId, string conversationId)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token) && !IsGuid(conversationId))
        {
            await _chatProxy.UpdateReadAsync(token, conversationId);
            return;
        }

        var convId = Guid.TryParse(conversationId, out var g) ? g : Guid.Empty;
        await _unitOfWork.Messages.MarkAsReadAsync(convId, userId);
        await _unitOfWork.CompleteAsync();
        
        // Invalidate conversation-related caches specifically for the user
        await _cacheService.RemoveAsync($"user:{userId}:conversations");
        await _cacheService.RemoveAsync($"user:{userId}:conv:{conversationId}");
    }

    public async Task<List<Guid>> GetParticipantIdsAsync(string conversationId)
    {
        var convId = Guid.TryParse(conversationId, out var g) ? g : Guid.Empty;
        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(convId);
        return conversation?.ConversationParticipants.Select(p => p.UserId).ToList() ?? new List<Guid>();
    }

    public async Task<ChatLogResult> GetLogAsync(Guid userId, string conversationId, string? cursor)
    {
        var token = await _distributedCache.GetStringAsync($"BlueskyToken_{userId}");
        if (!string.IsNullOrEmpty(token) && !IsGuid(conversationId))
        {
             var messages = await _chatProxy.GetMessagesAsync(token, conversationId, 50, cursor);
             var nextCursor = messages.LastOrDefault()?.Id; // Simplified cursor logic for proxy
             return new ChatLogResult(messages, nextCursor);
        }

        var convId = Guid.TryParse(conversationId, out var g) ? g : Guid.Empty;
        // Validate access
        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(convId);
        if (conversation == null || !conversation.ConversationParticipants.Any(p => p.UserId == userId))
        {
            return new ChatLogResult(Enumerable.Empty<MessageDto>(), cursor);
        }

        var query = _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .Where(m => m.ConversationId == convId && (m.IsDeleted == false || m.IsDeleted == null));

        // If a cursor is provided, only fetch messages AFTER that cursor (the Tid of the last known message)
        if (!string.IsNullOrEmpty(cursor))
        {
            var cursorMsg = await _unitOfWork.Messages.Query()
                .FirstOrDefaultAsync(m => m.Tid == cursor && m.ConversationId == convId);
            if (cursorMsg?.CreatedAt != null)
            {
                var cursorTime = cursorMsg.CreatedAt.Value;
                query = query.Where(m => m.CreatedAt > cursorTime);
            }
        }

        var newMessages = await query
            .OrderBy(m => m.CreatedAt)
            .Take(50)
            .ToListAsync();

        if (!newMessages.Any())
        {
            return new ChatLogResult(Enumerable.Empty<MessageDto>(), cursor);
        }

        var dtos = newMessages.Select(MapToMessageDto).ToList();
        // New cursor is the Tid of the last message returned
        var newCursor = newMessages.Last().Tid ?? newMessages.Last().Id.ToString();
        return new ChatLogResult(dtos, newCursor);
    }

    private ConversationDto MapToConversationDto(Conversation c, Guid userId, int unreadCount)
    {
        var participants = c.ConversationParticipants.Select(p => MapToUserDto(p.User)).ToList();
        var lastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
        
        return new ConversationDto(
            c.Id.ToString(),
            participants,
            lastMessage != null ? MapToMessageDto(lastMessage) : null,
            unreadCount,
            c.CreatedAt.HasValue ? DateTime.SpecifyKind(c.CreatedAt.Value, DateTimeKind.Utc) : DateTimeOffset.UtcNow
        );
    }

    private bool IsGuid(string value) => Guid.TryParse(value, out _);

    private MessageDto MapToMessageDto(Message m)
    {
        return new MessageDto(
            m.Id.ToString(),
            m.ConversationId.ToString(),
            m.SenderId.ToString(),
            m.Content,
            m.ImageUrl,
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
            m.Reactions?.Select(r => new MessageReactionDto(r.UserId.ToString(), r.Emoji, r.User?.DisplayName)).ToList()
        );
    }

    private MessageDto MapToMessageDtoSimple(Message m)
    {
        return new MessageDto(
            m.Id.ToString(),
            m.ConversationId.ToString(),
            m.SenderId.ToString(),
            m.Content,
            m.ImageUrl,
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
            u.PostsCount,
            u.Role,
            null,
            u.IsVerified,
            u.Did
        );
    }

    private string GenerateTid()
    {
        return ProtocolUtils.GenerateTid();
    }

    private async Task SendNotificationAsync(Notification notification)
    {
        var notificationDto = new NotificationDto(
            notification.Id,
            $"at://local/app.bsky.notification.event/{notification.Tid}",
            "pseudo-cid-" + notification.Id,
            notification.Type ?? "message",
            notification.Type ?? "message",
            null,
            MapToUserDto(notification.Sender),
            notification.PostId?.ToString(),
            null,
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
