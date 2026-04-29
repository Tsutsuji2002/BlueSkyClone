using System.Text.Json.Serialization;
using BSkyClone.Lexicons.App.Bsky.Actor.Defs;

namespace BSkyClone.Lexicons.App.Bsky.Graph
{
    public class GetListResponse
    {
        [JsonPropertyName("list")]
        public ListView List { get; set; } = new();

        [JsonPropertyName("items")]
        public List<ListItemView> Items { get; set; } = new();

        [JsonPropertyName("cursor")]
        public string? Cursor { get; set; }
    }

    public class ListItemView
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("subject")]
        public ProfileView Subject { get; set; } = new();
    }
}
