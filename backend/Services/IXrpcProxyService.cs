using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace BSkyClone.Services
{
    public interface IXrpcProxyService
    {
        /// <summary>
        /// Proxies an XRPC request to a remote PDS based on the DID.
        /// </summary>
        /// <param name="did">The DID of the user/repo on the remote PDS.</param>
        /// <param name="nsid">The XRPC method name (e.g., app.bsky.actor.getProfile).</param>
        /// <param name="queryParams">Query parameters for the request.</param>
        /// <param name="token">Optional Bearer token for authentication.</param>
        /// <param name="method">HTTP method (GET or POST).</param>
        /// <param name="body">Optional JSON body for POST requests.</param>
        /// <returns>The response content as a string or byte array.</returns>
        Task<ProxyResponse> ProxyRequestAsync(string did, string nsid, IQueryCollection queryParams, string? token = null, string method = "GET", object? body = null);
        Task<ProxyResponse> ProxyRequestAsync(string did, string nsid, Dictionary<string, string?> queryParams, string? token = null, string method = "GET", object? body = null);
    }

    public class ProxyResponse
    {
        public bool Success { get; set; }
        public string Content { get; set; } = string.Empty;
        public string ContentType { get; set; } = "application/json";
        public int StatusCode { get; set; }
    }
}
