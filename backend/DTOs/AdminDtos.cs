using System;
using System.Text.Json.Serialization;

namespace BSkyClone.DTOs;

public record AdminStatsDto(
    int TotalUsers,
    int TotalPosts,
    int TotalFeeds,
    int ActiveUsersToday,
    int NewPostsToday,
    int BannedUsers,
    int TotalLists,
    int TotalConversations,
    int TotalNotifications
);

public record AdminUserDto(
    Guid Id,
    string Handle,
    string Email,
    string? DisplayName,
    string? AvatarUrl,
    int FollowersCount,
    int PostsCount,
    bool IsBanned,
    bool IsVerified,
    DateTime CreatedAt,
    string Role
);

public record AdminPostDto(
    Guid Id,
    string Tid,
    string Content,
    string AuthorHandle,
    string? AuthorDisplayName,
    string? AuthorAvatarUrl,
    int LikesCount,
    int RepostsCount,
    int RepliesCount,
    DateTime CreatedAt,
    List<string> MediaUrls,
    bool IsDeleted,
    string? VideoUrl = null,
    string? LinkTitle = null,
    string? LinkDescription = null,
    string? LinkImage = null,
    string? LinkUrl = null
);

public record AdminFeedDto(
    Guid Id,
    string Name,
    string Handle,
    string? Description,
    string? AvatarUrl,
    int SubscribersCount,
    DateTime CreatedAt,
    bool IsOfficial
);

public record PaginatedResult<T>(
    List<T> Items,
    int TotalCount,
    int Skip,
    int Take
);

public record CreateFeedRequest(
    string Name,
    string Handle,
    string? Description,
    string? AvatarUrl,
    bool IsOfficial
);

public record UpdateFeedRequest(
    string Name,
    string? Description,
    string? AvatarUrl,
    bool IsOfficial
);

public record AdminListDto(
    Guid Id,
    string Name,
    string? Description,
    string? Purpose,
    string OwnerHandle,
    string? OwnerDisplayName,
    string? OwnerAvatarUrl,
    int MembersCount,
    int PostsCount,
    DateTime CreatedAt,
    bool IsCurated
);

public record AdminConversationDto(
    Guid Id,
    List<string> Participants,
    int MessageCount,
    DateTime? LastActivity,
    DateTime CreatedAt
);

public record AdminBlockDto(
    string UserHandle,
    string? UserDisplayName,
    string BlockedUserHandle,
    string? BlockedUserDisplayName,
    DateTime? CreatedAt
);

public record AdminMuteDto(
    string UserHandle,
    string? UserDisplayName,
    string MutedUserHandle,
    string? MutedUserDisplayName,
    DateTime? CreatedAt
);

public record BroadcastNotificationRequest(
    [property: JsonPropertyName("type")] string Type,
    [property: JsonPropertyName("title")] string? Title,
    [property: JsonPropertyName("content")] string? Content,
    [property: JsonPropertyName("targetRole")] string? TargetRole
);

public record ChangeRoleRequest(
    string Role
);

public record AdminInterestDto(
    string Name,
    int UsersCount,
    DateTime CreatedAt
);

public record AdminHashtagDto(
    int Id,
    string Name,
    string Slug,
    int PostsCount,
    DateTime CreatedAt
);

