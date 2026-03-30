using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public interface IRecommendationService
{
    Task<PagedFeedsDto> GetRecommendedFeedsAsync(Guid userId, string? cursor = null, int limit = 10);
}

public class RecommendationService : IRecommendationService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IFeedService _feedService; // We reuse FeedService logic for mapping

    public RecommendationService(IUnitOfWork unitOfWork, IFeedService feedService)
    {
        _unitOfWork = unitOfWork;
        _feedService = feedService;
    }

    public async Task<PagedFeedsDto> GetRecommendedFeedsAsync(Guid userId, string? cursor = null, int limit = 10)
    {
        // For Pure Bluesky, "Recommended" feeds are just the popular feeds from the network.
        // We delegate to FeedService which already handles the remote fetch and preference sync.
        return await _feedService.GetTrendingFeedsAsync(userId, cursor, limit);
    }
}
