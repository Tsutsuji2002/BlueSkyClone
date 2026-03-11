using BSkyClone.Lexicons.Com.Atproto.Server;
using BSkyClone.Lexicons.Com.Atproto.Repo;
using BSkyClone.Models;
using BSkyClone.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json;
using System.Security.Claims;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("xrpc")]
    public class XrpcController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IPostService _postService;
        private readonly IRepoManager _repoManager;
        private readonly ILogger<XrpcController> _logger;

        public XrpcController(
            IAuthService authService, 
            IPostService postService,
            IRepoManager repoManager,
            ILogger<XrpcController> logger)
        {
            _authService = authService;
            _postService = postService;
            _repoManager = repoManager;
            _logger = logger;
        }

        [HttpPost("com.atproto.server.createSession")]
        public async Task<IActionResult> CreateSession([FromBody] CreateSessionRequest request)
        {
            // ... existing login logic ...
            var loginRequest = new DTOs.LoginRequest(request.Identifier, request.Password);
            try
            {
                var authResponse = await _authService.LoginAsync(loginRequest);
                if (authResponse == null) return Unauthorized(new { error = "AuthFailed", message = "Invalid identifier or password" });
                var response = new CreateSessionResponse
                {
                    AccessJwt = authResponse.Token,
                    RefreshJwt = authResponse.RefreshToken,
                    Handle = authResponse.User.Handle,
                    Did = authResponse.User.Did ?? "",
                    Email = authResponse.User.Email,
                    User = authResponse.User,
                    Settings = authResponse.Settings
                };

                return Ok(response);
            }
            catch (Exception ex) { _logger.LogError(ex, "Error creating session"); return StatusCode(500, new { error = "InternalError" }); }
        }

        [Authorize]
        [HttpPost("com.atproto.repo.createRecord")]
        public async Task<IActionResult> CreateRecord([FromBody] CreateRecordRequest request)
        {
            var userDid = User.FindFirst("did")?.Value;
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userDid) || string.IsNullOrEmpty(userIdStr) || request.Repo != userDid)
            {
                return Unauthorized(new { error = "InvalidRepo", message = "You can only create records in your own repo" });
            }

            var userId = Guid.Parse(userIdStr);
            var rkey = request.Rkey ?? _postService.GenerateTid();
            
            _logger.LogInformation("Creating record {Collection}/{Rkey} for {Did}", request.Collection, rkey, userDid);

            // 1. Store in Repo Storage (Source of Truth)
            var cid = await _repoManager.CreateRecordAsync(userDid, request.Collection, request.Record);

            // 2. Indexing Layer (SQL)
            if (request.Collection == "app.bsky.feed.post")
            {
                var postRecordRaw = request.Record.ToString()!;
                var postRecord = JsonSerializer.Deserialize<Lexicons.App.Bsky.Feed.Post>(postRecordRaw);
                
                if (postRecord != null)
                {
                    // Map Lexicon Post to internal CreatePostRequest
                    var internalRequest = new DTOs.CreatePostRequest
                    {
                        Content = postRecord.Text,
                        // Simplistic reply handling
                        ReplyToPostId = postRecord.Reply?.Parent?.Uri?.Split('/').LastOrDefault() != null ? Guid.Parse(postRecord.Reply.Parent.Uri.Split('/').Last()) : null,
                    };

                    // Handle Embeds (Images)
                    using var doc = JsonDocument.Parse(postRecordRaw);
                    if (doc.RootElement.TryGetProperty("embed", out var embed))
                    {
                        if (embed.TryGetProperty("$type", out var type) && type.GetString() == "app.bsky.embed.images")
                        {
                            // In a real PDS, we would link the CID to the actual file
                            // For now, we'll keep the existing media logic simple
                        }
                    }
                    
                    await _postService.CreatePostAsync(userId, internalRequest);
                }
            }

            return Ok(new CreateRecordResponse
            {
                Uri = $"at://{userDid}/{request.Collection}/{rkey}",
                Cid = cid
            });
        }

        [Authorize]
        [HttpGet("app.bsky.feed.getTimeline")]
        public async Task<IActionResult> GetTimeline(
            [FromQuery] string? algorithm = null, 
            [FromQuery] int limit = 20, 
            [FromQuery] string? cursor = null)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr)) return Unauthorized();

            var userId = Guid.Parse(userIdStr);
            var skip = 0;
            if (!string.IsNullOrEmpty(cursor) && int.TryParse(cursor, out var skipVal))
            {
                skip = skipVal;
            }

            _logger.LogInformation("XRPC GetTimeline for {UserId}, skip={Skip}, limit={Limit}", userId, skip, limit);

            var posts = await _postService.GetTimelineAsync(userId, skip, limit);
            
            var feed = posts.Select(p => new Lexicons.App.Bsky.Feed.FeedViewPost
            {
                Post = new Lexicons.App.Bsky.Feed.PostView
                {
                    Uri = $"at://{p.Author.Did}/app.bsky.feed.post/{p.Tid}",
                    Cid = "pseudo-cid-" + p.Id, // In full PDS, CID would be stored/indexed
                    Author = new Lexicons.App.Bsky.Actor.Defs.ProfileViewBasic
                    {
                        Did = p.Author.Did ?? $"did:plc:{p.Author.Id:n}",
                        Handle = p.Author.Handle,
                        DisplayName = p.Author.DisplayName,
                        Avatar = p.Author.AvatarUrl
                    },
                    Record = new 
                    {
                        text = p.Content,
                        createdAt = p.CreatedAt?.ToString("o"),
                        @type = "app.bsky.feed.post"
                    },
                    ReplyCount = p.RepliesCount,
                    RepostCount = p.RepostsCount,
                    LikeCount = p.LikesCount,
                    IndexedAt = p.CreatedAt?.ToString("o") ?? DateTime.UtcNow.ToString("o")
                }
            }).ToList();

            return Ok(new Lexicons.App.Bsky.Feed.GetTimelineResponse
            {
                Feed = feed,
                Cursor = (skip + limit).ToString()
            });
        }

        [Authorize]
        [HttpPost("com.atproto.repo.uploadBlob")]
        [DisableRequestSizeLimit]
        public async Task<IActionResult> UploadBlob()
        {
            try
            {
                var contentType = Request.ContentType ?? "application/octet-stream";
                var stream = Request.Body;

                var relativePath = await _postService.SaveBlobAsync(stream, contentType, "blobs");
                
                // Calculate pseudo-CID (Real PDS would hash the content)
                var pseudoCid = "bafkrei" + Guid.NewGuid().ToString("n"); 

                var response = new UploadBlobResponse
                {
                    Blob = new BlobData
                    {
                        MimeType = contentType,
                        Size = Request.ContentLength ?? 0,
                        Ref = new BlobRef { Link = pseudoCid }
                    }
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading blob");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [HttpGet("{*lexicon}")]
        public IActionResult HandleLexiconGet(string lexicon)
        {
            _logger.LogWarning("Unhandled XRPC GET: {Lexicon}", lexicon);
            return BadRequest(new { error = "MethodNotImplemented", message = $"Lexicon {lexicon} is not yet implemented" });
        }
    }
}
