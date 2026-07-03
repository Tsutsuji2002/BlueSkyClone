using Microsoft.AspNetCore.Mvc;
using BSkyClone.Services;
using BSkyClone.Utilities;
using Microsoft.EntityFrameworkCore;
using BSkyClone.Models;
using System.Net.Http;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("xrpc")]
    public class SyncController : ControllerBase
    {
        private readonly IRepoManager _repo;
        private readonly BSkyDbContext _dbContext;
        private readonly IXrpcProxyService _xrpcProxy;
        private readonly IHttpClientFactory _httpClientFactory;

        public SyncController(IRepoManager repo, BSkyDbContext dbContext, IXrpcProxyService xrpcProxy, IHttpClientFactory httpClientFactory)
        {
            _repo = repo;
            _dbContext = dbContext;
            _xrpcProxy = xrpcProxy;
            _httpClientFactory = httpClientFactory;
        }

        [HttpGet("com.atproto.sync.getRepo")]
        public async Task<IActionResult> GetRepo([FromQuery] string did, string? since = null)
        {
            try
            {
                var stream = await _repo.GetRepoCheckoutStreamAsync(did);
                return File(stream, "application/vnd.ipld.car", $"{did}.car");
            }
            catch (Exception ex)
            {
                if (ex.Message.Contains("User not found"))
                {
                    return NotFound(new { error = "RepoNotFound", message = ex.Message });
                }
                return BadRequest(new { error = "InvalidRequest", message = ex.Message });
            }
        }

        [HttpGet("com.atproto.sync.getLatestCommit")]
        public async Task<IActionResult> GetLatestCommit(string did)
        {
            var commitCid = await _repo.GetLatestCommitAsync(did);
            if (commitCid == null) return NotFound(new { error = "RepoNotFound" });

            return Ok(new
            {
                cid = commitCid,
                rev = "" // Rev should be fetched from user if needed
            });
        }

        [HttpGet("com.atproto.sync.getBlocks")]
        public async Task<IActionResult> GetBlocks(string did, [FromQuery] List<string> cids)
        {
            try
            {
                var ms = new MemoryStream();
                // For getBlocks, AT Protocol often omits the header roots or uses a dummy.
                // We'll write a simple header with the first CID or empty roots.
                await CarUtils.WriteHeaderAsync(ms, cids.Count > 0 ? cids[0] : "");

                foreach (var cid in cids)
                {
                    var block = await _repo.GetBlockAsync(cid);
                    if (block != null && block.Did == did)
                    {
                        await CarUtils.WriteBlockAsync(ms, block.Cid, block.Data);
                    }
                }

                ms.Position = 0;
                return File(ms, "application/vnd.ipld.car", "blocks.car");
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "InvalidRequest", message = ex.Message });
            }
        }

        [HttpGet("com.atproto.sync.listRepos")]
        public async Task<IActionResult> ListRepos(int limit = 50, string? cursor = null)
        {
            var users = await _dbContext.Users
                .Where(u => !string.IsNullOrEmpty(u.RepoCommit))
                .Take(limit)
                .Select(u => new { did = u.Did, head = u.RepoCommit })
                .ToListAsync();

            return Ok(new
            {
                repos = users
            });
        }
        
        [HttpGet("com.atproto.sync.getCheckout")]
        public async Task<IActionResult> GetCheckout(string did)
        {
            // Legacy/Alias for getRepo
            return await GetRepo(did);
        }

        [HttpGet("com.atproto.sync.getBlob")]
        public async Task<IActionResult> GetBlob([FromQuery] string did, [FromQuery] string cid)
        {
            if (string.IsNullOrEmpty(did) || string.IsNullOrEmpty(cid))
            {
                return BadRequest(new { error = "InvalidRequest", message = "Missing 'did' or 'cid' query parameters." });
            }

            try
            {
                // 1. Try fetching from local block storage first.
                var block = await _repo.GetBlockAsync(cid);
                if (block != null && block.Did == did)
                {
                    return File(block.Data, "application/octet-stream");
                }

                // 2. Resolve PDS endpoint for remote DIDs.
                string? pdsUrl = null;
                try
                {
                    pdsUrl = await _xrpcProxy.ResolvePdsEndpointAsync(did);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[SyncController] PDS Resolution error: {ex.Message}");
                }

                if (string.IsNullOrEmpty(pdsUrl))
                {
                    pdsUrl = "https://bsky.social";
                }

                pdsUrl = pdsUrl.TrimEnd('/');
                var url = $"{pdsUrl}/xrpc/com.atproto.sync.getBlob?did={Uri.EscapeDataString(did)}&cid={Uri.EscapeDataString(cid)}";

                var client = _httpClientFactory.CreateClient();
                var request = new HttpRequestMessage(HttpMethod.Get, url);

                // Forward authorization token if present
                if (Request.Headers.TryGetValue("Authorization", out var authHeader))
                {
                    request.Headers.Add("Authorization", authHeader.ToString());
                }

                var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead);
                if (response.IsSuccessStatusCode)
                {
                    var contentType = response.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
                    var stream = await response.Content.ReadAsStreamAsync();
                    return File(stream, contentType);
                }

                // Fallback to bsky.social if local PDS returned error/not found
                if (pdsUrl != "https://bsky.social")
                {
                    var fallbackUrl = $"https://bsky.social/xrpc/com.atproto.sync.getBlob?did={Uri.EscapeDataString(did)}&cid={Uri.EscapeDataString(cid)}";
                    var fallbackRequest = new HttpRequestMessage(HttpMethod.Get, fallbackUrl);
                    if (Request.Headers.TryGetValue("Authorization", out var authHeader2))
                    {
                        fallbackRequest.Headers.Add("Authorization", authHeader2.ToString());
                    }

                    var fallbackResponse = await client.SendAsync(fallbackRequest, HttpCompletionOption.ResponseHeadersRead);
                    if (fallbackResponse.IsSuccessStatusCode)
                    {
                        var contentType = fallbackResponse.Content.Headers.ContentType?.ToString() ?? "application/octet-stream";
                        var stream = await fallbackResponse.Content.ReadAsStreamAsync();
                        return File(stream, contentType);
                    }
                }

                return StatusCode((int)response.StatusCode, await response.Content.ReadAsStringAsync());
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "InvalidRequest", message = ex.Message });
            }
        }
    }
}
