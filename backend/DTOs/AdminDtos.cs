using System;

namespace BSkyClone.DTOs;

public record AdminStatsDto(
    int TotalUsers,
    int TotalPosts,
    int TotalFeeds,
    int ActiveUsersToday,
    int NewPostsToday,
    int BannedUsers
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
    DateTime CreatedAt
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
    int Total,
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
