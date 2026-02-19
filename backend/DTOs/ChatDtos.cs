using System;
using System.Collections.Generic;

namespace BSkyClone.DTOs;

public record ConversationDto(
    Guid Id,
    List<UserDto> Participants,
    MessageDto? LastMessage,
    int UnreadCount,
    DateTimeOffset CreatedAt
);

public record MessageReactionDto(
    Guid UserId,
    string Emoji,
    string? DisplayName = null
);

public record MessageDto(
    Guid Id,
    Guid ConversationId,
    Guid SenderId,
    string? Content,
    string? ImageUrl,
    string? AltText,
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
    string? ImageAltText = null,
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
