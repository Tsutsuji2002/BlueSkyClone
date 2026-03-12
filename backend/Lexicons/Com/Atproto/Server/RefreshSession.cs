using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Server
{
    public class RefreshSessionResponse
    {
        [JsonPropertyName("accessJwt")]
        public string AccessJwt { get; set; } = string.Empty;

        [JsonPropertyName("refreshJwt")]
        public string RefreshJwt { get; set; } = string.Empty;

        [JsonPropertyName("handle")]
        public string Handle { get; set; } = string.Empty;

        [JsonPropertyName("did")]
        public string Did { get; set; } = string.Empty;

        [JsonPropertyName("didDoc")]
        public object? DidDoc { get; set; }
    }
}
