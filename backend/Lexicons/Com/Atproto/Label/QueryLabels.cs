using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace BSkyClone.Lexicons.Com.Atproto.Label;

public class QueryLabelsResponse
{
    [JsonPropertyName("labels")]
    public List<LabelView> Labels { get; set; } = new();

    [JsonPropertyName("cursor")]
    public string? Cursor { get; set; }
}

public class LabelView
{
    [JsonPropertyName("src")]
    public string Src { get; set; } = string.Empty;

    [JsonPropertyName("uri")]
    public string Uri { get; set; } = string.Empty;

    [JsonPropertyName("cid")]
    public string? Cid { get; set; }

    [JsonPropertyName("val")]
    public string Val { get; set; } = string.Empty;

    [JsonPropertyName("neg")]
    public bool? Neg { get; set; }

    [JsonPropertyName("cts")]
    public string Cts { get; set; } = string.Empty; // createdAt (IndexedAt)
}
