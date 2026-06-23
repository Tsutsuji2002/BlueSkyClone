using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services
{
    /// <summary>
    /// Service for monitoring and tracking performance metrics across the application
    /// </summary>
    public class PerformanceMonitoringService
    {
        private readonly ILogger<PerformanceMonitoringService> _logger;
        private readonly ConcurrentDictionary<string, PerformanceMetrics> _metrics;

        public PerformanceMonitoringService(ILogger<PerformanceMonitoringService> logger)
        {
            _logger = logger;
            _metrics = new ConcurrentDictionary<string, PerformanceMetrics>();
        }

        /// <summary>
        /// Log API call performance
        /// </summary>
        public void LogApiCall(string endpoint, long duration, bool success)
        {
            var key = $"api_{endpoint}";
            UpdateMetrics(key, duration, success);

            if (duration > 1000)
            {
                _logger.LogWarning("Slow API call: {Endpoint} took {Duration}ms", endpoint, duration);
            }
        }

        /// <summary>
        /// Log database query performance
        /// </summary>
        public void LogDatabaseQuery(string query, long duration)
        {
            var key = $"db_{query.GetHashCode()}";
            UpdateMetrics(key, duration, true);

            if (duration > 500)
            {
                _logger.LogWarning("Slow database query: {Query} took {Duration}ms", query, duration);
            }
        }

        /// <summary>
        /// Log cache operation performance
        /// </summary>
        public void LogCacheOperation(string operation, string key, bool hit)
        {
            var cacheKey = $"cache_{operation}";
            var metrics = _metrics.GetOrAdd(cacheKey, _ => new PerformanceMetrics());

            Interlocked.Increment(ref metrics.TotalOperations);
            if (hit)
            {
                Interlocked.Increment(ref metrics.SuccessfulOperations);
            }

            // Log cache hit ratio periodically
            if (metrics.TotalOperations % 100 == 0)
            {
                var hitRatio = (double)metrics.SuccessfulOperations / metrics.TotalOperations;
                _logger.LogInformation("Cache {Operation} hit ratio: {Ratio:P2}", operation, hitRatio);
            }
        }

        /// <summary>
        /// Log external API call performance
        /// </summary>
        public void LogExternalApiCall(string service, string endpoint, long duration, bool success)
        {
            var key = $"external_{service}_{endpoint}";
            UpdateMetrics(key, duration, success);

            if (duration > 2000)
            {
                _logger.LogWarning("Slow external API call: {Service} {Endpoint} took {Duration}ms", service, endpoint, duration);
            }
        }

        /// <summary>
        /// Get performance metrics for a specific key
        /// </summary>
        public PerformanceMetrics? GetMetrics(string key)
        {
            return _metrics.TryGetValue(key, out var metrics) ? metrics : null;
        }

        /// <summary>
        /// Get all performance metrics
        /// </summary>
        public Dictionary<string, PerformanceMetrics> GetAllMetrics()
        {
            return new Dictionary<string, PerformanceMetrics>(_metrics);
        }

        /// <summary>
        /// Reset all metrics
        /// </summary>
        public void ResetMetrics()
        {
            _metrics.Clear();
            _logger.LogInformation("Performance metrics reset");
        }

        /// <summary>
        /// Get performance summary
        /// </summary>
        public PerformanceSummary GetSummary()
        {
            var summary = new PerformanceSummary
            {
                TotalOperations = _metrics.Values.Sum(m => m.TotalOperations),
                TotalDuration = _metrics.Values.Sum(m => m.TotalDuration),
                SuccessfulOperations = _metrics.Values.Sum(m => m.SuccessfulOperations),
                FailedOperations = _metrics.Values.Sum(m => m.FailedOperations),
                AverageDuration = _metrics.Values.Any() ? _metrics.Values.Average(m => m.AverageDuration) : 0
            };

            return summary;
        }

        private void UpdateMetrics(string key, long duration, bool success)
        {
            var metrics = _metrics.GetOrAdd(key, _ => new PerformanceMetrics());

            Interlocked.Increment(ref metrics.TotalOperations);
            Interlocked.Add(ref metrics.TotalDuration, duration);
            Interlocked.Exchange(ref metrics.LastDuration, duration);

            if (success)
            {
                Interlocked.Increment(ref metrics.SuccessfulOperations);
            }
            else
            {
                Interlocked.Increment(ref metrics.FailedOperations);
            }

            // [PERF] Optimized comparison for min/max without excessive locking
            long currentMin = Interlocked.Read(ref metrics.MinDuration);
            while (duration < currentMin || currentMin == 0)
            {
                long prevMin = Interlocked.CompareExchange(ref metrics.MinDuration, duration, currentMin);
                if (prevMin == currentMin) break;
                currentMin = prevMin;
            }

            long currentMax = Interlocked.Read(ref metrics.MaxDuration);
            while (duration > currentMax)
            {
                long prevMax = Interlocked.CompareExchange(ref metrics.MaxDuration, duration, currentMax);
                if (prevMax == currentMax) break;
                currentMax = prevMax;
            }
        }
    }

    /// <summary>
    /// Performance metrics for tracking operations
    /// </summary>
    public class PerformanceMetrics
    {
        public long TotalOperations;
        public long TotalDuration;
        public long SuccessfulOperations;
        public long FailedOperations;
        public long LastDuration;
        public long MinDuration;
        public long MaxDuration;

        public double AverageDuration => TotalOperations > 0 ? (double)TotalDuration / TotalOperations : 0;
        public double SuccessRate => TotalOperations > 0 ? (double)SuccessfulOperations / TotalOperations : 0;
    }

    /// <summary>
    /// Summary of all performance metrics
    /// </summary>
    public class PerformanceSummary
    {
        public long TotalOperations { get; set; }
        public long TotalDuration { get; set; }
        public long SuccessfulOperations { get; set; }
        public long FailedOperations { get; set; }
        public double AverageDuration { get; set; }

        public double SuccessRate => TotalOperations > 0 ? (double)SuccessfulOperations / TotalOperations : 0;
    }
}