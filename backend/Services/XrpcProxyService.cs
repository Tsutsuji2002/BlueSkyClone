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

        public XrpcProxyService(IDidResolver didResolver, IHttpClientFactory httpClientFactory, IDistributedCache cache, ILogger<XrpcProxyService> logger)
        {
            _didResolver = didResolver;
            _httpClientFactory = httpClientFactory;
            _cache = cache;
            _logger = logger;
        }

        public async Task<ProxyResponse> ProxyRequestAsync(string didOrHandle, string nsid, IQueryCollection queryParams, string? token = null, string method = "GET", object? body = null, Guid? userId = null)
        {
            string did = didOrHandle;
            try
            {
                if (!didOrHandle.StartsWith("did:"))
                {
                    // Resolve handle to DID first
                    try
                    {
                        var client = _httpClientFactory.CreateClient();
                        client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
                        
                        var idResponse = await client.GetAsync($"https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle={didOrHandle}");
                        if (idResponse.IsSuccessStatusCode)
                        {
                            var data = await idResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
                            if (data != null && data.TryGetValue("did", out var resolvedDid))
                            {
                                did = resolvedDid;
                            }
                        }
                    }
                    catch { /* Fallback to using it as-is */ }
                }

                // 1. Resolve the DID Document to find the service endpoint
                _logger.LogInformation("[XrpcProxy] Resolving DID document for {Did}", did);
                var doc = await _didResolver.ResolveToDocumentAsync(did);
                if (doc == null)
                {
                    _logger.LogWarning("[XrpcProxy] DID Document not found for {Did}", did);
                    return new ProxyResponse { Success = false, StatusCode = 404, Content = "DID Document not found" };
                }
 
                if (doc.Service == null || !doc.Service.Any())
                {
                    _logger.LogWarning("[XrpcProxy] DID {Did} has no service endpoints", did);
                    return new ProxyResponse { Success = false, StatusCode = 404, Content = "DID Service endpoint not found" };
                }
 
                // AT Protocol PDS service type is usually "AtprotoPds" or "#atproto_pds"
                var service = doc.Service.FirstOrDefault(s => s.Type == "AtprotoPds") 
                             ?? doc.Service.FirstOrDefault(); // Fallback to first if not explicitly typed correctly
 
                if (service == null || string.IsNullOrEmpty(service.ServiceEndpoint))
                {
                    _logger.LogWarning("[XrpcProxy] PDS endpoint not found in DID document for {Did}", did);
                    return new ProxyResponse { Success = false, StatusCode = 404, Content = "PDS endpoint not found" };
                }
 
                _logger.LogInformation("[XrpcProxy] Resolved PDS endpoint: {Endpoint} for {Did}", service.ServiceEndpoint, did);

                // 2. Construct the remote URL
                var baseUrl = service.ServiceEndpoint.TrimEnd('/');
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

                // 4. Forward the request
                var clientReq = _httpClientFactory.CreateClient();
                clientReq.DefaultRequestHeaders.Add("User-Agent", "BSkyClone-Backend");
                
                var response = await clientReq.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("[XrpcProxy] Remote error {Status} for {Url}: {Content}", response.StatusCode, finalUrl, content);
                    
                }
 
                return new ProxyResponse
                {
                    Success = response.IsSuccessStatusCode,
                    StatusCode = (int)response.StatusCode,
                    Content = content,
                    ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error proxying {method} XRPC request {nsid} for {did}");
                return new ProxyResponse { Success = false, StatusCode = 500, Content = ex.Message };
            }
        }

        public async Task<ProxyResponse> ProxyRequestAsync(string did, string nsid, Dictionary<string, string?> queryParams, string? token = null, string method = "GET", object? body = null, Guid? userId = null)
        {
            var collection = new QueryCollection(queryParams.ToDictionary(p => p.Key, p => new Microsoft.Extensions.Primitives.StringValues(p.Value)));
            return await ProxyRequestAsync(did, nsid, collection, token, method, body, userId);
        }

        public async Task<ProxyResponse> ProxyRequestAsync(string didOrHandle, string nsid, Dictionary<string, string?> queryParams, string? token, string method, System.IO.Stream bodyStream, Guid? userId, string mimeType)
        {
            string did = didOrHandle;
            try
            {
                var baseUrl = await ResolvePdsUrlAsync(didOrHandle);
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
                
                var response = await clientReq.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

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

        public async Task<string?> ResolvePdsUrlAsync(string didOrHandle)
        {
            try
            {
                string did = didOrHandle;
                if (!didOrHandle.StartsWith("did:"))
                {
                    try
                    {
                        var client = _httpClientFactory.CreateClient();
                        client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
                        
                        var idResponse = await client.GetAsync($"https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle={didOrHandle}");
                        if (idResponse.IsSuccessStatusCode)
                        {
                            var data = await idResponse.Content.ReadFromJsonAsync<Dictionary<string, string>>();
                            if (data != null && data.TryGetValue("did", out var resolvedDid))
                            {
                                did = resolvedDid;
                            }
                        }
                    }
                    catch { /* Fallback to using it as-is */ }
                }

                var doc = await _didResolver.ResolveToDocumentAsync(did);
                if (doc == null || doc.Service == null || !doc.Service.Any()) return null;

                var service = doc.Service.FirstOrDefault(s => s.Type == "AtprotoPds") 
                             ?? doc.Service.FirstOrDefault();

                if (service == null || string.IsNullOrEmpty(service.ServiceEndpoint)) return null;

                return service.ServiceEndpoint;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to resolve PDS URL for {DidOrHandle}", didOrHandle);
                return null;
            }
        }

    }
}
