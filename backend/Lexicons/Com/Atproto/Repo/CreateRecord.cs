using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Repo
{
    public class CreateRecordRequest
    {
        [JsonPropertyName("repo")]
        public string Repo { get; set; } = string.Empty;

        [JsonPropertyName("collection")]
        public string Collection { get; set; } = string.Empty;

        [JsonPropertyName("rkey")]
        public string? Rkey { get; set; }

        [JsonPropertyName("record")]
        public object Record { get; set; } = new object();
    }

    public class CreateRecordResponse
    {
        [JsonPropertyName("uri")]
        public string Uri { get; set; } = string.Empty;

        [JsonPropertyName("cid")]
        public string Cid { get; set; } = string.Empty;
    }
}
