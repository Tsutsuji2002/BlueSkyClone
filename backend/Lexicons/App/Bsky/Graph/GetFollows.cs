using System.Text.Json.Serialization;
using BSkyClone.Lexicons.App.Bsky.Actor.Defs;

namespace BSkyClone.Lexicons.App.Bsky.Graph
{
    public class GetFollowsResponse
    {
        [JsonPropertyName("subject")]
        public ProfileViewDetailed Subject { get; set; } = new();

        [JsonPropertyName("follows")]
        public List<ProfileView> Follows { get; set; } = new();

        [JsonPropertyName("cursor")]
        public string? Cursor { get; set; }
    }
}
