using Microsoft.Extensions.Logging;

namespace BSkyClone.Services
{
    /// <summary>
    /// Service for monitoring and tracking performance metrics across the application
    /// </summary>
    public class PerformanceMonitoringService
    {
        private readonly ILogger<PerformanceMonitoringService> _logger;
        private readonly Dictionary<string, PerformanceMetrics> _metrics;

        public PerformanceMonitoringService(ILogger<PerformanceMonitoringService> logger)
        {
            _logger = logger;
            _metrics = new Dictionary<string, PerformanceMetrics>();
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
            if (!_metrics.ContainsKey(cacheKey))
            {
                _metrics[cacheKey] = new PerformanceMetrics();
            }

            _metrics[cacheKey].TotalOperations++;
            if (hit)
            {
                _metrics[cacheKey].SuccessfulOperations++;
            }

            // Log cache hit ratio periodically
            if (_metrics[cacheKey].TotalOperations % 100 == 0)
            {
                var hitRatio = (double)_metrics[cacheKey].SuccessfulOperations / _metrics[cacheKey].TotalOperations;
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
            if (!_metrics.ContainsKey(key))
            {
                _metrics[key] = new PerformanceMetrics();
            }

            var metrics = _metrics[key];
            metrics.TotalOperations++;
            metrics.TotalDuration += duration;
            metrics.LastDuration = duration;

            if (success)
            {
                metrics.SuccessfulOperations++;
            }
            else
            {
                metrics.FailedOperations++;
            }

            // Update min/max
            if (metrics.MinDuration == 0 || duration < metrics.MinDuration)
            {
                metrics.MinDuration = duration;
            }

            if (duration > metrics.MaxDuration)
            {
                metrics.MaxDuration = duration;
            }
        }
    }

    /// <summary>
    /// Performance metrics for tracking operations
    /// </summary>
    public class PerformanceMetrics
    {
        public long TotalOperations { get; set; }
        public long TotalDuration { get; set; }
        public long SuccessfulOperations { get; set; }
        public long FailedOperations { get; set; }
        public long LastDuration { get; set; }
        public long MinDuration { get; set; }
        public long MaxDuration { get; set; }

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