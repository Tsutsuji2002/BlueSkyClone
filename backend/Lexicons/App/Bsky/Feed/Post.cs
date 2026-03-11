using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.App.Bsky.Feed
{
    public class Post
    {
        [JsonPropertyName("$type")]
        public string Type { get; set; } = "app.bsky.feed.post";

        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;

        [JsonPropertyName("createdAt")]
        public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");

        [JsonPropertyName("reply")]
        public ReplyRef? Reply { get; set; }
    }

    public class ReplyRef
    {
        [JsonPropertyName("root")]
        public StrongRef Root { get; set; } = new StrongRef();

        [JsonPropertyName("parent")]
        public StrongRef Parent { get; set; } = new StrongRef();
    }

    public class StrongRef
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("cid")]
        public string Cid { get; set; } = string.Empty;
    }
}
