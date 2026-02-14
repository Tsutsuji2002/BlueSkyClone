using System;
using System.Text.Json.Serialization;

namespace BSkyClone.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string Username,
    DateTime DateOfBirth,
    string? DisplayName,
    string HostingProvider = "bsky.social"
);

public record LoginRequest(
    string Identifier, // Email or Handle
    string Password,
    bool RememberMe = false
);

public record UserDto(
    Guid Id,
    string Username,
    string Handle,
    string Email,
    string? DisplayName,
    [property: JsonPropertyName("avatar")] string? AvatarUrl,
    [property: JsonPropertyName("coverImage")] string? CoverImageUrl,
    string? Bio,
    string? Location,
    string? Website,
    DateTime? DateOfBirth,
    int? FollowersCount,
    int? FollowingCount,
    int? PostsCount,
    string Role = "user",
    int? ListMembershipStatus = null
);

public record UserSettingDto(
    string? AdultContentFilter,
    bool? EnableAdultContent,
    string? SortReplies,
    bool? RequireAltText,
    bool? AutoplayVideoGif,
    string? AppLanguage,
    string? ThemeMode,
    bool? NotifyLikes,
    bool? NotifyFollowers,
    bool? NotifyReplies,
    bool? NotifyMentions,
    bool? NotifyQuotes,
    bool? NotifyReposts,
    bool? PushNotifyLikes,
    bool? PushNotifyFollowers,
    bool? PushNotifyReplies,
    bool? PushNotifyMentions,
    bool? PushNotifyQuotes,
    bool? PushNotifyReposts,
    bool? InAppNotifyLikes,
    bool? InAppNotifyFollowers,
    bool? InAppNotifyReplies,
    bool? InAppNotifyMentions,
    bool? InAppNotifyQuotes,
    bool? InAppNotifyReposts,
    string? DefaultReplyRestriction,
    bool? DefaultAllowQuotes,
    int? FontSize
);

public record AuthResponse(
    UserDto User,
    UserSettingDto Settings,
    string Token,
    string RefreshToken
);

public record MutedWordDto(
    int Id,
    string Word,
    string MuteBehavior,
    DateTime? CreatedAt
);

