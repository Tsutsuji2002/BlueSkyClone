using System;
using System.Text.Json.Serialization;

namespace BSkyClone.DTOs;

public record RegisterRequest(
    string Email,
    string Password,
    string Username,
    DateTime DateOfBirth,
    string? DisplayName,
    string HostingProvider = "bsky.social",
    string? VerificationPhone = null,
    string? VerificationCode = null
);

public record PhoneVerificationRequest(
    string PhoneNumber
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
    int? ListMembershipStatus = null,
    bool IsVerified = false,
    string? Did = null,
    string? FollowingReference = null
)
{
    [JsonPropertyName("isFollowing")]
    public bool? IsFollowing { get; init; }
    
    [JsonPropertyName("isBlockedBy")]
    public bool? IsBlockedBy { get; init; }
    
    [JsonPropertyName("isBlocking")]
    public bool? IsBlocking { get; init; }
    
    [JsonPropertyName("blockingReference")]
    public string? BlockingReference { get; init; }
    
    [JsonPropertyName("isMuted")]
    public bool? IsMuted { get; init; }
    
    [JsonPropertyName("isFollowedBy")]
    public bool? IsFollowedBy { get; init; }

    [JsonPropertyName("mutedBy")]
    public MutedByListDto? MutedBy { get; init; }

    [JsonPropertyName("muteInfo")]
    public PostMuteDto? MuteInfo { get; set; }
}

public record MutedByListDto(Guid Id, string Name, string? Purpose);
 
public record UserRelationshipStatusDto(
    bool IsFollowing,
    bool IsBlocking,
    bool IsBlockedBy,
    bool IsMuted,
    string? FollowingReference = null,
    string? BlockingReference = null
);

public record UserSettingDto(
    string? AdultContentFilter,
    bool? EnableAdultContent,
    string? SexuallyExplicitFilter,
    string? GraphicMediaFilter,
    string? NonSexualNudityFilter,
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
    bool? NotifyActivity,
    bool? PushNotifyActivity,
    bool? InAppNotifyActivity,
    bool? NotifyLikesOfReposts,
    bool? PushNotifyLikesOfReposts,
    bool? InAppNotifyLikesOfReposts,
    bool? NotifyRepostsOfReposts,
    bool? PushNotifyRepostsOfReposts,
    bool? InAppNotifyRepostsOfReposts,
    bool? NotifyOthers,
    bool? PushNotifyOthers,
    bool? InAppNotifyOthers,
    string? DefaultReplyRestriction,
    bool? DefaultAllowQuotes,
    int? FontSize,
    bool? EnableTrending,
    bool? EnableDiscoverVideo,
    bool? EnableTreeView,
    bool? RequireLogoutVisibility,
    bool? LargerAltBadge,
    bool? ShowReplies,
    bool? ShowReposts,
    bool? ShowQuotePosts,
    bool? ShowSampleSavedFeeds,
    string? EnabledMediaProviders
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

