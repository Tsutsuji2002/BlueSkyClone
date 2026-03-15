using System.Text.Json.Serialization;

namespace BSkyClone.Lexicons.Com.Atproto.Moderation;

public class CreateReportRequest
{
    [JsonPropertyName("reasonType")]
    public string ReasonType { get; set; } = string.Empty;

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("subject")]
    public ReportSubject Subject { get; set; } = null!;
}

public class ReportSubject
{
    [JsonPropertyName("$type")]
    public string Type { get; set; } = string.Empty; // com.atproto.admin.defs#repoRef or com.atproto.repo.strongRef

    [JsonPropertyName("did")]
    public string? Did { get; set; }

    [JsonPropertyName("uri")]
    public string? Uri { get; set; }

    [JsonPropertyName("cid")]
    public string? Cid { get; set; }
}

public class CreateReportResponse
{
    [JsonPropertyName("id")]
    public long Id { get; set; }

    [JsonPropertyName("reasonType")]
    public string ReasonType { get; set; } = string.Empty;

    [JsonPropertyName("subject")]
    public ReportSubject Subject { get; set; } = null!;

    [JsonPropertyName("reporter")]
    public string Reporter { get; set; } = string.Empty;

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = string.Empty;
}
