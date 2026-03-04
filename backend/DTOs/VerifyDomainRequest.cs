using System.Text.Json.Serialization;

namespace BSkyClone.DTOs;

public class VerifyDomainRequest
{
    [JsonPropertyName("handle")]
    public string? Handle { get; set; }
}
