using System.Text.Json.Serialization;
using BSkyClone.Lexicons.App.Bsky.Actor.Defs;

namespace BSkyClone.Lexicons.App.Bsky.Graph
{
    public class GetListsResponse
    {
        [JsonPropertyName("lists")]
        public List<ListView> Lists { get; set; } = new();

        [JsonPropertyName("cursor")]
        public string? Cursor { get; set; }
    }

    public class ListView
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("cid")]
        public string Cid { get; set; } = string.Empty;

        [JsonPropertyName("creator")]
        public ProfileViewBasic Creator { get; set; } = new();

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("purpose")]
        public string Purpose { get; set; } = "app.bsky.graph.defs#curatelist";

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("avatar")]
        public string? Avatar { get; set; }

        [JsonPropertyName("indexedAt")]
        public string IndexedAt { get; set; } = DateTime.UtcNow.ToString("o");

        [JsonPropertyName("viewer")]
        public ListViewerState? Viewer { get; set; }
    }

    public class ListViewerState
    {
        [JsonPropertyName("muted")]
        public bool Muted { get; set; }

        [JsonPropertyName("blocked")]
        public string? Blocked { get; set; }
    }
}
