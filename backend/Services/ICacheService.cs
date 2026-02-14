using System;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null);
    Task RemoveAsync(string key);
    Task RemoveByPrefixAsync(string prefix);
    Task<bool> TryLockAsync(string key, TimeSpan expiration);
    Task ReleaseLockAsync(string key);
}
