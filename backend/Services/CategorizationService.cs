using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using BSkyClone.Constants;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class CategorizationService : ICategorizationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMLModelService _mlService;

    public CategorizationService(IUnitOfWork unitOfWork, IMLModelService mlService)
    {
        _unitOfWork = unitOfWork;
        _mlService = mlService;
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

        var categoryName = await _mlService.PredictTextCategoryAsync(content);
        if (!string.IsNullOrEmpty(categoryName) && categoryName != "unknown")
        {
            var interestId = await GetInterestIdByNameAsync(categoryName);
            if (interestId.HasValue)
            {
                matchedInterestIds.Add(interestId.Value);
            }
        }

        // Fallback or additional tags based on keyword matching (optional)
        foreach (var interest in interests)
        {
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
        return interestName switch
        {
            PostCategoryConstants.Art => new List<string> { "art", "drawing", "painting", "sketch", "illustration", "digital art", "artist" },
            PostCategoryConstants.Photography => new List<string> { "photo", "photography", "camera", "lens", "shot", "portrait", "landscape" },
            PostCategoryConstants.Gaming => new List<string> { "game", "gaming", "playstation", "xbox", "nintendo", "steam", "fps", "rpg" },
            PostCategoryConstants.Tech => new List<string> { "tech", "technology", "software", "hardware", "ai", "programming", "coding", "developer" },
            PostCategoryConstants.Music => new List<string> { "music", "song", "album", "artist", "concert", "guitar", "piano" },
            PostCategoryConstants.News => new List<string> { "news", "breaking", "update", "politics", "world", "local", "report" },
            PostCategoryConstants.Nature => new List<string> { "nature", "outdoor", "hiking", "mountain", "forest", "animal", "wildlife" },
            PostCategoryConstants.Politics => new List<string> { "politics", "election", "government", "policy", "vote", "democracy" },
            PostCategoryConstants.Movies => new List<string> { "movie", "film", "cinema", "actor", "director", "trailer", "netflix" },
            PostCategoryConstants.Science => new List<string> { "science", "physics", "biology", "space", "nasa", "research", "lab" },
            PostCategoryConstants.Sports => new List<string> { "sport", "football", "soccer", "basketball", "tennis", "olympics", "match" },
            PostCategoryConstants.Food => new List<string> { "food", "cooking", "recipe", "restaurant", "chef", "delicious", "dinner" },
            _ => new List<string> { interestName.ToLower() }
        };
    }
}
