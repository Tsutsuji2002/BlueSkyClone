using System;
using System.Text.Json;
using System.IO;

public class Program {
    public static void Main() {
        string url = "https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=at://did:plc:ry3hbexak5ytsum7aazhpkbv/app.bsky.feed.post/3mj53dpzmn227&depth=2";
        using var client = new System.Net.Http.HttpClient();
        var json = client.GetStringAsync(url).Result;
        
        var doc = JsonDocument.Parse(json);
        var thread = doc.RootElement.GetProperty("thread");
        var post = thread.GetProperty("post");
        
        // Find the viewRecord manually
        var embed = post.GetProperty("embed");
        var record = embed.GetProperty("record");
        var innerRec = record.GetProperty("record");
        
        Console.WriteLine($"InnerRec type: {innerRec.GetProperty("$type").GetString()}");
        Console.WriteLine($"Author: {innerRec.GetProperty("author").GetProperty("displayName").GetString()}");
        Console.WriteLine($"Value text length: {innerRec.GetProperty("value").GetProperty("text").GetString().Length}");
        
        var options = new JsonSerializerOptions { WriteIndented = true };
        Console.WriteLine(JsonSerializer.Serialize(innerRec, options));
        
        // test C# logic
        if (innerRec.TryGetProperty("value", out var v)) {
            if (v.TryGetProperty("text", out var t)) {
                Console.WriteLine("Parsed Text:");
                Console.WriteLine(t.GetString());
            }
        }
    }
}
