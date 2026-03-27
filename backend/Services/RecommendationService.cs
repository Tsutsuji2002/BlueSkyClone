using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public interface IRecommendationService
{
    Task<IEnumerable<FeedDto>> GetRecommendedFeedsAsync(Guid userId);
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

    public async Task<IEnumerable<FeedDto>> GetRecommendedFeedsAsync(Guid userId)
    {
        // For Pure Bluesky, "Recommended" feeds are just the popular feeds from the network.
        // We delegate to FeedService which already handles the remote fetch and preference sync.
        return await _feedService.GetTrendingFeedsAsync(userId);
    }
}
