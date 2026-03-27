using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using BSkyClone.Models;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services
{
    public class XrpcProxyService : IXrpcProxyService
    {
        private readonly IDidResolver _didResolver;
        private readonly HttpClient _httpClient;
        private readonly ILogger<XrpcProxyService> _logger;

        public XrpcProxyService(IDidResolver didResolver, HttpClient httpClient, ILogger<XrpcProxyService> logger)
        {
            _didResolver = didResolver;
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<ProxyResponse> ProxyRequestAsync(string didOrHandle, string nsid, IQueryCollection queryParams, string? token = null, string method = "GET", object? body = null)
        {
            string did = didOrHandle;
            try
            {
                if (!didOrHandle.StartsWith("did:"))
                {
                    // Resolve handle to DID first
                    try
                    {
                        var idResponse = await _httpClient.GetAsync($"https://api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle={didOrHandle}");
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
                var doc = await _didResolver.ResolveToDocumentAsync(did);
                if (doc == null || doc.Service == null || !doc.Service.Any())
                {
                    return new ProxyResponse { Success = false, StatusCode = 404, Content = "DID Service endpoint not found" };
                }

                // AT Protocol PDS service type is usually "AtprotoPds" or "#atproto_pds"
                var service = doc.Service.FirstOrDefault(s => s.Type == "AtprotoPds") 
                             ?? doc.Service.FirstOrDefault(); // Fallback to first if not explicitly typed correctly

                if (service == null || string.IsNullOrEmpty(service.ServiceEndpoint))
                {
                    return new ProxyResponse { Success = false, StatusCode = 404, Content = "PDS endpoint not found" };
                }

                // 2. Construct the remote URL
                var baseUrl = service.ServiceEndpoint.TrimEnd('/');
                var url = $"{baseUrl}/xrpc/{nsid}";

                if (queryParams != null && queryParams.Any())
                {
                    var queryString = string.Join("&", queryParams.Select(p => $"{p.Key}={Uri.EscapeDataString(p.Value.ToString())}"));
                    url += $"?{queryString}";
                }

                _logger.LogInformation($"Proxying {method} request to: {url}");

                // 3. Prepare the request
                var request = new HttpRequestMessage(new HttpMethod(method), url);
                
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
                var response = await _httpClient.SendAsync(request);
                var content = await response.Content.ReadAsStringAsync();

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

        public async Task<ProxyResponse> ProxyRequestAsync(string did, string nsid, Dictionary<string, string?> queryParams, string? token = null, string method = "GET", object? body = null)
        {
            var collection = new QueryCollection(queryParams.ToDictionary(p => p.Key, p => new Microsoft.Extensions.Primitives.StringValues(p.Value)));
            return await ProxyRequestAsync(did, nsid, collection, token, method, body);
        }
    }
}
