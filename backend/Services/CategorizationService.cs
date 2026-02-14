using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class CategorizationService : ICategorizationService
{
    private readonly IUnitOfWork _unitOfWork;

    public CategorizationService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<List<int>> CategorizePostAsync(string content, List<string>? imageUrls = null)
    {
        var matchedInterestIds = new List<int>();
        if (string.IsNullOrWhiteSpace(content) && (imageUrls == null || !imageUrls.Any()))
            return matchedInterestIds;

        var interests = await _unitOfWork.Interests.Query()
            .Where(i => i.IsDeleted == false || i.IsDeleted == null)
            .ToListAsync();

        var contentLower = content.ToLower();

        foreach (var interest in interests)
        {
            // Basic keyword matching for now
            // In a real AI implementation, we'd use NLP or a trained model
            // For this clone, we'll use a set of keywords defined for each interest
            var keywords = GetKeywordsForInterest(interest.Name);
            
            if (keywords.Any(k => contentLower.Contains(k)))
            {
                matchedInterestIds.Add(interest.Id);
            }
        }

        // Placeholder for Image Analysis (ML.NET)
        if (imageUrls != null && imageUrls.Any())
        {
            var imageMatchedIds = await AnalyzeImagesAsync(imageUrls);
            matchedInterestIds.AddRange(imageMatchedIds);
        }

        return matchedInterestIds.Distinct().ToList();
    }

    private async Task<List<int>> AnalyzeImagesAsync(List<string> imageUrls)
    {
        var matchedIds = new List<int>();
        
        // --- REAL AI IMPLEMENTATION (ML.NET) ---
        // 1. Load pre-trained model (e.g., MobileNet)
        // 2. Process each image URL
        // 3. Get labels (e.g., "Cat", "Sunset", "Painting")
        // 4. Map labels to Interest IDs
        
        // --- SIMULATED AI (For Demonstration) ---
        foreach (var url in imageUrls)
        {
            var lowerUrl = url.ToLower();
            if (lowerUrl.Contains("art") || lowerUrl.Contains("draw") || lowerUrl.Contains("paint"))
            {
                var artInterest = await GetInterestIdByNameAsync("Art");
                if (artInterest.HasValue) matchedIds.Add(artInterest.Value);
            }
            if (lowerUrl.Contains("nature") || lowerUrl.Contains("mountain") || lowerUrl.Contains("forest"))
            {
                var natureInterest = await GetInterestIdByNameAsync("Nature");
                if (natureInterest.HasValue) matchedIds.Add(natureInterest.Value);
            }
        }

        return matchedIds;
    }

    private async Task<int?> GetInterestIdByNameAsync(string name)
    {
        var interest = await _unitOfWork.Interests.Query()
            .FirstOrDefaultAsync(i => i.Name == name && (i.IsDeleted == false || i.IsDeleted == null));
        return interest?.Id;
    }

    private List<string> GetKeywordsForInterest(string interestName)
    {
        return interestName.ToLower() switch
        {
            "art" => new List<string> { "art", "drawing", "painting", "sketch", "illustration", "digital art", "artist" },
            "photography" => new List<string> { "photo", "photography", "camera", "lens", "shot", "portrait", "landscape", "iso", "shutter" },
            "gaming" => new List<string> { "game", "gaming", "playstation", "xbox", "nintendo", "steam", "fps", "rpg", "streamer" },
            "tech" => new List<string> { "tech", "technology", "software", "hardware", "ai", "programming", "coding", "developer", "gadget" },
            "music" => new List<string> { "music", "song", "album", "artist", "concert", "guitar", "piano", "streaming", "playlist" },
            "news" => new List<string> { "news", "breaking", "update", "politics", "world", "local", "report", "journalism" },
            "nature" => new List<string> { "nature", "outdoor", "hiking", "mountain", "forest", "animal", "wildlife", "climate" },
            "politics" => new List<string> { "politics", "election", "government", "policy", "vote", "democracy" },
            "movies" => new List<string> { "movie", "film", "cinema", "actor", "director", "trailer", "netflix", "hollywood" },
            "science" => new List<string> { "science", "physics", "biology", "space", "nasa", "research", "lab", "experiment" },
            "sports" => new List<string> { "sport", "football", "soccer", "basketball", "tennis", "olympics", "match", "team" },
            "food" => new List<string> { "food", "cooking", "recipe", "restaurant", "chef", "delicious", "dinner", "breakfast" },
            _ => new List<string> { interestName.ToLower() }
        };
    }
}
