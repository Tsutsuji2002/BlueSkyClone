using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Repo
{
    public class DeleteRecordRequest
    {
        [JsonPropertyName("repo")]
        public string Repo { get; set; } = string.Empty;

        [JsonPropertyName("collection")]
        public string Collection { get; set; } = string.Empty;

        [JsonPropertyName("rkey")]
        public string Rkey { get; set; } = string.Empty;

        [JsonPropertyName("swapRecord")]
        public string? SwapRecord { get; set; }

        [JsonPropertyName("swapCommit")]
        public string? SwapCommit { get; set; }
    }
}
