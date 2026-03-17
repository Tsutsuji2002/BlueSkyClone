using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Repo
{
    public class PutRecordRequest
    {
        [JsonPropertyName("repo")]
        public string Repo { get; set; } = string.Empty;

        [JsonPropertyName("collection")]
        public string Collection { get; set; } = string.Empty;

        [JsonPropertyName("rkey")]
        public string Rkey { get; set; } = string.Empty;

        [JsonPropertyName("validate")]
        public bool? Validate { get; set; }

        [JsonPropertyName("record")]
        public object Record { get; set; } = new object();

        [JsonPropertyName("swapRecord")]
        public string? SwapRecord { get; set; }

        [JsonPropertyName("swapCommit")]
        public string? SwapCommit { get; set; }
    }

    public class PutRecordResponse
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("cid")]
        public string Cid { get; set; } = string.Empty;
    }
}
