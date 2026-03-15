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
        private readonly ILabelingService _labelingService;
        private readonly ILogger<XrpcController> _logger;

        public XrpcController(
            IAuthService authService, 
            IPostService postService,
            INotificationService notificationService,
            IListService listService,
            IUserService userService,
            IRepoManager repoManager,
            ILabelingService labelingService,
            ILogger<XrpcController> logger)
        {
            _authService = authService;
            _postService = postService;
            _notificationService = notificationService;
            _listService = listService;
            _userService = userService;
            _repoManager = repoManager;
            _labelingService = labelingService;
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
            try
            {
                _logger.LogInformation("XRPC CreateRecord request received: {Repo}, {Collection}", request.Repo, request.Collection);
                var userDid = User.FindFirst("did")?.Value;
                var userHandle = User.FindFirst("handle")?.Value;
                var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                
                bool isAuthorizedRepo = (!string.IsNullOrEmpty(userDid) && request.Repo == userDid) || 
                                        (!string.IsNullOrEmpty(userHandle) && request.Repo == userHandle) || 
                                        (!string.IsNullOrEmpty(userIdStr) && request.Repo == userIdStr);

                if (string.IsNullOrEmpty(userIdStr) || !isAuthorizedRepo)
                {
                    return Unauthorized(new { error = "InvalidRepo", message = "You can only create records in your own repo" });
                }

                var rkey = request.Rkey ?? _postService.GenerateTid();
                
                if (!Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized(new { error = "AuthFailed", message = "Invalid user ID" });
                
                _logger.LogInformation("Creating record {Collection}/{Rkey} for {Did}", request.Collection, rkey, userDid);

                // 1. Store in Repo Storage (Source of Truth)
                var cid = await _repoManager.CreateRecordAsync(userDid ?? userHandle ?? userIdStr!, request.Collection, request.Record);

                // 2. Sign the repository commitment (Phase 3)
                try
                {
                    await _repoManager.SignRepoAsync(userDid ?? userHandle ?? userIdStr!, cid);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to sign repo commitment for {Repo}", request.Repo);
                }

                // 3. Indexing Layer (SQL)
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
                        };

                        // Robust Reply Handling
                        if (postRecord.Reply != null)
                        {
                            var parentUri = postRecord.Reply.Parent?.Uri;
                            if (!string.IsNullOrEmpty(parentUri))
                            {
                                var parentTid = parentUri.Split('/').LastOrDefault();
                                if (!string.IsNullOrEmpty(parentTid))
                                {
                                    var parentPost = await _postService.GetPostByTidAsync(parentTid);
                                    if (parentPost != null) internalRequest.ReplyToPostId = parentPost.Id;
                                }
                            }

                            var rootUri = postRecord.Reply.Root?.Uri;
                            if (!string.IsNullOrEmpty(rootUri))
                            {
                                var rootTid = rootUri.Split('/').LastOrDefault();
                                if (!string.IsNullOrEmpty(rootTid))
                                {
                                    var rootPost = await _postService.GetPostByTidAsync(rootTid);
                                    if (rootPost != null) internalRequest.RootPostId = rootPost.Id;
                                }
                            }
                        }

                        // Handle Embeds
                        using var doc = JsonDocument.Parse(postRecordRaw);
                        if (doc.RootElement.TryGetProperty("embed", out var embed) && embed.TryGetProperty("$type", out var typeProp))
                        {
                            var type = typeProp.GetString();

                            if (type == "app.bsky.embed.images" && embed.TryGetProperty("images", out var imagesProp))
                            {
                                internalRequest.PreUploadedImageUrls = new List<string>();
                                internalRequest.PreUploadedAltTexts = new List<string>();
                                
                                foreach (var img in imagesProp.EnumerateArray())
                                {
                                    if (img.TryGetProperty("image", out var imageBlob) && imageBlob.TryGetProperty("ref", out var imageRef) && imageRef.TryGetProperty("$link", out var linkProp))
                                    {
                                        internalRequest.PreUploadedImageUrls.Add(linkProp.GetString() ?? "");
                                    }
                                    
                                    if (img.TryGetProperty("alt", out var altProp))
                                    {
                                        internalRequest.PreUploadedAltTexts.Add(altProp.GetString() ?? "");
                                    }
                                    else 
                                    {
                                        internalRequest.PreUploadedAltTexts.Add("");
                                    }
                                }
                            }
                            else if (type == "app.bsky.embed.video" && embed.TryGetProperty("video", out var videoBlob) && videoBlob.TryGetProperty("ref", out var videoRef) && videoRef.TryGetProperty("$link", out var linkProp))
                            {
                                internalRequest.PreUploadedVideoUrl = linkProp.GetString();
                            }
                            else if (type == "app.bsky.embed.external" && embed.TryGetProperty("external", out var externalProp))
                            {
                                if (externalProp.TryGetProperty("uri", out var uriProp)) internalRequest.LinkPreviewUrl = uriProp.GetString();
                                if (externalProp.TryGetProperty("title", out var titleProp)) internalRequest.LinkPreviewTitle = titleProp.GetString();
                                if (externalProp.TryGetProperty("description", out var descProp)) internalRequest.LinkPreviewDescription = descProp.GetString();
                                
                                try 
                                { 
                                    if (!string.IsNullOrEmpty(internalRequest.LinkPreviewUrl))
                                    {
                                        var uri = new Uri(internalRequest.LinkPreviewUrl);
                                        internalRequest.LinkPreviewDomain = uri.Host.Replace("www.", "");
                                    }
                                } catch { }

                                if (externalProp.TryGetProperty("thumb", out var thumbBlob) && thumbBlob.TryGetProperty("ref", out var thumbRef) && thumbRef.TryGetProperty("$link", out var thumbLinkProp))
                                {
                                    internalRequest.LinkPreviewImage = thumbLinkProp.GetString();
                                }
                            }
                        }
                        
                        await _postService.CreatePostAsync(userId, internalRequest);
                    }
                }

                _logger.LogInformation("Successfully created record for {Did}", userDid ?? userIdStr);
                return Ok(new CreateRecordResponse
                {
                    Uri = $"at://{userDid ?? userIdStr}/{request.Collection}/{rkey}",
                    Cid = cid
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateRecord XRPC. Request Repo: {Repo}, Collection: {Collection}", request.Repo, request.Collection);
                return StatusCode(500, new { error = "InternalError", message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpPost("com.atproto.server.refreshSession")]
        public async Task<IActionResult> RefreshSession()
        {
            try
            {
                var authHeader = Request.Headers["Authorization"].ToString();
                if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
                    return Unauthorized(new { error = "AuthenticationRequired" });

                var refreshToken = authHeader.Replace("Bearer ", "");
                var authResponse = await _authService.RefreshTokenAsync(refreshToken);

                if (authResponse == null)
                    return Unauthorized(new { error = "ExpiredToken", message = "Token is invalid or expired" });

                return Ok(new RefreshSessionResponse
                {
                    AccessJwt = authResponse.Token,
                    RefreshJwt = authResponse.RefreshToken,
                    Handle = authResponse.User.Handle,
                    Did = authResponse.User.Did ?? "",
                    DidDoc = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error refreshing session");
                return StatusCode(500, new { error = "InternalError" });
            }
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
                        Cid = p.Cid ?? p.Id.ToString(), 
                        Author = new Lexicons.App.Bsky.Actor.Defs.ProfileViewBasic
                        {
                            Did = p.Author?.Did ?? "",
                            Handle = p.Author?.Handle ?? "unknown",
                            DisplayName = p.Author?.DisplayName,
                            Avatar = p.Author?.AvatarUrl,
                        },
                        Record = new Dictionary<string, object>
                        {
                            { "text", p.Content ?? "" },
                            { "createdAt", p.CreatedAt?.ToString("o") ?? "" },
                            { "$type", "app.bsky.feed.post" }
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

        [AllowAnonymous]
        [HttpGet("app.bsky.feed.getPostThread")]
        public async Task<IActionResult> GetPostThread([FromQuery] string uri, [FromQuery] int depth = 6, [FromQuery] int parentHeight = 80)
        {
            try
            {
                var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                Guid? viewerId = Guid.TryParse(userIdStr, out var vid) ? vid : null;

                _logger.LogInformation("XRPC GetPostThread for {Uri}, depth={Depth}, parentHeight={ParentHeight}", uri, depth, parentHeight);

                var thread = await _postService.GetPostThreadAsync(uri, depth, parentHeight, viewerId);
                if (thread == null) return NotFound(new { error = "NotFound", message = "Thread not found" });

                return Ok(thread);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in getPostThread XRPC");
                return StatusCode(500, new { error = "InternalError", message = ex.Message });
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
                        // Custom fields for list invitations
                        ListId = n.ListId,
                        InvitationStatus = n.InvitationStatus,
                        Title = n.Title,
                        Content = n.Content,
                        Record = new Dictionary<string, object>
                        {
                            { "$type", n.Reason?.ToLowerInvariant() == "follow" ? "app.bsky.graph.follow" : "app.bsky.notification.event" },
                            { "text", n.Content ?? "" },
                            { "createdAt", n.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") }
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
                        Cid = l.Tid ?? l.Id.ToString(),
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
        [HttpPost("com.atproto.moderation.createReport")]
        public async Task<IActionResult> CreateReport([FromBody] Lexicons.Com.Atproto.Moderation.CreateReportRequest request)
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                var user = await _userService.GetUserByIdAsync(userId);
                if (user == null) return Unauthorized();

                var subjectUri = request.Subject.Uri ?? request.Subject.Did ?? "";
                var subjectType = request.Subject.Type;

                var report = await _labelingService.CreateReportAsync(
                    userId,
                    subjectType,
                    subjectUri,
                    request.ReasonType,
                    request.Reason,
                    request.Subject.Cid
                );

                return Ok(new Lexicons.Com.Atproto.Moderation.CreateReportResponse
                {
                    Id = report.Id.GetHashCode(), // Mocking a long ID for lexicon compliance
                    ReasonType = report.ReasonType,
                    Subject = request.Subject,
                    Reporter = user.Did ?? user.Handle,
                    CreatedAt = report.CreatedAt.ToString("o")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in createReport XRPC");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [AllowAnonymous]
        [HttpGet("com.atproto.label.queryLabels")]
        public async Task<IActionResult> QueryLabels([FromQuery] string[] uriPatterns, [FromQuery] string[]? sources = null, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                // AT Protocol queryLabels usually searches by URI patterns
                // For simplicity, we'll support exact URI matches from uriPatterns
                var labels = await _labelingService.GetLabelsForSubjectsAsync(uriPatterns);
                
                var response = new Lexicons.Com.Atproto.Label.QueryLabelsResponse
                {
                    Labels = labels.Select(l => new Lexicons.Com.Atproto.Label.LabelView
                    {
                        Src = l.Src,
                        Uri = l.Uri,
                        Cid = l.Cid,
                        Val = l.Val,
                        Neg = l.Neg,
                        Cts = l.CreatedAt.ToString("o")
                    }).ToList(),
                    Cursor = null
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in queryLabels XRPC");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [AllowAnonymous]
        [HttpGet("com.atproto.label.getLabelDefinitions")]
        public IActionResult GetLabelDefinitions()
        {
            var response = new Lexicons.Com.Atproto.Label.GetLabelDefinitionsResponse
            {
                Definitions = new List<Lexicons.Com.Atproto.Label.LabelDefinition>
                {
                    new() { 
                        Identifier = "spam", 
                        Severity = "inform", 
                        Blurs = "none", 
                        DefaultSetting = "warn",
                        Locales = new List<Lexicons.Com.Atproto.Label.LabelLocale> { new() { Name = "Spam", Description = "Unwanted commercial content" } }
                    },
                    new() { 
                        Identifier = "harassment", 
                        Severity = "alert", 
                        Blurs = "content", 
                        DefaultSetting = "hide",
                        Locales = new List<Lexicons.Com.Atproto.Label.LabelLocale> { new() { Name = "Harassment", Description = "Offensive or insulting behavior" } }
                    }
                }
            };
            return Ok(response);
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
