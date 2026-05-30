using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using BSkyClone.Models;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using System.IO;

namespace BSkyClone.Services
{
    public class XrpcProxyService : IXrpcProxyService
    {
        private readonly IDidResolver _didResolver;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IDistributedCache _cache;
        private readonly ILogger<XrpcProxyService> _logger;
        private readonly IServiceScopeFactory _scopeFactory;

        public XrpcProxyService(IDidResolver didResolver, IHttpClientFactory httpClientFactory, IDistributedCache cache, ILogger<XrpcProxyService> logger, IServiceScopeFactory scopeFactory)
        {
            _didResolver = didResolver;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;
            _scopeFactory = scopeFactory;
        }

        private static readonly HashSet<string> ContentCacheWhitelist = new()
        {
            "app.bsky.actor.getProfile",
            "app.bsky.feed.getAuthorFeed",
            "app.bsky.feed.getPostThread",
            "app.bsky.feed.getActorLikes",
            "app.bsky.feed.getActorFeeds",
            "app.bsky.graph.getFollowers",
            "app.bsky.graph.getFollows"
        };

        private string GetContentCacheKey(string didOrHandle, string nsid, IQueryCollection queryParams, Guid? userId)
        {
            var sb = new StringBuilder();
            sb.Append($"ContentCache_{nsid}_{didOrHandle.ToLower()}_");
            if (userId.HasValue) sb.Append($"{userId}_");
            
            if (queryParams != null && queryParams.Any())
            {
                var sortedParams = queryParams.OrderBy(p => p.Key);
                foreach (var param in sortedParams)
                {
                    sb.Append($"{param.Key}={param.Value}_");
                }
            }

            var fullKey = sb.ToString();
            if (fullKey.Length > 200)
            {
                using var sha256 = SHA256.Create();
                var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(fullKey));
                return "HashedContentCache_" + Convert.ToHexString(hash);
            }
            return fullKey;
        }

        public async Task<ProxyResponse> ProxyRequestAsync(string didOrHandle, string nsid, IQueryCollection queryParams, string? token = null, string method = "GET", object? body = null, Guid? userId = null, System.Threading.CancellationToken ct = default)
        {
            bool cacheable = method.Equals("GET", StringComparison.OrdinalIgnoreCase) && ContentCacheWhitelist.Contains(nsid);
            string? cacheKey = cacheable ? GetContentCacheKey(didOrHandle, nsid, queryParams, userId) : null;

            if (cacheKey != null)
            {
                using var ctsCache = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                var cached = await _cache.GetStringAsync(cacheKey, ctsCache.Token);
                if (!string.IsNullOrEmpty(cached))
                {
                    try
                    {
                        var response = JsonSerializer.Deserialize<ProxyResponse>(cached);
                        if (response != null)
                        {
                            _logger.LogInformation("[XrpcProxy] Cache hit for {Nsid} ({DidOrHandle})", nsid, didOrHandle);
                            return response;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to deserialize cached response for {CacheKey}", cacheKey);
                    }
                }
            }

            try
            {
                var baseUrl = await ResolvePdsEndpointAsync(didOrHandle);
                if (string.IsNullOrEmpty(baseUrl))
                {
                    return new ProxyResponse { Success = false, StatusCode = 404, Content = "PDS endpoint not found" };
                }

                _logger.LogInformation("[XrpcProxy] Using PDS endpoint: {Endpoint} for {Did}", baseUrl, didOrHandle);

                // 2. Construct the remote URL
                baseUrl = baseUrl.TrimEnd('/');
                var htu = $"{baseUrl}/xrpc/{nsid}";
                var finalUrl = htu;

                if (queryParams != null && queryParams.Any())
                {
                    var queryString = string.Join("&", queryParams.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value.ToString())}"));
                    finalUrl += $"?{queryString}";
                }

                _logger.LogInformation($"Proxying {method} request to: {finalUrl}");

                // 3. Prepare the request
                var request = new HttpRequestMessage(new HttpMethod(method), finalUrl);
                
                if (!string.IsNullOrEmpty(token))
                {
                    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                }

                if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) && body != null)
                {
                    var json = System.Text.Json.JsonSerializer.Serialize(body);
                    request.Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
                }

                // Forward the request
                var clientReq = _httpClientFactory.CreateClient();
                clientReq.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                
                // Add a reasonable timeout to prevent hanging the whole backend thread
                // [OPTIMIZATION] Reduced from 20s to 12s to allow faster fallback/failure
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(12));
                using var linkedCts = System.Threading.CancellationTokenSource.CreateLinkedTokenSource(cts.Token, ct);
                
                var response = await clientReq.SendAsync(request, linkedCts.Token);
                var content = await response.Content.ReadAsStringAsync(linkedCts.Token);

                // [TOKEN REFRESH] Bluesky PDS returns 401 OR 400 with {"error":"ExpiredToken"} when a token expires.
                // In either case, force-refresh the token and retry once.
                bool isExpiredToken = response.StatusCode == System.Net.HttpStatusCode.Unauthorized ||
                    (response.StatusCode == System.Net.HttpStatusCode.BadRequest && content.Contains("ExpiredToken"));

                if (isExpiredToken && userId.HasValue)
                {
                    _logger.LogWarning("[XrpcProxy] Expired/Unauthorized response ({Status}) for {Url}. Attempting token refresh for user {UserId}.", response.StatusCode, finalUrl, userId.Value);
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var userService = scope.ServiceProvider.GetRequiredService<IUserService>();
                        var freshToken = await userService.GetOrRefreshBlueskyTokenAsync(userId.Value, forceRefresh: true);
                        if (!string.IsNullOrEmpty(freshToken))
                        {
                            _logger.LogInformation("[XrpcProxy] Token refreshed for user {UserId}. Retrying request to {Url}.", userId.Value, finalUrl);
                            var retryRequest = new HttpRequestMessage(new HttpMethod(method), finalUrl);
                            retryRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", freshToken);
                            if (method.Equals("POST", StringComparison.OrdinalIgnoreCase) && body != null)
                            {
                                var retryJson = System.Text.Json.JsonSerializer.Serialize(body);
                                retryRequest.Content = new StringContent(retryJson, System.Text.Encoding.UTF8, "application/json");
                            }
                            var retryClient = _httpClientFactory.CreateClient();
                            retryClient.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                            using var retryCts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(12));
                            response = await retryClient.SendAsync(retryRequest, retryCts.Token);
                            content = await response.Content.ReadAsStringAsync(retryCts.Token);
                            _logger.LogInformation("[XrpcProxy] Retry result for {Url}: {Status}", finalUrl, response.StatusCode);
                        }
                        else
                        {
                            _logger.LogWarning("[XrpcProxy] Token refresh returned empty for user {UserId}. Cannot retry.", userId.Value);
                        }
                    }
                    catch (Exception refreshEx)
                    {
                        _logger.LogError(refreshEx, "[XrpcProxy] Error during token refresh for user {UserId}.", userId.Value);
                    }
                }

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[XrpcProxy] Remote error {Status} for {Url}: {Content}", response.StatusCode, finalUrl, content);
                }
 
                var proxyResponse = new ProxyResponse
                {
                    Success = response.IsSuccessStatusCode,
                    StatusCode = (int)response.StatusCode,
                    Content = content,
                    ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json"
                };

                if (cacheKey != null && proxyResponse.Success)
                {
                    // Cache small responses for 3 minutes
                    if (content.Length < 500000) // 0.5MB limit
                    {
                        var json = JsonSerializer.Serialize(proxyResponse);
                        using var ctsCacheSet = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                        await _cache.SetStringAsync(cacheKey, json, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(3) }, ctsCacheSet.Token);
                    }
                }

                return proxyResponse;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error proxying {method} XRPC request {nsid} for {didOrHandle}");
                return new ProxyResponse { Success = false, StatusCode = 500, Content = ex.Message };
            }
        }

        public async Task<ProxyResponse> ProxyRequestAsync(string did, string nsid, IEnumerable<KeyValuePair<string, string?>> queryParams, string? token = null, string method = "GET", object? body = null, Guid? userId = null, System.Threading.CancellationToken ct = default)
        {
            var collection = new QueryCollection(queryParams
                .GroupBy(p => p.Key)
                .ToDictionary(g => g.Key, g => new Microsoft.Extensions.Primitives.StringValues(g.Select(x => x.Value).ToArray())));
            return await ProxyRequestAsync(did, nsid, collection, token, method, body, userId, ct);
        }

        public async Task<ProxyResponse> ProxyRequestAsync(string didOrHandle, string nsid, Dictionary<string, string?> queryParams, string? token, string method, System.IO.Stream bodyStream, Guid? userId, string mimeType)
        {
            string did = didOrHandle;
            try
            {
                var baseUrl = await ResolvePdsEndpointAsync(didOrHandle);
                if (string.IsNullOrEmpty(baseUrl))
                {
                    return new ProxyResponse { Success = false, StatusCode = 404, Content = "PDS endpoint not found" };
                }

                var baseUrlFormatted = baseUrl.TrimEnd('/');
                var htu = $"{baseUrlFormatted}/xrpc/{nsid}";
                var finalUrl = htu;

                if (queryParams != null && queryParams.Any())
                {
                    var queryString = string.Join("&", queryParams.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value?.ToString() ?? "")}"));
                    finalUrl += $"?{queryString}";
                }

                _logger.LogInformation($"Proxying {method} request to: {finalUrl}");

                var request = new HttpRequestMessage(new HttpMethod(method), finalUrl);
                
                if (!string.IsNullOrEmpty(token))
                {
                    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
                }

                var streamContent = new StreamContent(bodyStream);
                streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue(mimeType);
                request.Content = streamContent;

                var clientReq = _httpClientFactory.CreateClient();
                clientReq.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                
                using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(30)); // Slightly longer for streams
                
                var response = await clientReq.SendAsync(request, cts.Token);
                var content = await response.Content.ReadAsStringAsync(cts.Token);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[XrpcProxy] Remote error {Status} for {Url}: {Content}", response.StatusCode, finalUrl, content);
                }

                return new ProxyResponse
                {
                    Success = response.IsSuccessStatusCode,
                    Content = content,
                    StatusCode = (int)response.StatusCode,
                    ContentType = response.Content.Headers.ContentType?.MediaType ?? "application/json"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error proxying {method} XRPC stream request {nsid} for {did}");
                return new ProxyResponse { Success = false, StatusCode = 500, Content = ex.Message };
            }
        }

        public async Task<string?> ResolvePdsEndpointAsync(string didOrHandle, bool forceRefresh = false)
        {
            try
            {
                var cacheKey = $"PdsUrl_{didOrHandle.ToLower()}";
                
                if (forceRefresh)
                {
                    _logger.LogInformation("[XrpcProxy] Forced PDS resolution refresh for {DidOrHandle}", didOrHandle);
                    await _cache.RemoveAsync(cacheKey);
                }
                else
                {
                    using var ctsCache1 = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                    var cachedUrl = await _cache.GetStringAsync(cacheKey, ctsCache1.Token);
                    if (!string.IsNullOrEmpty(cachedUrl)) return cachedUrl;
                }

                string did = didOrHandle;
                if (!didOrHandle.StartsWith("did:"))
                {
                    var handleCacheKey = $"ResolvedHandle_{didOrHandle.ToLower()}";
                    using var ctsCache2 = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                    var cachedDid = await _cache.GetStringAsync(handleCacheKey, ctsCache2.Token);
                    
                    if (!string.IsNullOrEmpty(cachedDid))
                    {
                        did = cachedDid;
                    }
                    else
                    {
                        try
                        {
                            var client = _httpClientFactory.CreateClient();
                            client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
                            
                            // Use a short timeout for DNS/Handle resolution
                            using var cts = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                            
                            var idResponse = await client.GetAsync($"https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle={didOrHandle}", cts.Token);
                            if (idResponse.IsSuccessStatusCode)
                            {
                                var data = await idResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
                                if (data != null && data.TryGetValue("did", out var resolvedDid))
                                {
                                    did = resolvedDid;
                                    using var ctsCache3 = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                                    await _cache.SetStringAsync(handleCacheKey, did, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) }, ctsCache3.Token);
                                }
                            }
                        }
                        catch { /* Fallback to using it as-is */ }
                    }
                }

                var doc = await _didResolver.ResolveToDocumentAsync(did);
                if (doc == null || doc.Service == null || !doc.Service.Any()) return null;

                var service = doc.Service.FirstOrDefault(s => s.Type == "AtprotoPds") 
                             ?? doc.Service.FirstOrDefault();

                if (service == null || string.IsNullOrEmpty(service.ServiceEndpoint)) return null;

                var endpoint = service.ServiceEndpoint;
                using var ctsCache4 = new System.Threading.CancellationTokenSource(TimeSpan.FromSeconds(5));
                await _cache.SetStringAsync(cacheKey, endpoint, new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24) }, ctsCache4.Token);
                
                return endpoint;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to resolve PDS URL for {DidOrHandle}", didOrHandle);
                return null;
            }
        }

    }
}
