using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BSkyClone.Models
{
    public class DidDocument
    {
        [JsonPropertyName("@context")]
        public List<string> Context { get; set; } = new();

        [JsonPropertyName("id")]
        public string Id { get; set; } = null!;

        [JsonPropertyName("alsoKnownAs")]
        public List<string> AlsoKnownAs { get; set; } = new();

        [JsonPropertyName("verificationMethod")]
        public List<VerificationMethod> VerificationMethod { get; set; } = new();

        [JsonPropertyName("service")]
        public List<Service> Service { get; set; } = new();
    }

    public class VerificationMethod
    {
        public string Id { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string Controller { get; set; } = null!;
        public string? PublicKeyMultibase { get; set; }
    }

    public class Service
    {
        public string Id { get; set; } = null!;
        public string Type { get; set; } = null!;
        public string ServiceEndpoint { get; set; } = null!;
    }
}
