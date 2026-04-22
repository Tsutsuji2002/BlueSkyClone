using BSkyClone.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace BSkyClone.Services;

public class ThreadReplyCacheService
{
    private readonly IMemoryCache _cache;
    
    public ThreadReplyCacheService(IMemoryCache cache)
    {
        _cache = cache;
    }

    private string CacheKey(string postUri) => $"replies_flat:{postUri}";

    public bool TryGet(string postUri, out List<PostDto>? replies)
    {
        return _cache.TryGetValue(CacheKey(postUri), out replies);
    }

    public void Set(string postUri, List<PostDto> replies)
    {
        // TTL: 2 minutes. Short enough to stay fresh, long enough 
        // to serve all paginated requests for a single thread view session.
        _cache.Set(CacheKey(postUri), replies, TimeSpan.FromMinutes(2));
    }

    public void Invalidate(string postUri)
    {
        _cache.Remove(CacheKey(postUri));
    }
}
