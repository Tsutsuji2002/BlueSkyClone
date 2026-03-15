using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using BSkyClone.Constants;
using BSkyClone.Services.ML;
using Microsoft.EntityFrameworkCore;

using Microsoft.Extensions.Caching.Memory;

namespace BSkyClone.Services;

public class CategorizationService : ICategorizationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMLModelService _mlService;
    private readonly IMemoryCache _cache;

    public CategorizationService(IUnitOfWork unitOfWork, IMLModelService mlService, IMemoryCache cache)
    {
        _unitOfWork = unitOfWork;
        _mlService = mlService;
        _cache = cache;
    }

    private async Task<List<Interest>> GetCachedInterestsAsync()
    {
        const string cacheKey = "interests_list";
        if (_cache.TryGetValue(cacheKey, out List<Interest>? interests))
        {
            return interests!;
        }

        interests = await _unitOfWork.Interests.Query()
            .Where(i => i.IsDeleted == false || i.IsDeleted == null)
            .ToListAsync();

        _cache.Set(cacheKey, interests, TimeSpan.FromHours(1));
        return interests;
    }

    public async Task<List<int>> CategorizePostAsync(string content, List<string>? imageUrls = null)
    {
        var matchedInterestIds = new HashSet<int>();
        if (string.IsNullOrWhiteSpace(content) && (imageUrls == null || !imageUrls.Any()))
            return new List<int>();

        var interests = await GetCachedInterestsAsync();
        var contentLower = content.ToLower();

        try
        {
            // 1. AI Prediction with Confidence Score
            var (categoryName, probability) = await _mlService.PredictTextCategoryWithScoreAsync(content);
            
            // High Confidence AI threshold (> 60%)
            if (!string.IsNullOrEmpty(categoryName) && categoryName != "unknown" && probability > 0.6f)
            {
                var interestId = interests.FirstOrDefault(i => i.Name == categoryName)?.Id;
                if (interestId.HasValue) matchedInterestIds.Add(interestId.Value);
            }

            // 2. Hybrid / Keyword Matching
            foreach (var interest in interests)
            {
                var keywords = GetKeywordsForInterest(interest.Name);
                var hasKeywordMatch = keywords.Any(k => contentLower.Contains(k));

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
            var imageMatchedIds = await AnalyzeImagesAsync(imageUrls, interests);
            foreach (var id in imageMatchedIds) matchedInterestIds.Add(id);
        }

        return matchedInterestIds.ToList();
    }

    private async Task<List<int>> AnalyzeImagesAsync(List<string> imageUrls, List<Interest> interests)
    {
        var matchedIds = new HashSet<int>();
        
        // Parallelize image analysis as these might involve downloads/ML
        var tasks = imageUrls.Select(async url => 
        {
            var label = await _mlService.PredictImageLabelAsync(url);
            if (!string.IsNullOrEmpty(label) && label != "neutral" && label != "unknown")
            {
                var interestId = interests.FirstOrDefault(i => i.Name == label)?.Id;
                if (interestId.HasValue)
                {
                    lock(matchedIds) { matchedIds.Add(interestId.Value); }
                }
            }
        });

        await Task.WhenAll(tasks);
        return matchedIds.ToList();
    }

    public async Task<Dictionary<string, float>> ScorePostForDiscoverAsync(string content, List<string>? imageUrls = null)
    {
        var contentHash = string.IsNullOrEmpty(content) ? "empty" : content.GetHashCode().ToString();
        var cacheKey = $"post_score:{contentHash}:{imageUrls?.Count ?? 0}";
        
        if (_cache.TryGetValue(cacheKey, out Dictionary<string, float>? cachedScores))
        {
            return cachedScores!;
        }

        var scores = new Dictionary<string, float>();
        if (string.IsNullOrWhiteSpace(content) && (imageUrls == null || !imageUrls.Any()))
            return scores;

        var interests = await GetCachedInterestsAsync();
        var contentLower = content?.ToLower() ?? "";

        // ... existing text AI scoring ...
        try
        {
            if (!string.IsNullOrWhiteSpace(content))
            {
                var textScores = await _mlService.PredictTextMultiLabelAsync(content);
                foreach (var (category, confidence) in textScores)
                {
                    scores[category] = confidence * 0.6f;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Text scoring error: {ex.Message}");
        }

        // 2. Keyword matching bonus
        foreach (var interest in interests)
        {
            var keywords = GetKeywordsForInterest(interest.Name);
            var matchCount = keywords.Count(k => contentLower.Contains(k));
            if (matchCount > 0)
            {
                var keywordScore = Math.Min(matchCount * 0.1f, 0.3f);
                if (scores.ContainsKey(interest.Name))
                    scores[interest.Name] = Math.Min(1.0f, scores[interest.Name] + keywordScore);
                else
                    scores[interest.Name] = keywordScore;
            }
        }

        // 3. Image AI multi-label scores
        if (imageUrls != null && imageUrls.Any())
        {
            try
            {
                // Parallelize image scoring
                var tasks = imageUrls.Select(async url => 
                {
                    var imageScores = await _mlService.PredictImageMultiLabelAsync(url);
                    foreach (var (category, confidence) in imageScores)
                    {
                        var imageWeight = confidence * 0.4f;
                        lock (scores)
                        {
                            if (scores.ContainsKey(category))
                                scores[category] = Math.Min(1.0f, scores[category] + imageWeight);
                            else
                                scores[category] = imageWeight;
                        }
                    }
                });
                await Task.WhenAll(tasks);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Image scoring error: {ex.Message}");
            }
        }

        _cache.Set(cacheKey, scores, TimeSpan.FromHours(24));
        return scores;
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
