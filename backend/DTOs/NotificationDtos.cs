using System;

namespace BSkyClone.DTOs;

public record NotificationDto(
    Guid Id,
    string Type,
    UserDto Sender,
    Guid? PostId,
    bool IsRead,
    DateTime CreatedAt
);

public record MarkNotificationAsReadRequest(
    Guid NotificationId
);
