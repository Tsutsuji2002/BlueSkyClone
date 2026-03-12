using BSkyClone.Lexicons.App.Bsky.Graph;
using BSkyClone.Lexicons.App.Bsky.Notification;
using BSkyClone.Lexicons.App.Bsky.Actor.Defs;
using BSkyClone.Lexicons.App.Bsky.Feed;
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
        private readonly INotificationService _notificationService;
        private readonly IListService _listService;
        private readonly IUserService _userService;
        private readonly IRepoManager _repoManager;
        private readonly ILogger<XrpcController> _logger;

        public XrpcController(
            IAuthService authService, 
            IPostService postService,
            INotificationService notificationService,
            IListService listService,
            IUserService userService,
            IRepoManager repoManager,
            ILogger<XrpcController> logger)
        {
            _authService = authService;
            _postService = postService;
            _notificationService = notificationService;
            _listService = listService;
            _userService = userService;
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
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            
            if (string.IsNullOrEmpty(userDid) || string.IsNullOrEmpty(userIdStr) || request.Repo != userDid)
            {
                return Unauthorized(new { error = "InvalidRepo", message = "You can only create records in your own repo" });
            }

            var rkey = request.Rkey ?? _postService.GenerateTid();
            
            if (!Guid.TryParse(userIdStr, out var userId))
                return Unauthorized(new { error = "AuthFailed", message = "Invalid user ID" });
            
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
            try
            {
                var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) 
                    return Unauthorized();

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
                        Uri = $"at://{p.Author?.Did ?? "unknown"}/app.bsky.feed.post/{p.Tid}",
                        Cid = "pseudo-cid-" + p.Id, 
                        Author = new Lexicons.App.Bsky.Actor.Defs.ProfileViewBasic
                        {
                            Did = p.Author?.Did ?? "",
                            Handle = p.Author?.Handle ?? "unknown",
                            DisplayName = p.Author?.DisplayName,
                            Avatar = p.Author?.AvatarUrl,
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
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC GetTimeline error");
                return Ok(new Lexicons.App.Bsky.Feed.GetTimelineResponse { Feed = new List<Lexicons.App.Bsky.Feed.FeedViewPost>() });
            }
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

        [Authorize]
        [HttpGet("app.bsky.notification.listNotifications")]
        public async Task<IActionResult> ListNotifications([FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId)) return Unauthorized();

                var notifications = await _notificationService.GetNotificationsAsync(userId, limit);

                var response = new ListNotificationsResponse
                {
                    Notifications = notifications.Select(n => new NotificationView
                    {
                        Uri = n.Uri,
                        Cid = n.Cid,
                        Author = new ProfileViewBasic
                        {
                            Did = n.Sender?.Did ?? "",
                            Handle = n.Sender?.Handle ?? "unknown",
                            DisplayName = n.Sender?.DisplayName,
                            Avatar = n.Sender?.AvatarUrl
                        },
                        Reason = n.Reason?.ToLowerInvariant() ?? "unknown",
                        ReasonSubject = n.ReasonSubject,
                        PostAuthorHandle = n.PostAuthorHandle,
                        PostId = n.PostId,
                        IsRead = n.IsRead,
                        IndexedAt = n.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        Record = new
                        {
                            @type = n.Reason?.ToLowerInvariant() == "follow" ? "app.bsky.graph.follow" : "app.bsky.notification.event",
                            text = n.Content,
                            createdAt = n.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        }
                    }).ToList(),
                    Cursor = null
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC ListNotifications error");
                return Ok(new ListNotificationsResponse { Notifications = new List<NotificationView>() });
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.graph.getLists")]
        public async Task<IActionResult> GetLists([FromQuery] string? actor, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                if (string.IsNullOrEmpty(actor))
                {
                    return Ok(new GetListsResponse { Lists = new List<ListView>() });
                }

                var viewerIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                Guid viewerId = Guid.Empty;
                if (!string.IsNullOrEmpty(viewerIdStr))
                {
                    Guid.TryParse(viewerIdStr, out viewerId);
                }

                Guid actorId;
                User? actorUser = null;

                if (Guid.TryParse(actor, out actorId))
                {
                    actorUser = await _userService.GetUserByIdAsync(actorId);
                }
                else if (actor.StartsWith("did:"))
                {
                    actorUser = await _userService.GetUserByDidAsync(actor);
                }
                else
                {
                    actorUser = await _userService.GetUserByHandleAsync(actor);
                }

                if (actorUser == null) return NotFound(new { error = "AccountNotFound", message = "Account not found" });
                actorId = actorUser.Id;

                var lists = await _listService.GetUserListsAsync(actorId, viewerId);

                var response = new GetListsResponse
                {
                    Lists = lists.Select(l => new ListView
                    {
                        Uri = $"at://{actorUser.Did}/app.bsky.graph.list/{l.Id}",
                        Cid = "pseudo-cid-" + l.Id,
                        Name = l.Name,
                        Purpose = l.Purpose ?? "app.bsky.graph.defs#curatelist",
                        Description = l.Description,
                        Avatar = l.AvatarUrl,
                        IndexedAt = l.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                        Creator = new ProfileViewBasic
                        {
                            Did = actorUser.Did ?? "",
                            Handle = actorUser.Handle,
                            DisplayName = actorUser.DisplayName,
                            Avatar = actorUser.AvatarUrl
                        },
                        Viewer = new ListViewerState
                        {
                            Muted = false,
                            Blocked = null
                        }
                    }).ToList(),
                    Cursor = null
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC GetLists error");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [Authorize]
        [HttpGet("app.bsky.notification.getUnreadCount")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            var count = await _notificationService.GetUnreadCountAsync(userId);

            return Ok(new Lexicons.App.Bsky.Notification.GetUnreadCountResponse
            {
                Count = count
            });
        }

        [Authorize]
        [HttpPost("app.bsky.notification.updateSeen")]
        public async Task<IActionResult> UpdateSeen([FromBody] Lexicons.App.Bsky.Notification.UpdateSeenRequest request)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                return Unauthorized();

            await _notificationService.MarkAllAsReadAsync(userId);
            return Ok();
        }

        [HttpGet("{*lexicon}")]
        public IActionResult HandleLexiconGet(string lexicon)
        {
            _logger.LogWarning("Unhandled XRPC GET: {Lexicon}", lexicon);
            return BadRequest(new { error = "MethodNotImplemented", message = $"Lexicon {lexicon} is not yet implemented" });
        }
    }
}
