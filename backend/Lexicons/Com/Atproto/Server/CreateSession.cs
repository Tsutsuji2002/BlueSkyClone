using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Server
{
    public class CreateSessionRequest
    {
        [JsonPropertyName("identifier")]
        public string Identifier { get; set; } = string.Empty;

        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;
    }

    public class CreateSessionResponse
    {
        [JsonPropertyName("accessJwt")]
        public string AccessJwt { get; set; } = string.Empty;

        [JsonPropertyName("refreshJwt")]
        public string RefreshJwt { get; set; } = string.Empty;

        [JsonPropertyName("handle")]
        public string Handle { get; set; } = string.Empty;

        [JsonPropertyName("did")]
        public string Did { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        // Compatibility with legacy frontend
        [JsonPropertyName("user")]
        public object? User { get; set; }

        [JsonPropertyName("settings")]
        public object? Settings { get; set; }
    }
}
