using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Server
{
    public class GetAccountResponse
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("emailConfirmed")]
        public bool EmailConfirmed { get; set; }

        [JsonPropertyName("handle")]
        public string Handle { get; set; } = string.Empty;

        [JsonPropertyName("did")]
        public string Did { get; set; } = string.Empty;
    }

    public class RequestEmailUpdateResponse
    {
        [JsonPropertyName("tokenRequired")]
        public bool TokenRequired { get; set; }
    }

    public class UpdateEmailRequest
    {
        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("token")]
        public string? Token { get; set; }
    }

    public class UpdatePasswordRequest
    {
        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;

        [JsonPropertyName("token")]
        public string? Token { get; set; }
    }
}
