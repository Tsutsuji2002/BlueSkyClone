using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using BSkyClone.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services
{
    public class DbCleanupService : BackgroundService
    {
        private readonly ILogger<DbCleanupService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromHours(24);
        private const int RetentionDays = 1;

        public DbCleanupService(ILogger<DbCleanupService> logger, IServiceProvider _serviceProvider)
        {
            _logger = logger;
            this._serviceProvider = _serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("DbCleanupService starting...");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    _logger.LogInformation("Starting database cleanup task...");
                    await PerformCleanupAsync(stoppingToken);
                    _logger.LogInformation("Database cleanup completed. Next run in {Interval} hours.", _cleanupInterval.TotalHours);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during database cleanup");
                }

                await Task.Delay(_cleanupInterval, stoppingToken);
            }
        }

        private async Task PerformCleanupAsync(CancellationToken stoppingToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BSkyDbContext>();

            var cutoffDate = DateTime.UtcNow.AddDays(-RetentionDays);

            // Batch deletion to avoid locking the database for too long
            int totalDeleted = 0;
            const int batchSize = 1000;
            
            bool moreToDelete = true;
            while (moreToDelete && !stoppingToken.IsCancellationRequested)
            {
                // Delete PostMedia first (Foreign Key)
                var oldPostsBatch = await db.Posts
                    .Where(p => p.Author.PasswordHash == "remote" && p.CreatedAt < cutoffDate)
                    .Select(p => p.Id)
                    .Take(batchSize)
                    .ToListAsync(stoppingToken);

                if (!oldPostsBatch.Any())
                {
                    moreToDelete = false;
                    break;
                }

                // Delete dependencies
                var media = await db.PostMedia.Where(m => oldPostsBatch.Contains(m.PostId)).ToListAsync(stoppingToken);
                db.PostMedia.RemoveRange(media);

                var linkPreviews = await db.LinkPreviews.Where(lp => lp.PostId != null && oldPostsBatch.Contains(lp.PostId.Value)).ToListAsync(stoppingToken);
                db.LinkPreviews.RemoveRange(linkPreviews);

                var notifications = await db.Notifications.Where(n => n.PostId != null && oldPostsBatch.Contains(n.PostId.Value)).ToListAsync(stoppingToken);
                db.Notifications.RemoveRange(notifications);

                // Finally delete the posts
                var postsToDelete = await db.Posts.Where(p => oldPostsBatch.Contains(p.Id)).ToListAsync(stoppingToken);
                db.Posts.RemoveRange(postsToDelete);

                int deletedInBatch = await db.SaveChangesAsync(stoppingToken);
                totalDeleted += oldPostsBatch.Count;
                
                _logger.LogInformation("Deleted {Count} old remote posts in batch...", totalDeleted);
                
                // Small delay between batches to let other queries through
                await Task.Delay(500, stoppingToken);
            }

            _logger.LogInformation("Finished pruning posts. Total remote posts deleted: {Total}", totalDeleted);

            // 2. Optional: Prune stub users who have no posts left and haven't been active
            // This is safer to do periodically as well.
            // (Skipping for now to prioritize post data which takes 90% of the space)
        }
    }
}
