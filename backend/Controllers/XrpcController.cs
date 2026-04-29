using BSkyClone.Lexicons.App.Bsky.Graph;
using BSkyClone.Lexicons.App.Bsky.Notification;
using BSkyClone.Lexicons.App.Bsky.Actor.Defs;
using BSkyClone.Lexicons.App.Bsky.Feed;
using BSkyClone.Lexicons.Com.Atproto.Server;
using BSkyClone.Lexicons.Com.Atproto.Repo;
using BSkyClone.Models;
using BSkyClone.Services;
using BSkyClone.UnitOfWork;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Claims;
using BSkyClone.DTOs;

namespace BSkyClone.Controllers
{
    [ApiController]
    [Route("api/xrpc")]
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
        private readonly IUnitOfWork _unitOfWork;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<XrpcController> _logger;

        public XrpcController(
            IAuthService authService, 
            IPostService postService,
            INotificationService notificationService,
            IListService listService,
            IUserService userService,
            IRepoManager repoManager,
            ILabelingService labelingService,
            IUnitOfWork unitOfWork,
            IHttpClientFactory httpClientFactory,
            ILogger<XrpcController> logger)
        {
            _authService = authService;
            _postService = postService;
            _notificationService = notificationService;
            _listService = listService;
            _userService = userService;
            _repoManager = repoManager;
            _labelingService = labelingService;
            _unitOfWork = unitOfWork;
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        [Authorize]
        [HttpGet("com.atproto.server.getAccount")]
        public async Task<IActionResult> GetAccount()
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                var user = await _userService.GetUserByIdAsync(userId);
                if (user == null) return NotFound(new { error = "AccountNotFound" });

                return Ok(new GetAccountResponse
                {
                    Email = user.Email ?? "",
                    EmailConfirmed = true,
                    Handle = user.Handle,
                    Did = user.Did ?? ""
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in getAccount XRPC");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [Authorize]
        [HttpPost("com.atproto.server.requestEmailUpdate")]
        public IActionResult RequestEmailUpdate()
        {
            // In a real PDS, this would send an email with a token.
            // For BSkyClone, we'll return that a token is required (which the frontend can handle)
            // or just allow direct updates if we want to skip the "email verify" complexity for now.
            // The lexicon says it returns { tokenRequired: boolean }
            return Ok(new RequestEmailUpdateResponse { TokenRequired = false });
        }

        [Authorize]
        [HttpPost("com.atproto.server.updateEmail")]
        public async Task<IActionResult> UpdateEmail([FromBody] UpdateEmailRequest request)
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                // Map to internal UpdateAccountAsync
                await _userService.UpdateAccountAsync(userId, new DTOs.UpdateAccountRequest { Email = request.Email });
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "UpdateFailed", message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("com.atproto.server.updatePassword")]
        public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordRequest request)
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                // Note: ATProto updatePassword lexicon doesn't explicitly pass current password, 
                // but our UpdateAccountAsync requires it if we follow sensitive change rules.
                // However, for pure ATProto compatibility, if the user is authorized, we might allow it.
                // BUT, safety first.
                
                await _userService.UpdateAccountAsync(userId, new DTOs.UpdateAccountRequest { NewPassword = request.Password });
                return Ok();
            }
            catch (Exception ex)
            {
                return BadRequest(new { error = "UpdateFailed", message = ex.Message });
            }
        }

        [HttpPost("com.atproto.server.deleteSession")]
        public IActionResult DeleteSession()
        {
            return Ok();
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
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { error = "AuthFailed", message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating session for {Identifier}", request.Identifier);
                return StatusCode(500, new { error = "InternalError", message = ex.Message });
            }
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
                                    if (parentPost != null) internalRequest.ReplyToPostId = parentPost.Id.ToString();
                                }
                            }

                            var rootUri = postRecord.Reply.Root?.Uri;
                            if (!string.IsNullOrEmpty(rootUri))
                            {
                                var rootTid = rootUri.Split('/').LastOrDefault();
                                if (!string.IsNullOrEmpty(rootTid))
                                {
                                    var rootPost = await _postService.GetPostByTidAsync(rootTid);
                                    if (rootPost != null) internalRequest.RootPostId = rootPost.Id.ToString();
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
                    DidDoc = new { }
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

        [Authorize]
        [HttpGet("app.bsky.actor.getPreferences")]
        public async Task<IActionResult> GetPreferences()
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                var settings = await _userService.GetSettingsAsync(userId);
                
                var preferences = new List<object>();

                // Map bskyAppStatePref (logged-out visibility)
                preferences.Add(new Dictionary<string, object>
                {
                    ["$type"] = "app.bsky.actor.defs#bskyAppStatePref",
                    ["loggedOutVisibility"] = settings.RequireLogoutVisibility ?? false
                });

                // Map postInteractionSettingsPref
                if (!string.IsNullOrEmpty(settings.DefaultReplyRestriction))
                {
                    var rules = new List<object>();
                    if (settings.DefaultReplyRestriction == "followers")
                    {
                        rules.Add(new Dictionary<string, object> { ["$type"] = "app.bsky.feed.threadgate#followerRule" });
                    }

                    preferences.Add(new Dictionary<string, object>
                    {
                        ["$type"] = "app.bsky.actor.defs#postInteractionSettingsPref",
                        ["threadgateAllowRules"] = settings.DefaultReplyRestriction == "none" ? rules : (settings.DefaultReplyRestriction == "followers" ? rules : null)
                    });
                }

                return Ok(new { preferences });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in getPreferences XRPC");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [Authorize]
        [HttpPost("app.bsky.actor.putPreferences")]
        public async Task<IActionResult> PutPreferences([FromBody] JsonElement request)
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                if (!request.TryGetProperty("preferences", out var prefsProp) || prefsProp.ValueKind != JsonValueKind.Array)
                    return BadRequest(new { error = "InvalidRequest", message = "Preferences array required" });

                var settingsUpdate = new UserSettingDto(null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
                
                foreach (var pref in prefsProp.EnumerateArray())
                {
                    if (pref.TryGetProperty("$type", out var typeProp))
                    {
                        var type = typeProp.GetString();
                        if (type == "app.bsky.actor.defs#bskyAppStatePref" && pref.TryGetProperty("loggedOutVisibility", out var lovProp))
                        {
                            if (lovProp.ValueKind == JsonValueKind.True || lovProp.ValueKind == JsonValueKind.False)
                                settingsUpdate = settingsUpdate with { RequireLogoutVisibility = lovProp.GetBoolean() };
                            else
                                settingsUpdate = settingsUpdate with { RequireLogoutVisibility = lovProp.GetString() == "hide" };
                        }
                        else if (type == "app.bsky.actor.defs#postInteractionSettingsPref" && pref.TryGetProperty("threadgateAllowRules", out var rulesProp))
                        {
                            if (rulesProp.ValueKind == JsonValueKind.Array)
                            {
                                if (rulesProp.GetArrayLength() == 0)
                                    settingsUpdate = settingsUpdate with { DefaultReplyRestriction = "none" };
                                else
                                    settingsUpdate = settingsUpdate with { DefaultReplyRestriction = "followers" };
                            }
                            else
                            {
                                settingsUpdate = settingsUpdate with { DefaultReplyRestriction = "anyone" };
                            }
                        }
                    }
                }

                await _userService.UpdateSettingsAsync(userId, settingsUpdate);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in putPreferences XRPC");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.unspecced.getSuggestedAccounts")]
        public async Task<IActionResult> GetSuggestedAccounts()
        {
            try
            {
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(1.5);
                var queryString = Request.QueryString.Value;
                var url = $"https://api.bsky.app/xrpc/app.bsky.unspecced.getSuggestedAccounts{queryString}";

                var response = await client.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return Content(content, "application/json");
                }
                
                _logger.LogWarning("[GetSuggestedAccounts] Proxy failed with {Status}, falling back to getSuggestions", response.StatusCode);
                return await GetSuggestions(50, null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error proxying getSuggestedAccounts");
                return await GetSuggestions(50, null);
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.unspecced.getSuggestedUsersForExplore")]
        public async Task<IActionResult> GetSuggestedUsersForExplore([FromQuery] string? category = null, [FromQuery] int limit = 25, [FromQuery] string? cursor = null)
        {
            try
            {
                using var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(1.5);
                var queryString = Request.QueryString.Value;
                
                // Attempt 1: proxy to stropharia (best quality, but needs auth usually)
                var url = $"https://stropharia.us-west.host.bsky.network/xrpc/app.bsky.unspecced.getSuggestedUsersForExplore{queryString}";
                _logger.LogInformation("[GetSuggestedUsersForExplore] Attempt 1: {Url}", url);
                
                var response = await client.GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    return Content(content, "application/json");
                }

                // Attempt 2: If we have a category, use actor.searchActors as a high-quality fallback
                if (!string.IsNullOrEmpty(category) && category != "all")
                {
                    var searchUrl = $"https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q={Uri.EscapeDataString(category)}&limit={limit}";
                    if (!string.IsNullOrEmpty(cursor)) searchUrl += $"&cursor={Uri.EscapeDataString(cursor)}";
                    
                    _logger.LogInformation("[GetSuggestedUsersForExplore] Attempt 2 (Searching category): {Url}", searchUrl);
                    var searchResponse = await client.GetAsync(searchUrl);
                    if (searchResponse.IsSuccessStatusCode)
                    {
                        var content = await searchResponse.Content.ReadAsStringAsync();
                        return Content(content, "application/json");
                    }
                }
                
                _logger.LogWarning("[GetSuggestedUsersForExplore] All proxies failed, falling back to local suggestions with limit {Limit}", limit);
                return await GetSuggestions(limit, cursor);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSuggestedUsersForExplore");
                return await GetSuggestions(limit, cursor);
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.actor.getSuggestions")]
        public async Task<IActionResult> GetSuggestions([FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                Guid? viewerId = User?.Identity?.IsAuthenticated == true ? Guid.Parse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? Guid.Empty.ToString()) : (Guid?)null;
                if (viewerId == Guid.Empty) viewerId = null;
                
                var totalUsers = await _unitOfWork.Users.Query().CountAsync();
                var nonBanned = await _unitOfWork.Users.Query().CountAsync(u => u.IsBanned != true);
                var hasAvatar = await _unitOfWork.Users.Query().CountAsync(u => !string.IsNullOrEmpty(u.AvatarUrl));
                var hasDid = await _unitOfWork.Users.Query().CountAsync(u => u.Did != null);
                var viewerExists = viewerId.HasValue ? await _unitOfWork.Users.Query().AnyAsync(u => u.Id == viewerId.Value) : false;

                _logger.LogInformation("[GetSuggestions] DB Diagnostics - Total: {Total}, NonBanned: {NonBanned}, HasAvatar: {HasAvatar}, HasDid: {HasDid}, ViewerExists: {ViewerExists}", 
                    totalUsers, nonBanned, hasAvatar, hasDid, viewerExists);

                var suggestions = await _userService.GetSuggestedUsersAsync(limit, viewerId);
                var mappedActors = suggestions.Select(MapUserToProfileView).ToList();
                _logger.LogInformation("[GetSuggestions] Returning {Count} actors to frontend.", mappedActors.Count);

                return Ok(new
                {
                    actors = mappedActors,
                    cursor = (string?)null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in getSuggestions XRPC");
                return Ok(new { actors = new List<object>(), cursor = (string?)null });
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.feed.getPostThread")]
        public async Task<IActionResult> GetPostThread([FromQuery] string uri, [FromQuery] int depth = 6, [FromQuery] int parentHeight = 80, [FromQuery] int take = 20)
        {
            try
            {
                var userIdStr = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                Guid? viewerId = Guid.TryParse(userIdStr, out var vid) ? vid : null;

                _logger.LogInformation("XRPC GetPostThread for {Uri}, depth={Depth}, parentHeight={ParentHeight}, take={Take}", uri, depth, parentHeight, take);

                var thread = await _postService.GetPostThreadAsync(uri, depth, parentHeight, viewerId, take);
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

                var (relativePath, cid, _) = await _postService.SaveBlobAsync(stream, contentType, "blobs");
                
                var response = new UploadBlobResponse
                {
                    Blob = new BlobData
                    {
                        MimeType = contentType,
                        Size = Request.ContentLength ?? 0,
                        Ref = new BlobRef { Link = cid }
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
                        Uri = l.Uri ?? $"at://{actorUser.Did}/app.bsky.graph.list/{l.Id}",
                        Cid = l.Cid ?? l.Tid ?? l.Id.ToString(),
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

        [AllowAnonymous]
        [HttpGet("app.bsky.graph.getList")]
        public async Task<IActionResult> GetList([FromQuery] string list, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                var viewerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                Guid viewerId = Guid.Empty;
                if (!string.IsNullOrEmpty(viewerIdStr)) Guid.TryParse(viewerIdStr, out viewerId);

                // Find list by URI
                var dbList = await _unitOfWork.Lists.Query()
                    .Include(l => l.Owner)
                    .FirstOrDefaultAsync(l => l.Uri == list);

                // Fallback for local IDs
                if (dbList == null && Guid.TryParse(list, out var listId))
                {
                    dbList = await _unitOfWork.Lists.Query().Include(l => l.Owner).FirstOrDefaultAsync(l => l.Id == listId);
                }

                if (dbList == null) return NotFound(new { error = "ListNotFound" });

                var members = await _listService.GetListMembersAsync(dbList.Id);

                var response = new GetListResponse
                {
                    List = new ListView
                    {
                        Uri = dbList.Uri ?? $"at://{dbList.Owner?.Did}/app.bsky.graph.list/{dbList.Id}",
                        Cid = dbList.Cid ?? dbList.Id.ToString(),
                        Name = dbList.Name,
                        Purpose = dbList.Purpose ?? "app.bsky.graph.defs#curatelist",
                        Description = dbList.Description,
                        Avatar = dbList.AvatarUrl,
                        IndexedAt = dbList.CreatedAt?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") ?? DateTime.UtcNow.ToString("o"),
                        Creator = new ProfileViewBasic
                        {
                            Did = dbList.Owner?.Did ?? "",
                            Handle = dbList.Owner?.Handle ?? "unknown",
                            DisplayName = dbList.Owner?.DisplayName,
                            Avatar = dbList.Owner?.AvatarUrl
                        }
                    },
                    Items = members.Select(m => new ListItemView
                    {
                        Uri = m.Uri ?? $"at://{dbList.Owner?.Did}/app.bsky.graph.listitem/{m.UserId}", // Placeholder if no repo record
                        Subject = MapUserToProfileView(new User { 
                            Id = m.UserId, 
                            Username = m.User.Username, 
                            Handle = m.User.Handle, 
                            DisplayName = m.User.DisplayName, 
                            AvatarUrl = m.User.AvatarUrl,
                            Did = m.User.Did
                        })
                    }).ToList()
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC GetList error");
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

        [AllowAnonymous]
        [HttpGet("app.bsky.actor.getProfile")]
        public async Task<IActionResult> GetProfile([FromQuery] string actor)
        {
            try
            {
                var viewerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                Guid? viewerId = Guid.TryParse(viewerIdStr, out var vid) ? vid : null;

                User? user = null;
                if (Guid.TryParse(actor, out var id))
                    user = await _userService.GetUserByIdAsync(id);
                else if (actor.StartsWith("did:"))
                    user = await _userService.GetUserByDidAsync(actor);
                else
                    user = await _userService.GetUserByHandleAsync(actor);

                if (user == null && !string.IsNullOrEmpty(actor))
                {
                    // Try to resolve remote profile if not found locally
                    user = await _userService.ResolveRemoteProfileAsync(actor);
                }

                if (user == null) return NotFound(new { error = "AccountNotFound", message = "Account not found" });
                
                // Fetch the detailed profile
                var profile = await MapUserToProfileViewDetailed(user, viewerId);

                // Refresh remote profile stats if it's a non-local user
                if (!string.IsNullOrEmpty(user.Did) && !user.Did.EndsWith(":local"))
                {
                    try
                    {
                        var resolved = await _userService.ResolveRemoteProfileAsync(user.Did);
                        if (resolved != null) user = resolved;
                    }
                    catch { /* Best effort */ }
                }

                // Trust the incrementally maintained counters for both local and remote users.
                int followersCount = user.FollowersCount ?? 0;
                int followsCount = user.FollowingCount ?? 0;
                int postsCount = user.PostsCount ?? 0;

                // Populate the results into the profile object we created earlier
                profile.FollowersCount = followersCount;
                profile.FollowsCount = followsCount;
                profile.PostsCount = postsCount;
                profile.Viewer = new Lexicons.App.Bsky.Actor.Defs.ViewerState
                {
                    Muted = viewerId.HasValue && await _userService.IsMutedAsync(viewerId.Value, user.Id),
                    BlockedBy = viewerId.HasValue && await _userService.IsBlockedByAsync(viewerId.Value, user.Id),
                    Blocking = viewerId.HasValue ? (await _userService.IsBlockedAsync(viewerId.Value, user.Id) ? $"at://{user.Did}/app.bsky.graph.block/self" : null) : null,
                    Following = viewerId.HasValue ? (await _userService.IsFollowingAsync(viewerId.Value, user.Id) ? $"at://{user.Did}/app.bsky.graph.follow/self" : null) : null
                };

                return Ok(profile);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in getProfile XRPC");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.feed.getAuthorFeed")]
        public async Task<IActionResult> GetAuthorFeed(
            [FromQuery] string actor,
            [FromQuery] int limit = 50,
            [FromQuery] string? cursor = null,
            [FromQuery] string? filter = null)
        {
            try
            {
                var viewerIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                Guid? viewerId = Guid.TryParse(viewerIdStr, out var vid) ? vid : null;

                User? user = null;
                if (Guid.TryParse(actor, out var id))
                    user = await _userService.GetUserByIdAsync(id);
                else if (actor.StartsWith("did:"))
                    user = await _userService.GetUserByDidAsync(actor);
                else
                    user = await _userService.GetUserByHandleAsync(actor);

                if (user == null && !string.IsNullOrEmpty(actor))
                {
                    // Try to resolve remote profile if not found locally
                    user = await _userService.ResolveRemoteProfileAsync(actor);
                }

                if (user == null) return NotFound(new { error = "AccountNotFound", message = "Account not found" });

                int skip = 0;
                if (!string.IsNullOrEmpty(cursor) && int.TryParse(cursor, out var skipVal)) skip = skipVal;

                var posts = await _postService.GetUserPostsAsync(actor ?? user.Did ?? user.Handle, viewerId, skip, limit, filter);
                
                var feed = posts.Posts.Select(p => new Lexicons.App.Bsky.Feed.FeedViewPost
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
                        IndexedAt = p.CreatedAt?.ToString("o") ?? DateTime.UtcNow.ToString("o"),
                        Viewer = new Lexicons.App.Bsky.Feed.ViewerState
                        {
                            Like = p.Viewer?.Like,
                            Repost = p.Viewer?.Repost
                        }
                    }
                }).ToList();

                return Ok(new Lexicons.App.Bsky.Feed.GetAuthorFeedResponse
                {
                    Feed = feed,
                    Cursor = posts.Cursor ?? (skip + limit).ToString()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in getAuthorFeed XRPC");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [Authorize]
        [HttpPost("com.atproto.repo.deleteRecord")]
        public async Task<IActionResult> DeleteRecord([FromBody] DeleteRecordRequest request)
        {
            try
            {
                var userDid = User.FindFirst("did")?.Value;
                var userHandle = User.FindFirst("handle")?.Value;
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

                bool isAuthorizedRepo = (!string.IsNullOrEmpty(userDid) && request.Repo == userDid) || 
                                        (!string.IsNullOrEmpty(userHandle) && request.Repo == userHandle) || 
                                        (!string.IsNullOrEmpty(userIdStr) && request.Repo == userIdStr);

                if (string.IsNullOrEmpty(userIdStr) || !isAuthorizedRepo)
                {
                    return Unauthorized(new { error = "InvalidRepo", message = "You can only delete records in your own repo" });
                }

                if (!Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized(new { error = "AuthFailed" });

                // Synchronize with SQL Application Layer
                if (request.Collection == "app.bsky.feed.post")
                {
                    var post = await _postService.GetPostByTidAsync(request.Rkey);
                    if (post != null)
                    {
                        // DeletePostAsync handles both SQL and Repo deletion
                        await _postService.DeletePostAsync(userId, post.Id);
                    }
                    else
                    {
                        // If not in SQL, ensure it's removed from Repo at least
                        await _repoManager.DeleteRecordAsync(userDid ?? userHandle ?? userIdStr!, request.Collection, request.Rkey);
                    }
                }
                else if (request.Collection == "app.bsky.graph.list")
                {
                    var uri = $"at://{userDid ?? userIdStr!}/app.bsky.graph.list/{request.Rkey}";
                    var list = await _unitOfWork.Lists.Query().FirstOrDefaultAsync(l => l.Uri == uri);
                    if (list != null)
                    {
                        list.IsDeleted = true;
                        _unitOfWork.Lists.Update(list);
                        await _unitOfWork.CompleteAsync();
                    }
                    await _repoManager.DeleteRecordAsync(userDid ?? userHandle ?? userIdStr!, request.Collection, request.Rkey);
                }
                else if (request.Collection == "app.bsky.graph.listitem")
                {
                    var uri = $"at://{userDid ?? userIdStr!}/app.bsky.graph.listitem/{request.Rkey}";
                    var member = await _unitOfWork.ListMembers.Query().FirstOrDefaultAsync(lm => lm.Uri == uri);
                    if (member != null)
                    {
                        _unitOfWork.ListMembers.Remove(member);
                        await _unitOfWork.CompleteAsync();
                    }
                    await _repoManager.DeleteRecordAsync(userDid ?? userHandle ?? userIdStr!, request.Collection, request.Rkey);
                }
                else
                {
                    // Generic repo deletion
                    await _repoManager.DeleteRecordAsync(userDid ?? userHandle ?? userIdStr!, request.Collection, request.Rkey);
                    
                    // TODO: Handle specialized SQL deletion for Likes, Follows if needed
                }

                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in deleteRecord XRPC");
                return StatusCode(500, new { error = "InternalError", message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("com.atproto.repo.putRecord")]
        public async Task<IActionResult> PutRecord([FromBody] PutRecordRequest request)
        {
            try
            {
                var userDid = User.FindFirst("did")?.Value;
                var userHandle = User.FindFirst("handle")?.Value;
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;

                bool isAuthorizedRepo = (!string.IsNullOrEmpty(userDid) && request.Repo == userDid) || 
                                        (!string.IsNullOrEmpty(userHandle) && request.Repo == userHandle) || 
                                        (!string.IsNullOrEmpty(userIdStr) && request.Repo == userIdStr);

                if (string.IsNullOrEmpty(userIdStr) || !isAuthorizedRepo)
                {
                    return Unauthorized(new { error = "InvalidRepo", message = "You can only put records in your own repo" });
                }

                // putRecord is "Update or Create". RepoManager.CreateRecordAsync with rkey handles this in the MST.
                var cid = await _repoManager.CreateRecordAsync(userDid ?? userHandle ?? userIdStr!, request.Collection, request.Record, request.Rkey);

                // TODO: For app.bsky.feed.post, synchronize with SQL (Update existing or Create new)
                // For now, we support CreateRecord as the primary way of posting.

                return Ok(new PutRecordResponse
                {
                    Uri = $"at://{userDid ?? userIdStr!}/{request.Collection}/{request.Rkey}",
                    Cid = cid
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in putRecord XRPC");
                return StatusCode(500, new { error = "InternalError", message = ex.Message });
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.graph.getFollowers")]
        public async Task<IActionResult> GetFollowersXRPC([FromQuery] string actor, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                var (users, nextCursor) = await _userService.GetFollowersAsync(actor, limit, cursor);
                
                // Fetch the subject profile
                User? subjectUser = null;
                if (Guid.TryParse(actor, out var id)) subjectUser = await _userService.GetUserByIdAsync(id);
                else if (actor.StartsWith("did:")) subjectUser = await _userService.GetUserByDidAsync(actor);
                else subjectUser = await _userService.GetUserByHandleAsync(actor);

                if (subjectUser == null) subjectUser = await _userService.ResolveRemoteProfileAsync(actor);
                if (subjectUser == null) return NotFound(new { error = "AccountNotFound" });
                
                var response = new GetFollowersResponse
                {
                    Subject = await MapUserToProfileViewDetailed(subjectUser),
                    Followers = users.Select(u => MapUserToProfileView(u)).ToList(),
                    Cursor = nextCursor
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC GetFollowers error");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [AllowAnonymous]
        [HttpGet("app.bsky.graph.getFollows")]
        public async Task<IActionResult> GetFollowsXRPC([FromQuery] string actor, [FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                var (users, nextCursor) = await _userService.GetFollowingAsync(actor, limit, cursor);
                
                // Fetch the subject profile
                User? subjectUser = null;
                if (Guid.TryParse(actor, out var id)) subjectUser = await _userService.GetUserByIdAsync(id);
                else if (actor.StartsWith("did:")) subjectUser = await _userService.GetUserByDidAsync(actor);
                else subjectUser = await _userService.GetUserByHandleAsync(actor);

                if (subjectUser == null) subjectUser = await _userService.ResolveRemoteProfileAsync(actor);
                if (subjectUser == null) return NotFound(new { error = "AccountNotFound" });

                var response = new GetFollowsResponse
                {
                    Subject = await MapUserToProfileViewDetailed(subjectUser),
                    Follows = users.Select(u => MapUserToProfileView(u)).ToList(),
                    Cursor = nextCursor
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC GetFollows error");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [Authorize]
        [HttpGet("app.bsky.graph.getMutes")]
        public async Task<IActionResult> GetMutesXRPC([FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                var (users, nextCursor) = await _userService.GetMutedUsersAsync(userId, limit, cursor);
                
                var response = new GetMutesResponse
                {
                    Mutes = users.Select(u => MapUserToProfileView(u)).ToList(),
                    Cursor = nextCursor
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC GetMutes error");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        [Authorize]
        [HttpGet("app.bsky.graph.getBlocks")]
        public async Task<IActionResult> GetBlocksXRPC([FromQuery] int limit = 50, [FromQuery] string? cursor = null)
        {
            try
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
                    return Unauthorized();

                var (users, nextCursor) = await _userService.GetBlockedUsersAsync(userId, limit, cursor);
                
                var response = new GetBlocksResponse
                {
                    Blocks = users.Select(u => MapUserToProfileView(u)).ToList(),
                    Cursor = nextCursor
                };

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "XRPC GetBlocks error");
                return StatusCode(500, new { error = "InternalError" });
            }
        }

        private async Task<ProfileViewDetailed> MapUserToProfileViewDetailed(User user, Guid? viewerId = null)
        {
            var profile = new ProfileViewDetailed
            {
                Did = user.Did ?? "",
                Handle = user.Handle ?? user.Did ?? "unknown",
                DisplayName = user.DisplayName,
                Description = user.Bio,
                Avatar = user.AvatarUrl,
                Banner = user.CoverImageUrl,
                FollowersCount = user.FollowersCount ?? 0,
                FollowsCount = user.FollowingCount ?? 0,
                PostsCount = user.PostsCount ?? 0,
                IndexedAt = user.CreatedAt?.ToString("o") ?? DateTime.UtcNow.ToString("o"),
                Viewer = new Lexicons.App.Bsky.Actor.Defs.ViewerState { Muted = false, BlockedBy = false }
            };

            if (!string.IsNullOrEmpty(user.PinnedPostUri))
            {
                try
                {
                    var post = await _postService.GetPostByUriAsync(user.PinnedPostUri);
                    if (post != null)
                    {
                        var enrichedPosts = await _postService.EnrichAndFilterPostsAsync(new List<BSkyClone.DTOs.PostDto> { post }, viewerId ?? Guid.Empty);
                        if (enrichedPosts.Any())
                        {
                            profile.PinnedPost = enrichedPosts.First();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to resolve pinned post {Uri} for user {Did}", user.PinnedPostUri, user.Did);
                }
            }

            return profile;
        }

        private ProfileView MapUserToProfileView(User user)
        {
            var avatar = user.AvatarUrl;
            if (!string.IsNullOrEmpty(avatar) && avatar.StartsWith("uploads/") && !avatar.StartsWith("/"))
            {
                avatar = "/" + avatar;
            }

            return new ProfileView
            {
                Did = user.Did ?? "",
                Handle = user.Handle ?? user.Did ?? "unknown",
                DisplayName = user.DisplayName,
                Description = user.Bio,
                Avatar = avatar,
                IndexedAt = user.CreatedAt?.ToString("o") ?? DateTime.UtcNow.ToString("o"),
                Viewer = new Lexicons.App.Bsky.Actor.Defs.ViewerState { Muted = false, BlockedBy = false }
            };
        }

        [HttpGet("{*lexicon}")]
        public IActionResult HandleLexiconGet(string lexicon)
        {
            _logger.LogWarning("Unhandled XRPC GET: {Lexicon}", lexicon);
            return BadRequest(new { error = "MethodNotImplemented", message = $"Lexicon {lexicon} is not yet implemented" });
        }
    }

    public class GetMutesResponse
    {
        public List<ProfileView> Mutes { get; set; } = new();
        public string? Cursor { get; set; }
    }

    public class GetBlocksResponse
    {
        public List<ProfileView> Blocks { get; set; } = new();
        public string? Cursor { get; set; }
    }
}
