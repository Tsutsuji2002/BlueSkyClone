using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Models;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/starterpack")]
public class StarterPackController : ControllerBase
{
    private readonly IXrpcProxyService _xrpcProxyService;

    public StarterPackController(IXrpcProxyService xrpcProxyService)
    {
        _xrpcProxyService = xrpcProxyService;
    }

    private string? ExtractBearerToken()
    {
        string? authHeader = Request.Headers["Authorization"].FirstOrDefault();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return authHeader.Substring(7);
        }
        return null;
    }

    /// <summary>
    /// Gets a single starter pack by AT-URI.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("view")]
    public async Task<IActionResult> GetStarterPack([FromQuery] string starterPack)
    {
        if (string.IsNullOrWhiteSpace(starterPack))
        {
            return BadRequest(new { message = "starterPack parameter is required" });
        }

        var token = ExtractBearerToken();
        var queryParams = new List<KeyValuePair<string, string?>>
        {
            new KeyValuePair<string, string?>("starterPack", starterPack)
        };

        var response = await _xrpcProxyService.ProxyRequestAsync(
            did: "public.api.bsky.app",
            nsid: "app.bsky.graph.getStarterPack",
            queryParams: queryParams,
            token: token,
            method: "GET"
        );

        // Fallback: If token expired/invalid (401/400), retry without token
        if (!response.Success && token != null)
        {
            response = await _xrpcProxyService.ProxyRequestAsync(
                did: "public.api.bsky.app",
                nsid: "app.bsky.graph.getStarterPack",
                queryParams: queryParams,
                token: null,
                method: "GET"
            );
        }

        if (!response.Success)
        {
            return StatusCode(response.StatusCode, response.Content);
        }

        return Content(response.Content, "application/json");
    }

    /// <summary>
    /// Gets starter packs created by a specific actor/user.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("actor/{actor}")]
    public async Task<IActionResult> GetActorStarterPacks(string actor, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        if (string.IsNullOrWhiteSpace(actor))
        {
            return BadRequest(new { message = "actor parameter is required" });
        }

        var token = ExtractBearerToken();
        var queryParams = new List<KeyValuePair<string, string?>>
        {
            new KeyValuePair<string, string?>("actor", actor),
            new KeyValuePair<string, string?>("limit", limit.ToString())
        };

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            queryParams.Add(new KeyValuePair<string, string?>("cursor", cursor));
        }

        var response = await _xrpcProxyService.ProxyRequestAsync(
            did: actor,
            nsid: "app.bsky.graph.getActorStarterPacks",
            queryParams: queryParams,
            token: token,
            method: "GET"
        );

        // Fallback 1: Retry without token if initial authenticated request failed
        if (!response.Success && token != null)
        {
            response = await _xrpcProxyService.ProxyRequestAsync(
                did: actor,
                nsid: "app.bsky.graph.getActorStarterPacks",
                queryParams: queryParams,
                token: null,
                method: "GET"
            );
        }

        // Fallback 2: Fallback to public.api.bsky.app if actor PDS proxy failed
        if (!response.Success)
        {
            response = await _xrpcProxyService.ProxyRequestAsync(
                did: "public.api.bsky.app",
                nsid: "app.bsky.graph.getActorStarterPacks",
                queryParams: queryParams,
                token: null,
                method: "GET"
            );
        }

        if (!response.Success)
        {
            return StatusCode(response.StatusCode, response.Content);
        }

        return Content(response.Content, "application/json");
    }

    /// <summary>
    /// Batch follows all users in a starter pack.
    /// </summary>
    [Authorize]
    [HttpPost("follow-all")]
    public async Task<IActionResult> FollowAll([FromBody] List<string> targetDids)
    {
        if (targetDids == null || !targetDids.Any())
        {
            return BadRequest(new { message = "targetDids list cannot be empty" });
        }

        var token = ExtractBearerToken();
        var userDidClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("did")?.Value;

        if (string.IsNullOrEmpty(userDidClaim))
        {
            return Unauthorized(new { message = "User DID claim not found" });
        }

        int successCount = 0;
        foreach (var targetDid in targetDids.Distinct())
        {
            try
            {
                var body = new
                {
                    repo = userDidClaim,
                    collection = "app.bsky.graph.follow",
                    record = new
                    {
                        subject = targetDid,
                        createdAt = DateTime.UtcNow.ToString("o")
                    }
                };

                var res = await _xrpcProxyService.ProxyRequestAsync(
                    did: userDidClaim,
                    nsid: "com.atproto.repo.createRecord",
                    queryParams: Enumerable.Empty<KeyValuePair<string, string?>>(),
                    token: token,
                    method: "POST",
                    body: body
                );

                if (res.Success)
                {
                    successCount++;
                }
            }
            catch
            {
                // Continue following remaining users
            }
        }

        return Ok(new { successCount, total = targetDids.Count });
    }

    /// <summary>
    /// Gets real-time members of a list using ATProto app.bsky.graph.getList.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("list-members")]
    public async Task<IActionResult> GetListMembers([FromQuery] string list, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
    {
        if (string.IsNullOrWhiteSpace(list))
        {
            return BadRequest(new { message = "list parameter is required" });
        }

        var token = ExtractBearerToken();
        var queryParams = new List<KeyValuePair<string, string?>>
        {
            new KeyValuePair<string, string?>("list", list),
            new KeyValuePair<string, string?>("limit", limit.ToString())
        };

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            queryParams.Add(new KeyValuePair<string, string?>("cursor", cursor));
        }

        var response = await _xrpcProxyService.ProxyRequestAsync(
            did: "public.api.bsky.app",
            nsid: "app.bsky.graph.getList",
            queryParams: queryParams,
            token: token,
            method: "GET"
        );

        if (!response.Success && token != null)
        {
            response = await _xrpcProxyService.ProxyRequestAsync(
                did: "public.api.bsky.app",
                nsid: "app.bsky.graph.getList",
                queryParams: queryParams,
                token: null,
                method: "GET"
            );
        }

        if (!response.Success)
        {
            return StatusCode(response.StatusCode, response.Content);
        }

        return Content(response.Content, "application/json");
    }

    /// <summary>
    /// Gets real-time posts from a starter pack's list members using ATProto app.bsky.feed.getListFeed.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("list-feed")]
    public async Task<IActionResult> GetListFeed([FromQuery] string list, [FromQuery] int limit = 30, [FromQuery] string? cursor = null)
    {
        if (string.IsNullOrWhiteSpace(list))
        {
            return BadRequest(new { message = "list parameter is required" });
        }

        var token = ExtractBearerToken();
        var queryParams = new List<KeyValuePair<string, string?>>
        {
            new KeyValuePair<string, string?>("list", list),
            new KeyValuePair<string, string?>("limit", limit.ToString())
        };

        if (!string.IsNullOrWhiteSpace(cursor))
        {
            queryParams.Add(new KeyValuePair<string, string?>("cursor", cursor));
        }

        var response = await _xrpcProxyService.ProxyRequestAsync(
            did: "public.api.bsky.app",
            nsid: "app.bsky.feed.getListFeed",
            queryParams: queryParams,
            token: token,
            method: "GET"
        );

        if (!response.Success && token != null)
        {
            response = await _xrpcProxyService.ProxyRequestAsync(
                did: "public.api.bsky.app",
                nsid: "app.bsky.feed.getListFeed",
                queryParams: queryParams,
                token: null,
                method: "GET"
            );
        }

        if (!response.Success)
        {
            return StatusCode(response.StatusCode, response.Content);
        }

        return Content(response.Content, "application/json");
    }

    /// <summary>
    /// Gets suggested starter packs using ATProto app.bsky.unspecced.getSuggestedStarterPacks.
    /// This is the same data source used by real bsky.app Explore page.
    /// </summary>
    [AllowAnonymous]
    [HttpGet("suggested")]
    public async Task<IActionResult> GetSuggestedStarterPacks([FromQuery] int limit = 10)
    {
        var token = ExtractBearerToken();
        var queryParams = new List<KeyValuePair<string, string?>>
        {
            new KeyValuePair<string, string?>("limit", limit.ToString())
        };

        var response = await _xrpcProxyService.ProxyRequestAsync(
            did: "https://api.bsky.app",
            nsid: "app.bsky.unspecced.getSuggestedStarterPacks",
            queryParams: queryParams,
            token: token,
            method: "GET"
        );

        if (!response.Success && token != null)
        {
            response = await _xrpcProxyService.ProxyRequestAsync(
                did: "https://api.bsky.app",
                nsid: "app.bsky.unspecced.getSuggestedStarterPacks",
                queryParams: queryParams,
                token: null,
                method: "GET"
            );
        }

        if (!response.Success)
        {
            return StatusCode(response.StatusCode, response.Content);
        }

        return Content(response.Content, "application/json");
    }
}


