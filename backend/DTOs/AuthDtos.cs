using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using BSkyClone.Services;

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
    [Required, StringLength(256)] string Identifier, // Email or Handle
    [Required, StringLength(128)] string Password,
    bool RememberMe = false
);

public record SwitchRequest(
    [Required] string RefreshToken
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
    string? FollowingReference = null,
    bool EmailConfirmed = true
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

    [JsonPropertyName("pinnedPost")]
    public PostDto? PinnedPost { get; set; }
}

public record MutedByListDto(Guid Id, string Name, string? Purpose);
 
public record UserRelationshipStatusDto(
    bool IsFollowing,
    bool IsFollowedBy,
    bool IsBlocking,
    bool IsBlockedBy,
    bool IsMuted,
    string? FollowingReference = null,
    string? BlockingReference = null
);

public record UserSettingDto(
    string? AdultContentFilter = null,
    bool? EnableAdultContent = null,
    string? SexuallyExplicitFilter = null,
    string? GraphicMediaFilter = null,
    string? NonSexualNudityFilter = null,
    [property: JsonPropertyName("sortReplies")] string? SortReplies = null,
    bool? RequireAltText = null,
    bool? AutoplayVideoGif = null,
    string? AppLanguage = null,
    string? ThemeMode = null,
    bool? NotifyLikes = null,
    bool? NotifyFollowers = null,
    bool? NotifyReplies = null,
    bool? NotifyMentions = null,
    bool? NotifyQuotes = null,
    bool? NotifyReposts = null,
    bool? PushNotifyLikes = null,
    bool? PushNotifyFollowers = null,
    bool? PushNotifyReplies = null,
    bool? PushNotifyMentions = null,
    bool? PushNotifyQuotes = null,
    bool? PushNotifyReposts = null,
    bool? InAppNotifyLikes = null,
    bool? InAppNotifyFollowers = null,
    bool? InAppNotifyReplies = null,
    bool? InAppNotifyMentions = null,
    bool? InAppNotifyQuotes = null,
    bool? InAppNotifyReposts = null,
    bool? NotifyActivity = null,
    bool? PushNotifyActivity = null,
    bool? InAppNotifyActivity = null,
    bool? NotifyLikesOfReposts = null,
    bool? PushNotifyLikesOfReposts = null,
    bool? InAppNotifyLikesOfReposts = null,
    bool? NotifyRepostsOfReposts = null,
    bool? PushNotifyRepostsOfReposts = null,
    bool? InAppNotifyRepostsOfReposts = null,
    bool? NotifyOthers = null,
    bool? PushNotifyOthers = null,
    bool? InAppNotifyOthers = null,
    [property: JsonPropertyName("defaultReplyRestriction")] string? DefaultReplyRestriction = null,
    [property: JsonPropertyName("defaultAllowQuotes")] bool? DefaultAllowQuotes = null,
    int? FontSize = null,
    bool? EnableTrending = null,
    bool? EnableDiscoverVideo = null,
    [property: JsonPropertyName("treeView")] bool? EnableTreeView = null,
    [property: JsonPropertyName("logoutVisibility")] bool? RequireLogoutVisibility = null,
    [property: JsonPropertyName("hideFromDiscover")] bool? HideFromDiscover = null,
    bool? LargerAltBadge = null,
    bool? ShowReplies = null,
    bool? ShowReposts = null,
    bool? ShowQuotePosts = null,
    bool? ShowSampleSavedFeeds = null,
    [property: JsonPropertyName("enabledMediaProviders")] System.Text.Json.JsonElement? EnabledMediaProviders = null,
    [property: JsonPropertyName("selectedInterests")] System.Text.Json.JsonElement? SelectedInterests = null
)
{
    public static System.Text.Json.JsonElement? ParseJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
        catch
        {
            return null;
        }
    }
}

public record AuthResponse(
    UserDto User,
    UserSettingDto Settings,
    string Token,
    string RefreshToken,
    bool RememberMe = false
);

public record MutedWordDto(
    int Id,
    string Word,
    string MuteBehavior,
    DateTime? CreatedAt,
    string? Targets = null,
    DateTime? ExpiresAt = null,
    bool ExcludeFollowing = false
);

public record HandshakeResponse(
    UserDto User,
    UserSettingDto Settings,
    List<FeedDto> PinnedLists,
    int UnreadCount,
    List<TrendingTopicDto> TrendingTopics,
    List<MutedWordDto> MutedWords,
    string? Token = null,
    string? RefreshToken = null
);

public record FollowUserResultDto(
    bool Success,
    string? Uri = null,
    string? ErrorMessage = null
);
