using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services
{
    public class TrendingService : BackgroundService, ITrendingService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<TrendingService> _logger;
        private TrendingData _cachedData = new();
        private readonly SemaphoreSlim _refreshLock = new SemaphoreSlim(1, 1);
        private readonly TimeSpan _refreshInterval = TimeSpan.FromMinutes(30);

        public TrendingService(
            IServiceScopeFactory scopeFactory,
            IHttpClientFactory httpClientFactory,
            ILogger<TrendingService> logger)
        {
            _scopeFactory = scopeFactory;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public TrendingData GetTrendingData()
        {
            return _cachedData;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Trending background service is starting.");

            // Initial refresh
            await RefreshTrendingInternalAsync();

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(_refreshInterval, stoppingToken);
                    await RefreshTrendingInternalAsync();
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error refreshing trending data in background.");
                }
            }
        }

        public async Task RefreshTrendingAsync()
        {
            await RefreshTrendingInternalAsync();
        }

        private async Task RefreshTrendingInternalAsync()
        {
            if (!await _refreshLock.WaitAsync(0))
            {
                _logger.LogInformation("Trending refresh already in progress, skipping.");
                return;
            }

            try
            {
                _logger.LogInformation("Computing fresh trending data...");
                var newData = new TrendingData();

                // 1. Try ATProto Trending
                var atprotoTopics = await TryGetTrendingFromBlueskyAsync();
                if (atprotoTopics != null && atprotoTopics.Any())
                {
                    newData.Topics = atprotoTopics;
                }
                else
                {
                    // 2. Fallback to Local Trending
                    newData.Topics = await ComputeTrendingFromLocalAsync();
                }

                // 3. Fetch Popular Accounts
                newData.Accounts = await FetchPopularAccountsAsync();

                _cachedData = newData;
                _logger.LogInformation("Successfully updated trending cache with {TopicCount} topics and {AccountCount} accounts.", 
                    newData.Topics.Count, newData.Accounts.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to refresh trending data.");
            }
            finally
            {
                _refreshLock.Release();
            }
        }

        private async Task<List<TrendingTopicDto>> TryGetTrendingFromBlueskyAsync()
        {
            try
            {
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(3); // Fast timeout for responsiveness
                
                var url = "https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrendingTopics";
                var response = await client.GetAsync(url);

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(content);

                    if (doc.RootElement.TryGetProperty("topics", out var topicsArray) && topicsArray.ValueKind == JsonValueKind.Array)
                    {
                        var topics = new List<TrendingTopicDto>();
                        foreach (var item in topicsArray.EnumerateArray())
                        {
                            var topicStr = item.TryGetProperty("topic", out var tEl) ? tEl.GetString() : "";
                            if (!string.IsNullOrEmpty(topicStr))
                            {
                                var hashtag = topicStr.StartsWith("#") ? topicStr.Substring(1) : topicStr.Replace(" ", "");
                                var link = item.TryGetProperty("link", out var lEl) ? lEl.GetString() : null;
                                
                                topics.Add(new TrendingTopicDto
                                {
                                    Id = topics.Count.ToString(),
                                    Hashtag = hashtag,
                                    PostsCount = 1000 - topics.Count,
                                    Category = "Trending",
                                    Link = link
                                });
                            }
                        }
                        return topics;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to fetch trending from Bluesky API: {Message}", ex.Message);
            }
            return null;
        }

        private async Task<List<TrendingTopicDto>> ComputeTrendingFromLocalAsync()
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<BSkyDbContext>();

                // Optimized local retrieval: Use the Hashtags table which is pre-aggregated
                var topHashtags = await context.Hashtags
                    .AsNoTracking()
                    .Where(h => h.IsDeleted != true)
                    .OrderByDescending(h => h.PostsCount)
                    .Take(15)
                    .ToListAsync();

                return topHashtags.Select((t, index) => new TrendingTopicDto
                {
                    Id = index.ToString(),
                    Hashtag = t.Name,
                    PostsCount = t.PostsCount ?? 1,
                    Category = "Global"
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error computing local trending topics.");
                return new List<TrendingTopicDto>();
            }
        }

        private async Task<List<object>> FetchPopularAccountsAsync()
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<BSkyDbContext>();

                var accounts = await context.Users
                    .AsNoTracking()
                    .Where(u => u.IsDeleted != true && u.IsBanned != true)
                    .OrderByDescending(u => u.FollowersCount)
                    .Take(5)
                    .Select(u => new
                    {
                        Id = u.Id.ToString(),
                        DisplayName = u.DisplayName ?? u.Username,
                        Handle = u.Handle,
                        Avatar = u.AvatarUrl,
                        PostsCount = (u.PostsCount ?? 0),
                        Category = "Popular",
                        Type = "account",
                        FollowersAvatars = new List<string> { u.AvatarUrl ?? "" }
                    })
                    .ToListAsync();

                return accounts.Cast<object>().ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching popular accounts.");
                return new List<object>();
            }
        }
    }
}
