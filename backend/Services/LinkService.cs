using BSkyClone.Models;
using HtmlAgilityPack;
using System.Text.RegularExpressions;

namespace BSkyClone.Services;

public class LinkService : ILinkService
{
    private readonly HttpClient _httpClient;

    public LinkService(HttpClient httpClient)
    {
        _httpClient = httpClient;
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-LinkPreview-Bot/1.0");
    }

    public async Task<LinkPreview?> GetLinkPreviewAsync(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) return null;

        var urlMatch = Regex.Match(content, @"(https?://[^\s]+)");
        if (!urlMatch.Success) return null;

        string url = urlMatch.Value;

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            request.Headers.Add("Accept-Language", "en-US,en;q=0.9");

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode) return null;

            var html = await response.Content.ReadAsStringAsync();
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var preview = new LinkPreview
            {
                Id = Guid.NewGuid(),
                Url = url,
                CreatedAt = DateTime.UtcNow,
                Domain = new Uri(url).Host.ToLower().Replace("www.", "")
            };

            // Try OpenGraph tags first
            preview.Title = GetMetaTag(doc, "og:title") ?? GetMetaTag(doc, "twitter:title") ?? doc.DocumentNode.SelectSingleNode("//title")?.InnerText;
            preview.Description = GetMetaTag(doc, "og:description") ?? GetMetaTag(doc, "twitter:description") ?? GetMetaTag(doc, "description");
            preview.Image = GetMetaTag(doc, "og:image") ?? GetMetaTag(doc, "twitter:image");

            // Specialized handling for YouTube to ensure we get the thumbnail even if OG fails
            if (preview.Domain.Contains("youtube.com") || preview.Domain.Contains("youtu.be"))
            {
                if (string.IsNullOrEmpty(preview.Image))
                {
                    var videoIdMatch = Regex.Match(url, @"(?:v=|\/v\/|embed\/|youtu\.be\/|\/shorts\/)([^""&?\/\s]{11})");
                    if (videoIdMatch.Success)
                    {
                        var videoId = videoIdMatch.Groups[1].Value;
                        preview.Image = $"https://img.youtube.com/vi/{videoId}/maxresdefault.jpg";
                    }
                }
                
                if (preview.Title != null && (preview.Title.Contains("YouTube") && preview.Title.Length < 10))
                {
                    // If title is just "YouTube", try to find a better one from the doc
                    var h1 = doc.DocumentNode.SelectSingleNode("//h1")?.InnerText;
                    if (!string.IsNullOrEmpty(h1)) preview.Title = h1;
                }
            }

            // Clean up title
            if (preview.Title != null)
            {
                preview.Title = HtmlEntity.DeEntitize(preview.Title).Trim();
            }

            // Clean up description
            if (preview.Description != null)
            {
                preview.Description = HtmlEntity.DeEntitize(preview.Description).Trim();
            }

            return preview;
        }
        catch (Exception ex)
        {
            // Log error
            Console.WriteLine($"Error fetching link preview for {url}: {ex.Message}");
            return null;
        }
    }

    private string? GetMetaTag(HtmlDocument doc, string property)
    {
        var node = doc.DocumentNode.SelectSingleNode($"//meta[@property='{property}']") 
                ?? doc.DocumentNode.SelectSingleNode($"//meta[@name='{property}']");
        
        return node?.Attributes["content"]?.Value;
    }
}
