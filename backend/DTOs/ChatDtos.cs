using System;
using System.Collections.Generic;

namespace BSkyClone.DTOs;

public record ConversationDto(
    string Id,
    List<UserDto> Participants,
    MessageDto? LastMessage,
    int UnreadCount,
    DateTimeOffset CreatedAt
);

public record MessageReactionDto(
    string UserId,
    string Emoji,
    string? DisplayName = null
);

public record MessageDto(
    string Id,
    string ConversationId,
    string SenderId,
    string? Content,
    string? ImageUrl,
    DateTimeOffset CreatedAt,
    bool IsRead,
    bool IsModified = false,
    bool IsRecalled = false,
    UserDto? Sender = null,
    LinkPreviewDto? LinkPreview = null,
    MessageDto? ReplyTo = null,
    List<MessageReactionDto>? Reactions = null
);

public record SendMessageRequest(
    string? Content,
    string? ImageUrl = null,
    Guid? ReplyToId = null,
    string? LinkPreviewUrl = null,
    string? LinkPreviewTitle = null,
    string? LinkPreviewDescription = null,
    string? LinkPreviewImage = null,
    string? LinkPreviewDomain = null
);

public record EditMessageRequest(
    string Content
);

public record AddReactionRequest(
    string Emoji
);

public record ForwardMessageRequest(
    List<Guid> TargetConversationIds
);

public record CreateConversationRequest(
    List<string> ParticipantIds
);
