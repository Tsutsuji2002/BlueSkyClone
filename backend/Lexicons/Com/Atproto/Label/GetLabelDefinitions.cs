using System.Text.Json.Serialization;
using System.Collections.Generic;

namespace BSkyClone.Lexicons.Com.Atproto.Label;

public class GetLabelDefinitionsResponse
{
    [JsonPropertyName("definitions")]
    public List<LabelDefinition> Definitions { get; set; } = new();
}

public class LabelDefinition
{
    [JsonPropertyName("identifier")]
    public string Identifier { get; set; } = string.Empty;

    [JsonPropertyName("severity")]
    public string Severity { get; set; } = "inform"; // inform, alert, none

    [JsonPropertyName("blurs")]
    public string Blurs { get; set; } = "none"; // content, media, none

    [JsonPropertyName("defaultSetting")]
    public string DefaultSetting { get; set; } = "warn"; // hide, warn, show

    [JsonPropertyName("locales")]
    public List<LabelLocale> Locales { get; set; } = new();
}

public class LabelLocale
{
    [JsonPropertyName("lang")]
    public string Lang { get; set; } = "en";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;
}
