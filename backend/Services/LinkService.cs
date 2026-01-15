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
            var response = await _httpClient.GetAsync(url);
            if (!response.IsSuccessStatusCode) return null;

            var html = await response.Content.ReadAsStringAsync();
            var doc = new HtmlDocument();
            doc.LoadHtml(html);

            var preview = new LinkPreview
            {
                Id = Guid.NewGuid(),
                Url = url,
                CreatedAt = DateTime.UtcNow,
                Domain = new Uri(url).Host
            };

            // Try OpenGraph tags first
            preview.Title = GetMetaTag(doc, "og:title") ?? doc.DocumentNode.SelectSingleNode("//title")?.InnerText;
            preview.Description = GetMetaTag(doc, "og:description") ?? GetMetaTag(doc, "description");
            preview.Image = GetMetaTag(doc, "og:image");

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
        
        return node?.GetAttributeValue("content", null);
    }
}
