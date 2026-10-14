using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.App.Bsky.Graph
{
    public class MuteActorRequest
    {
        [JsonPropertyName("actor")]
        public string Actor { get; set; } = string.Empty;
    }

    public class MuteThreadRequest
    {
        [JsonPropertyName("root")]
        public string Root { get; set; } = string.Empty;
    }
}
