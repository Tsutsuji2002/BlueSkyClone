using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace BSkyClone.Models;

public class StarterPackRecord
{
    [JsonPropertyName("$type")]
    public string Type { get; set; } = "app.bsky.graph.starterpack";

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("list")]
    public string List { get; set; } = string.Empty; // AT-URI of underlying list

    [JsonPropertyName("feeds")]
    public List<StarterPackFeedRef>? Feeds { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}

public class StarterPackFeedRef
{
    [JsonPropertyName("uri")]
    public string Uri { get; set; } = string.Empty;
}

public class StarterPackView
{
    [JsonPropertyName("uri")]
    public string Uri { get; set; } = string.Empty;

    [JsonPropertyName("cid")]
    public string Cid { get; set; } = string.Empty;

    [JsonPropertyName("record")]
    public object? Record { get; set; }

    [JsonPropertyName("creator")]
    public object? Creator { get; set; }

    [JsonPropertyName("list")]
    public object? List { get; set; }

    [JsonPropertyName("listItemsSample")]
    public List<object>? ListItemsSample { get; set; }

    [JsonPropertyName("feeds")]
    public List<object>? Feeds { get; set; }

    [JsonPropertyName("joinedAllTimeCount")]
    public int? JoinedAllTimeCount { get; set; }

    [JsonPropertyName("joinedWeekCount")]
    public int? JoinedWeekCount { get; set; }

    [JsonPropertyName("indexedAt")]
    public string? IndexedAt { get; set; }
}

public class GetStarterPackResponse
{
    [JsonPropertyName("starterPack")]
    public StarterPackView StarterPack { get; set; } = new();
}

public class GetStarterPacksResponse
{
    [JsonPropertyName("starterPacks")]
    public List<StarterPackView> StarterPacks { get; set; } = new();
}

public class GetActorStarterPacksResponse
{
    [JsonPropertyName("starterPacks")]
    public List<StarterPackView> StarterPacks { get; set; } = new();

    [JsonPropertyName("cursor")]
    public string? Cursor { get; set; }
}

public class CreateStarterPackRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string> MemberDids { get; set; } = new();
    public List<string>? FeedUris { get; set; }
}
