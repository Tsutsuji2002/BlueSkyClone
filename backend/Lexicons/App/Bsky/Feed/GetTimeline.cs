using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.App.Bsky.Feed
{
    public class GetTimelineResponse
    {
        [JsonPropertyName("feed")]
        public List<FeedViewPost> Feed { get; set; } = new();

        [JsonPropertyName("cursor")]
        public string? Cursor { get; set; }
    }

    public class FeedViewPost
    {
        [JsonPropertyName("post")]
        public PostView Post { get; set; } = new();

        [JsonPropertyName("reply")]
        public ReplyRef? Reply { get; set; }

        [JsonPropertyName("reason")]
        public object? Reason { get; set; } // Can be ReasonRepost
    }

    public class PostView
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("cid")]
        public string Cid { get; set; } = string.Empty;

        [JsonPropertyName("author")]
        public Actor.Defs.ProfileViewBasic Author { get; set; } = new();

        [JsonPropertyName("record")]
        public object Record { get; set; } = new();

        [JsonPropertyName("replyCount")]
        public int ReplyCount { get; set; }

        [JsonPropertyName("repostCount")]
        public int RepostCount { get; set; }

        [JsonPropertyName("likeCount")]
        public int LikeCount { get; set; }

        [JsonPropertyName("indexedAt")]
        public string IndexedAt { get; set; } = DateTime.UtcNow.ToString("o");
    }
}

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
    }
}
