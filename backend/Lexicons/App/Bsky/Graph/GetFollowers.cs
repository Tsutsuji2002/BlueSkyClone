using System.Text.Json.Serialization;
using BSkyClone.Lexicons.App.Bsky.Actor.Defs;

namespace BSkyClone.Lexicons.App.Bsky.Graph
{
    public class GetFollowersResponse
    {
        [JsonPropertyName("subject")]
        public ProfileViewDetailed Subject { get; set; } = new();

        [JsonPropertyName("followers")]
        public List<ProfileView> Followers { get; set; } = new();

        [JsonPropertyName("cursor")]
        public string? Cursor { get; set; }
    }
}
