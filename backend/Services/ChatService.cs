using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public class ChatService : IChatService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILinkService _linkService;

    public ChatService(IUnitOfWork unitOfWork, ILinkService linkService)
    {
        _unitOfWork = unitOfWork;
        _linkService = linkService;
    }

    public async Task<IEnumerable<ConversationDto>> GetConversationsAsync(Guid userId)
    {
        var conversations = await _unitOfWork.Conversations.GetUserConversationsAsync(userId);
        var dtos = new List<ConversationDto>();
        foreach (var c in conversations)
        {
            var unreadCount = await _unitOfWork.Messages.GetUnreadCountAsync(c.Id, userId);
            dtos.Add(MapToConversationDto(c, userId, unreadCount));
        }
        return dtos;
    }

    public async Task<ConversationDto?> GetConversationAsync(Guid userId, Guid conversationId)
    {
        var conversation = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(conversationId);
        if (conversation == null || !conversation.ConversationParticipants.Any(p => p.UserId == userId))
        {
            return null;
        }

        var unreadCount = await _unitOfWork.Messages.GetUnreadCountAsync(conversationId, userId);
        return MapToConversationDto(conversation, userId, unreadCount);
    }

    public async Task<IEnumerable<MessageDto>> GetConversationMessagesAsync(Guid userId, Guid conversationId, int limit = 50, DateTimeOffset? before = null)
    {
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

        return messages.OrderBy(m => m.CreatedAt).Select(MapToMessageDto);
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
        }

        await _unitOfWork.Conversations.AddAsync(newConversation);
        await _unitOfWork.CompleteAsync();

        var created = await _unitOfWork.Conversations.GetConversationWithParticipantsAsync(newConversation.Id);
        return MapToConversationDto(created!, userId, 0);
    }

    public async Task<MessageDto> SendMessageAsync(Guid userId, Guid conversationId, string? content, string? imageUrl = null, Guid? replyToId = null)
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
            var linkPreview = await _linkService.GetLinkPreviewAsync(content);
            if (linkPreview != null)
            {
                linkPreview.MessageId = message.Id;
                message.LinkPreview = linkPreview;
            }
        }

        await _unitOfWork.Messages.AddAsync(message);
        await _unitOfWork.CompleteAsync();

        var savedMessage = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == message.Id);

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
        return MapToMessageDto(message);
    }

    public async Task<MessageDto> AddOrUpdateReactionAsync(Guid userId, Guid messageId, string emoji)
    {
        var existingReaction = await _unitOfWork.MessageReactions.Query()
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId);

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
            var messageExists = await _unitOfWork.Messages.Query().AnyAsync(m => m.Id == messageId && (m.IsRecalled == false || m.IsRecalled == null));
            if (!messageExists)
            {
                throw new Exception("Message not found or has been recalled");
            }

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
        var message = await _unitOfWork.Messages.Query()
            .Include(m => m.Sender)
            .Include(m => m.LinkPreview)
            .Include(m => m.Reactions).ThenInclude(r => r.User)
            .Include(m => m.ReplyTo).ThenInclude(rm => rm!.Sender)
            .FirstOrDefaultAsync(m => m.Id == messageId);

        if (message == null) throw new Exception("Message disappeared after update");

        return MapToMessageDto(message);
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
}
