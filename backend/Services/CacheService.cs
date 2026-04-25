using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace BSkyClone.Services;

public class CacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<CacheService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public CacheService(IDistributedCache cache, ILogger<CacheService> logger)
    {
        _cache = cache;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            ReferenceHandler = ReferenceHandler.IgnoreCycles,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var cachedData = await _cache.GetStringAsync(key);
            if (string.IsNullOrEmpty(cachedData))
            {
                return default;
            }

            return JsonSerializer.Deserialize<T>(cachedData, _jsonOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache for key: {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        try
        {
            var serializedData = JsonSerializer.Serialize(value, _jsonOptions);
            var options = new DistributedCacheEntryOptions();
            
            if (expiration.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = expiration;
            }
            else
            {
                // Default expiration if not provided (e.g., 60 minutes)
                options.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(60);
            }

            await _cache.SetStringAsync(key, serializedData, options);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache for key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            await _cache.RemoveAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing cache for key: {Key}", key);
        }
    }

    public async Task RemoveByPrefixAsync(string prefix)
    {
        _logger.LogWarning("RemoveByPrefixAsync called with prefix {Prefix}, but not fully implemented for IDistributedCache wrapper.", prefix);
        await Task.CompletedTask;
    }

    public async Task<bool> TryLockAsync(string key, TimeSpan expiration)
    {
        try
        {
            var existing = await _cache.GetStringAsync(key);
            if (existing != null) return false;

            await _cache.SetStringAsync(key, "locked", new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            });
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error trying to lock key: {Key}", key);
            return true; // If cache is down, allow the operation but log it
        }
    }

    public async Task ReleaseLockAsync(string key)
    {
        try
        {
            await _cache.RemoveAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error releasing lock for key: {Key}", key);
        }
    }

    /// <summary>
    /// Get value from cache or create it using the factory function
    /// </summary>
    public async Task<T?> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiration = null)
    {
        try
        {
            var cached = await GetAsync<T>(key);
            if (cached != null)
            {
                _logger.LogDebug("Cache hit for key: {Key}", key);
                return cached;
            }

            _logger.LogDebug("Cache miss for key: {Key}, creating value", key);
            var value = await factory();
            if (value != null)
            {
                await SetAsync(key, value, expiration);
            }
            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in GetOrCreateAsync for key: {Key}", key);
            return await factory(); // Fallback to factory if cache fails
        }
    }

    /// <summary>
    /// Get multiple values from cache by keys
    /// </summary>
    public async Task<Dictionary<string, T>> GetManyAsync<T>(IEnumerable<string> keys)
    {
        var result = new Dictionary<string, T>();
        var tasks = keys.Select(async key =>
        {
            var value = await GetAsync<T>(key);
            return new { Key = key, Value = value };
        });

        var results = await Task.WhenAll(tasks);
        foreach (var item in results)
        {
            if (item.Value != null)
            {
                result[item.Key] = item.Value;
            }
        }

        return result;
    }

    /// <summary>
    /// Set multiple values in cache
    /// </summary>
    public async Task SetManyAsync<T>(Dictionary<string, T> items, TimeSpan? expiration = null)
    {
        var tasks = items.Select(async item =>
        {
            try
            {
                await SetAsync(item.Key, item.Value, expiration);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting cache for key: {Key}", item.Key);
            }
        });

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Remove multiple keys from cache
    /// </summary>
    public async Task RemoveManyAsync(IEnumerable<string> keys)
    {
        var tasks = keys.Select(async key =>
        {
            try
            {
                await RemoveAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cache for key: {Key}", key);
            }
        });

        await Task.WhenAll(tasks);
    }

    /// <summary>
    /// Check if key exists in cache
    /// </summary>
    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            var cached = await _cache.GetStringAsync(key);
            return !string.IsNullOrEmpty(cached);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking cache existence for key: {Key}", key);
            return false;
        }
    }
}
