using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.App.Bsky.Actor.Defs
{
    public class ProfileViewBasic
    {
        [JsonPropertyName("did")]
        public string Did { get; set; } = string.Empty;

        [JsonPropertyName("handle")]
        public string Handle { get; set; } = string.Empty;

        [JsonPropertyName("displayName")]
        public string? DisplayName { get; set; }

        [JsonPropertyName("avatar")]
        public string? Avatar { get; set; }

        [JsonPropertyName("viewer")]
        public ViewerState? Viewer { get; set; }
    }

    public class ProfileView : ProfileViewBasic
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("indexedAt")]
        public string? IndexedAt { get; set; }

        [JsonPropertyName("labels")]
        public List<object>? Labels { get; set; } // Simplified labels
    }

    public class ProfileViewDetailed : ProfileView
    {
        [JsonPropertyName("banner")]
        public string? Banner { get; set; }

        [JsonPropertyName("followersCount")]
        public int FollowersCount { get; set; }

        [JsonPropertyName("followsCount")]
        public int FollowsCount { get; set; }

        [JsonPropertyName("postsCount")]
        public int PostsCount { get; set; }

        [JsonPropertyName("pinnedPost")]
        public object? PinnedPost { get; set; }

    }

    public class ViewerState
    {
        [JsonPropertyName("muted")]
        public bool Muted { get; set; }

        [JsonPropertyName("blockedBy")]
        public bool BlockedBy { get; set; }

        [JsonPropertyName("blocking")]
        public string? Blocking { get; set; }

        [JsonPropertyName("following")]
        public string? Following { get; set; }

        [JsonPropertyName("followedBy")]
        public string? FollowedBy { get; set; }
    }
}
