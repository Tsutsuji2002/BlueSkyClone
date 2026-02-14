using System;
using System.Text.Json.Serialization;

namespace BSkyClone.DTOs;

public record NotificationDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("sender")] UserDto Sender,
    [property: JsonPropertyName("postId")] Guid? PostId,
    [property: JsonPropertyName("listId")] Guid? ListId,
    [property: JsonPropertyName("title")] string? Title,
    [property: JsonPropertyName("content")] string? Content,
    [property: JsonPropertyName("isRead")] bool IsRead,
    [property: JsonPropertyName("createdAt")] DateTime CreatedAt,
    [property: JsonPropertyName("invitationStatus")] int? InvitationStatus = null
);

public record MarkNotificationAsReadRequest(
    Guid NotificationId
);
