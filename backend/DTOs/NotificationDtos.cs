using System;
using System.Text.Json.Serialization;

namespace BSkyClone.DTOs;

public record NotificationDto(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("uri")] string Uri,
    [property: JsonPropertyName("cid")] string Cid,
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("reason")] string Reason,
    [property: JsonPropertyName("reasonSubject")] string? ReasonSubject,
    [property: JsonPropertyName("sender")] UserDto Sender,
    [property: JsonPropertyName("postId")] string? PostId,
    [property: JsonPropertyName("postAuthorHandle")] string? PostAuthorHandle,
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

public record PagedNotificationsDto(
    [property: JsonPropertyName("notifications")] IEnumerable<NotificationDto> Notifications,
    [property: JsonPropertyName("cursor")] string? Cursor
);
