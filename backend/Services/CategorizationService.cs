using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using BSkyClone.Constants;
using BSkyClone.Services.ML;
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
        var matchedInterestIds = new HashSet<int>();
        if (string.IsNullOrWhiteSpace(content) && (imageUrls == null || !imageUrls.Any()))
            return new List<int>();

        var interests = await _unitOfWork.Interests.Query()
            .Where(i => i.IsDeleted == false || i.IsDeleted == null)
            .ToListAsync();

        var contentLower = content.ToLower();

        try
        {
            // 1. AI Prediction with Confidence Score
            var (categoryName, probability) = await _mlService.PredictTextCategoryWithScoreAsync(content);
            
            // High Confidence AI threshold (> 60%)
            if (!string.IsNullOrEmpty(categoryName) && categoryName != "unknown" && probability > 0.6f)
            {
                var interestId = await GetInterestIdByNameAsync(categoryName);
                if (interestId.HasValue) matchedInterestIds.Add(interestId.Value);
            }

            // 2. Hybrid / Keyword Matching
            foreach (var interest in interests)
            {
                var keywords = GetKeywordsForInterest(interest.Name);
                var hasKeywordMatch = keywords.Any(k => contentLower.Contains(k));

                // Logic: 
                // - Either high keyword match count (we currently check for at least 1)
                // - OR AI was 'somewhat' sure (30%+) and we have at least 1 keyword match
                if (hasKeywordMatch || (probability > 0.3f && categoryName == interest.Name))
                {
                    matchedInterestIds.Add(interest.Id);
                }
            }
        }
        catch (Exception)
        {
            // Fallback purely to keywords if AI service fails
            foreach (var interest in interests)
            {
                var keywords = GetKeywordsForInterest(interest.Name);
                if (keywords.Any(k => contentLower.Contains(k)))
                {
                    matchedInterestIds.Add(interest.Id);
                }
            }
        }

        // 3. Image Analysis
        if (imageUrls != null && imageUrls.Any())
        {
            var imageMatchedIds = await AnalyzeImagesAsync(imageUrls);
            foreach (var id in imageMatchedIds) matchedInterestIds.Add(id);
        }

        return matchedInterestIds.ToList();
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
            PostCategoryConstants.Tech => new List<string> { 
                "tech", "technology", "software", "hardware", "ai", "programming", "coding", "developer", "csharp", "c#", "dotnet", "python", "javascript", "java", "golang",
                "lập trình", "mã nguồn", "phần mềm", "phần cứng", "thuật toán", "công nghệ", "hệ điều hành", "trí tuệ nhân tạo", "dữ liệu", "backend", "frontend", "fullstack", "fix bug"
            },
            PostCategoryConstants.Music => new List<string> { 
                "music", "song", "album", "artist", "concert", "guitar", "piano",
                "âm nhạc", "bài hát", "ca sĩ", "nhạc sĩ", "hòa nhạc", "nhạc trẻ", "mv", "ca khúc"
            },
            PostCategoryConstants.News => new List<string> { 
                "news", "breaking", "update", "politics", "world", "local", "report",
                "tin tức", "thời sự", "bản tin", "thế giới", "kinh tế", "chính trị", "báo chí"
            },
            PostCategoryConstants.Nature => new List<string> { 
                "nature", "outdoor", "hiking", "mountain", "forest", "animal", "wildlife",
                "thiên nhiên", "ngoài trời", "leo núi", "rừng", "động vật", "biển", "hoàng hôn", "môi trường"
            },
            PostCategoryConstants.Politics => new List<string> { "politics", "government", "election", "policy", "chính trị", "bầu cử", "chính phủ", "chính sách" },
            PostCategoryConstants.Movies => new List<string> { "movie", "film", "cinema", "trailer", "phim", "điện ảnh", "chiếu rạp" },
            PostCategoryConstants.Science => new List<string> { "science", "physics", "biology", "space", "khoa học", "vật lý", "sinh học", "vũ trụ" },
            PostCategoryConstants.Sports => new List<string> { "sport", "football", "soccer", "basketball", "match", "thể thao", "bóng đá", "trận đấu" },
            PostCategoryConstants.Food => new List<string> { 
                "food", "cooking", "recipe", "delicious", "restaurant", "street food", "dinner",
                "món ăn", "nấu ăn", "công thức", "ngon", "ẩm thực", "nhà hàng"
            },
            _ => new List<string> { interestName.ToLower() }
        };
    }
}
