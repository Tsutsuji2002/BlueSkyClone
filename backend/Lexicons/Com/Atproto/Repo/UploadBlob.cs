using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Repo
{
    public class UploadBlobResponse
    {
        [JsonPropertyName("blob")]
        public BlobData Blob { get; set; } = new();
    }

    public class BlobData
    {
        [JsonPropertyName("$type")]
        public string Type { get; set; } = "blob";

        [JsonPropertyName("ref")]
        public BlobRef Ref { get; set; } = new();

        [JsonPropertyName("mimeType")]
        public string MimeType { get; set; } = string.Empty;

        [JsonPropertyName("size")]
        public long Size { get; set; }
    }

    public class BlobRef
    {
        [JsonPropertyName("$link")]
        public string Link { get; set; } = string.Empty;
    }
}
