using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using BSkyClone.Utilities;
using System.Text.Json;
using System.Net.Http;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services;

public class ListService : IListService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly Microsoft.AspNetCore.SignalR.IHubContext<BSkyClone.Hubs.ChatHub> _hubContext;
    private readonly IPostService _postService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IRepoManager _repoManager;
    private readonly IUserService _userService;
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ListService> _logger;

    public ListService(
        IUnitOfWork unitOfWork, 
        Microsoft.AspNetCore.SignalR.IHubContext<BSkyClone.Hubs.ChatHub> hubContext, 
        IPostService postService, 
        IServiceScopeFactory scopeFactory,
        IRepoManager repoManager,
        IUserService userService,
        IXrpcProxyService xrpcProxy,
        IHttpClientFactory httpClientFactory,
        ILogger<ListService> logger) 
    {
        _unitOfWork = unitOfWork;
        _hubContext = hubContext;
        _postService = postService;
        _scopeFactory = scopeFactory;
        _repoManager = repoManager;
        _userService = userService;
        _xrpcProxy = xrpcProxy;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<ListDto> CreateListAsync(Guid userId, CreateListDto dto)
    {
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.Did)) throw new Exception("User DID not found");

        var rkey = ProtocolUtils.GenerateTid();
        
        // Check if remote AT Protocol user (not local)
        bool isRemoteUser = !user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);
        
        // Convert to Dictionary<string, object> for CBOR encoding
        var listRecord = new Dictionary<string, object>
        {
            ["$type"] = "app.bsky.graph.list",
            ["name"] = dto.Name,
            ["purpose"] = dto.Purpose ?? "app.bsky.graph.defs#curatelist",
            ["description"] = dto.Description ?? "",
            ["createdAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        // Handle avatar for both local and remote users
        object? avatarBlob = null;
        if (!string.IsNullOrEmpty(dto.Avatar))
        {
            if (isRemoteUser)
            {
                // Remote user - upload avatar as blob to AT Protocol
                var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
                if (!string.IsNullOrWhiteSpace(token))
                {
                    try
                    {
                        // Download the avatar image from the URL
                        using var httpClient = new HttpClient();
                        var imageBytes = await httpClient.GetByteArrayAsync(dto.Avatar);
                        
                        // Determine MIME type from URL or default to image/jpeg
                        string mimeType = "image/jpeg";
                        if (dto.Avatar.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                            mimeType = "image/png";
                        else if (dto.Avatar.EndsWith(".gif", StringComparison.OrdinalIgnoreCase))
                            mimeType = "image/gif";
                        else if (dto.Avatar.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
                            mimeType = "image/webp";

                        // Upload blob to AT Protocol
                        using var imageStream = new MemoryStream(imageBytes);
                        var uploadResult = await _xrpcProxy.ProxyRequestAsync(
                            user.Did,
                            "com.atproto.repo.uploadBlob",
                            new Dictionary<string, string?>(),
                            token,
                            "POST",
                            imageStream,
                            userId,
                            mimeType
                        );

                        if (uploadResult.Success)
                        {
                            // Parse blob reference from response
                            using var blobDoc = JsonDocument.Parse(uploadResult.Content);
                            var blobRoot = blobDoc.RootElement;
                            if (blobRoot.TryGetProperty("blob", out var blobProp))
                            {
                                // Create blob object with proper structure
                                avatarBlob = new Dictionary<string, object>
                                {
                                    ["$type"] = "blob",
                                    ["ref"] = blobProp.GetProperty("ref").GetProperty("$link").GetString() ?? "",
                                    ["mimeType"] = blobProp.GetProperty("mimeType").GetString() ?? mimeType,
                                    ["size"] = blobProp.GetProperty("size").GetInt32()
                                };
                                
                                listRecord["avatar"] = avatarBlob;
                                _logger.LogInformation("[CreateList] Avatar blob uploaded successfully");
                            }
                        }
                        else
                        {
                            _logger.LogWarning("[CreateList] Failed to upload avatar blob: {Content}", uploadResult.Content);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "[CreateList] Error uploading avatar blob");
                        // Continue without avatar rather than failing the entire list creation
                    }
                }
            }
            else
            {
                // Local user - store URL directly
                listRecord["avatar"] = dto.Avatar;
            }
        }

        string cid;
        string uri = $"at://{user.Did}/app.bsky.graph.list/{rkey}";

        if (isRemoteUser)
        {
            // Remote user - proxy to their PDS via AT Protocol
            var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new Exception("Bluesky session expired. Please log out and back in.");
            }

            // Use the listRecord dictionary we built (includes avatar if uploaded)
            var requestBody = new Dictionary<string, object?>
            {
                ["repo"] = user.Did,
                ["collection"] = "app.bsky.graph.list",
                ["rkey"] = rkey,
                ["record"] = listRecord
            };

            // Log the request body for debugging
            _logger.LogInformation("[CreateList] Creating remote list with avatar: {HasAvatar}", listRecord.ContainsKey("avatar"));

            var result = await _xrpcProxy.ProxyRequestAsync(
                user.Did,
                "com.atproto.repo.createRecord",
                new Dictionary<string, string?>(),
                token,
                "POST",
                requestBody,
                userId
            );

            // Log the response
            _logger.LogInformation("[CreateList] ===== PDS RESPONSE =====");
            _logger.LogInformation("Success: {Success}", result.Success);
            _logger.LogInformation("Status: {StatusCode}", result.StatusCode);
            _logger.LogInformation("Content: {Content}", result.Content);
            _logger.LogInformation("[CreateList] ===== END RESPONSE =====");

            if (!result.Success)
            {
                throw new Exception($"Failed to create list on remote PDS: {result.Content}");
            }

            // Parse response to get CID and URI
            using var doc = JsonDocument.Parse(result.Content);
            var root = doc.RootElement;
            cid = root.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() ?? "" : "";
            uri = root.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() ?? uri : uri;
        }
        else
        {
            // Local user - create in local repository
            cid = await _repoManager.CreateRecordAsync(user.Did, "app.bsky.graph.list", listRecord, rkey);
        }

        // 2. For local users only: Save to local database
        if (!isRemoteUser)
        {
            var list = new List
            {
                Id = Guid.NewGuid(),
                OwnerId = userId,
                Name = dto.Name,
                Description = dto.Description,
                Purpose = listRecord["purpose"].ToString(),
                AvatarUrl = dto.Avatar,
                CreatedAt = DateTime.UtcNow,
                IsDeleted = false,
                Uri = uri,
                Cid = cid
            };

            await _unitOfWork.Lists.AddAsync(list);
            await _unitOfWork.CompleteAsync();

            return await MapToListDto(list, userId);
        }

        // 3. For remote users: Return DTO directly from PDS response (no local storage)
        return new ListDto
        {
            Id = Guid.NewGuid(), // Temporary ID for UI
            OwnerId = userId,
            Owner = new UserDto(
                user.Id,
                user.Username,
                user.Handle,
                user.Email ?? "",
                user.DisplayName,
                user.AvatarUrl,
                user.CoverImageUrl,
                user.Bio,
                null, // Location
                null, // Website
                null, // DateOfBirth
                user.FollowersCount ?? 0,
                user.FollowingCount ?? 0,
                user.PostsCount ?? 0,
                user.Role,
                null, // ListMembershipStatus
                user.IsVerified,
                user.Did
            ),
            Name = dto.Name,
            Description = dto.Description,
            Purpose = listRecord["purpose"].ToString(),
            AvatarUrl = dto.Avatar, // Include avatar URL (blob was uploaded if provided)
            MembersCount = 0,
            PostsCount = 0,
            CreatedAt = DateTime.UtcNow,
            IsPinned = false,
            IsOwner = true,
            Cid = cid,
            Uri = uri
        };
    }

    public async Task<IEnumerable<ListDto>> GetMyListsAsync(Guid userId, string? purpose = null)
    {
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null) return new List<ListDto>();

        bool isRemoteUser = !string.IsNullOrEmpty(user.Did) && !user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (isRemoteUser)
        {
            // Fetch from AT Protocol for remote users
            var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
            if (string.IsNullOrWhiteSpace(token))
            {
                return new List<ListDto>();
            }

            var queryParams = new Dictionary<string, string?>
            {
                ["actor"] = user.Did,
                ["limit"] = "100"
            };

            if (!string.IsNullOrEmpty(purpose))
            {
                queryParams["purpose"] = purpose;
            }

            var result = await _xrpcProxy.ProxyRequestAsync(
                user.Did,
                "app.bsky.graph.getLists",
                queryParams,
                token,
                "GET",
                null,
                userId
            );

            if (!result.Success)
            {
                return new List<ListDto>();
            }

            // Parse response
            using var doc = JsonDocument.Parse(result.Content);
            var root = doc.RootElement;
            var lists = new List<ListDto>();

            if (root.TryGetProperty("lists", out var listsArray))
            {
                foreach (var listItem in listsArray.EnumerateArray())
                {
                    lists.Add(new ListDto
                    {
                        Id = Guid.NewGuid(), // Temporary ID
                        OwnerId = userId,
                        Owner = new UserDto(
                            user.Id,
                            user.Username,
                            user.Handle,
                            user.Email ?? "",
                            user.DisplayName,
                            user.AvatarUrl,
                            user.CoverImageUrl,
                            user.Bio,
                            null, // Location
                            null, // Website
                            null, // DateOfBirth
                            user.FollowersCount ?? 0,
                            user.FollowingCount ?? 0,
                            user.PostsCount ?? 0,
                            user.Role,
                            null, // ListMembershipStatus
                            user.IsVerified,
                            user.Did
                        ),
                        Name = listItem.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "",
                        Description = listItem.TryGetProperty("description", out var descProp) ? descProp.GetString() : null,
                        Purpose = listItem.TryGetProperty("purpose", out var purposeProp) ? purposeProp.GetString() : null,
                        AvatarUrl = listItem.TryGetProperty("avatar", out var avatarProp) && avatarProp.ValueKind == JsonValueKind.String ? avatarProp.GetString() : null,
                        MembersCount = listItem.TryGetProperty("listItemCount", out var countProp) ? countProp.GetInt32() : 0,
                        PostsCount = 0,
                        CreatedAt = listItem.TryGetProperty("indexedAt", out var createdProp) ? DateTime.Parse(createdProp.GetString() ?? DateTime.UtcNow.ToString()) : DateTime.UtcNow,
                        IsPinned = false, // Would need separate endpoint
                        IsOwner = true,
                        Cid = listItem.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() : null,
                        Uri = listItem.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() : null
                    });
                }
            }

            return lists;
        }

        // Local users: Query from database
        var query = _unitOfWork.Lists.Query()
            .Where(l => l.OwnerId == userId && l.IsDeleted != true);

        if (!string.IsNullOrEmpty(purpose))
        {
            query = query.Where(l => l.Purpose == purpose || (purpose == "app.bsky.graph.defs#modlist" && l.Purpose == "mod"));
        }

        var localLists = await query
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var dtos = new List<ListDto>();
        foreach (var list in localLists)
        {
            dtos.Add(await MapToListDto(list, userId));
        }
        return dtos;
    }

    public async Task<IEnumerable<ListDto>> GetUserListsAsync(string actor, Guid? viewerId)
    {
        var targetUser = await GetResolvedUserAsync(actor, viewerId);
        if (targetUser == null) return new List<ListDto>();

        // 1. Remote Fetch Check
        bool isRemoteAtProto = !string.IsNullOrWhiteSpace(targetUser.Did) &&
                               !targetUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (isRemoteAtProto)
        {
            try
            {
                string? token = viewerId.HasValue ? await _userService.GetOrRefreshBlueskyTokenAsync(viewerId.Value) : null;
                var viewerDid = viewerId.HasValue ? (await _unitOfWork.Users.GetByIdAsync(viewerId.Value))?.Did : null;

                var queryParams = new Dictionary<string, string?> { ["actor"] = targetUser.Did };
                
                ProxyResponse resp;
                if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(viewerDid))
                {
                    resp = await _xrpcProxy.ProxyRequestAsync(viewerDid, "app.bsky.graph.getLists", queryParams, token);
                }
                else
                {
                    using var client = _httpClientFactory.CreateClient();
                    var url = $"https://public.api.bsky.app/xrpc/app.bsky.graph.getLists?actor={Uri.EscapeDataString(targetUser.Did)}";
                    var httpResp = await client.GetAsync(url);
                    if (!httpResp.IsSuccessStatusCode) return new List<ListDto>();
                    resp = new ProxyResponse { Success = true, Content = await httpResp.Content.ReadAsStringAsync() };
                }

                if (resp.Success)
                {
                    using var doc = JsonDocument.Parse(resp.Content);
                    if (doc.RootElement.TryGetProperty("lists", out var listsArray))
                    {
                        var result = new List<ListDto>();
                        foreach (var listElem in listsArray.EnumerateArray())
                        {
                            result.Add(MapRemoteListToDto(listElem, viewerId ?? Guid.Empty));
                        }
                        return result;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ListService] Remote GetUserListsAsync error: {ex.Message}");
            }
        }

        // 2. Local Fallback
        var lists = await _unitOfWork.Lists.Query()
            .Where(l => l.OwnerId == targetUser.Id && l.IsDeleted != true)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var localResult = new List<ListDto>();
        foreach (var list in lists)
        {
            if (list == null) continue;
            localResult.Add(await MapToListDto(list, viewerId ?? Guid.Empty));
        }
        return localResult;
    }

    private async Task<User?> GetResolvedUserAsync(string identifier, Guid? viewerId = null)
    {
        if (Guid.TryParse(identifier, out var guid))
        {
            return await _unitOfWork.Users.GetByIdAsync(guid);
        }

        // Try local handle lookup first
        var localUser = await _userService.GetUserByHandleAsync(identifier)
            ?? await _userService.GetUserByUsernameAsync(identifier)
            ?? await _userService.GetUserByDidAsync(identifier);
        if (localUser != null)
        {
            return localUser;
        }

        // Try remote resolution
        var (result, _) = await _userService.ResolveRemoteProfileAsync(identifier, viewerId: viewerId);
        return result;
    }

    private ListDto MapRemoteListToDto(JsonElement list, Guid viewerId)
    {
        var uri = list.GetProperty("uri").GetString()!;
        var creator = list.GetProperty("creator");
        var creatorDid = creator.GetProperty("did").GetString()!;
        var creatorHandle = creator.GetProperty("handle").GetString()!;

        return new ListDto
        {
            Id = Guid.Empty, // Remote lists don't have local GUIDs
            OwnerId = Guid.Empty,
            Name = list.GetProperty("name").GetString()!,
            Description = list.TryGetProperty("description", out var d) ? d.GetString() : null,
            Purpose = list.GetProperty("purpose").GetString()!,
            AvatarUrl = list.TryGetProperty("avatar", out var a) ? a.GetString() : null,
            MembersCount = 0, // Metadata doesn't usually include count in list view
            PostsCount = 0,
            CreatedAt = list.TryGetProperty("indexedAt", out var idx) ? idx.GetDateTime() : DateTime.UtcNow,
            IsPinned = false, // Simplified
            IsOwner = false,
            Uri = uri,
            Cid = list.TryGetProperty("cid", out var cid) ? cid.GetString() : null,
            Owner = new UserDto(
                Guid.Empty,
                creatorHandle,
                creatorHandle,
                "",
                creator.TryGetProperty("displayName", out var dn) ? dn.GetString() : creatorHandle,
                creator.TryGetProperty("avatar", out var cav) ? cav.GetString() : null,
                null,
                null,
                null,
                null,
                null,
                0, 0, 0,
                "user",
                null,
                false,
                creatorDid
            )
        };
    }

    public async Task<ListDto?> GetListByIdAsync(Guid userId, Guid listId)
    {
        // Check if listId parameter is actually an AT URI disguised as string
        // This happens when navigating from list page where we use URI as ID
        var listIdStr = listId.ToString();
        
        // If it looks like an AT URI, handle it as remote list
        if (listIdStr.StartsWith("at://", StringComparison.OrdinalIgnoreCase))
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user == null) return null;

            var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
            if (string.IsNullOrWhiteSpace(token)) return null;

            var queryParams = new Dictionary<string, string?>
            {
                ["list"] = listIdStr,
                ["limit"] = "1"
            };

            var result = await _xrpcProxy.ProxyRequestAsync(
                user.Did,
                "app.bsky.graph.getList",
                queryParams,
                token,
                "GET",
                null,
                userId
            );

            if (!result.Success) return null;

            using var doc = JsonDocument.Parse(result.Content);
            var root = doc.RootElement;
            
            if (root.TryGetProperty("list", out var listElem))
            {
                return new ListDto
                {
                    Id = Guid.NewGuid(), // Temporary ID
                    OwnerId = userId,
                    Owner = new UserDto(
                        user.Id,
                        user.Username,
                        user.Handle,
                        user.Email ?? "",
                        user.DisplayName,
                        user.AvatarUrl,
                        user.CoverImageUrl,
                        user.Bio,
                        null,
                        null,
                        null,
                        user.FollowersCount ?? 0,
                        user.FollowingCount ?? 0,
                        user.PostsCount ?? 0,
                        user.Role,
                        null,
                        user.IsVerified,
                        user.Did
                    ),
                    Name = listElem.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? "" : "",
                    Description = listElem.TryGetProperty("description", out var descProp) ? descProp.GetString() : null,
                    Purpose = listElem.TryGetProperty("purpose", out var purposeProp) ? purposeProp.GetString() : null,
                    AvatarUrl = listElem.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : null,
                    MembersCount = listElem.TryGetProperty("listItemCount", out var countProp) ? countProp.GetInt32() : 0,
                    PostsCount = 0,
                    CreatedAt = listElem.TryGetProperty("indexedAt", out var createdProp) ? DateTime.Parse(createdProp.GetString() ?? DateTime.UtcNow.ToString()) : DateTime.UtcNow,
                    IsPinned = false,
                    IsOwner = true, // Since we're fetching via app.bsky.graph.getList with user's token, they must be the owner
                    Cid = listElem.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() : null,
                    Uri = listElem.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() : null
                };
            }

            return null;
        }

        // Local database lookup for local users
        var list = await _unitOfWork.Lists.Query()
            .Include(l => l.Owner)
            .FirstOrDefaultAsync(l => l.Id == listId && l.IsDeleted != true);

        if (list == null) return null;

        return await MapToListDto(list, userId);
    }

    public async Task<ListDto> UpdateListAsync(Guid userId, Guid listId, UpdateListDto dto)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null || list.OwnerId != userId) throw new UnauthorizedAccessException("Not owner");

        if (dto.Name != null) list.Name = dto.Name;
        if (dto.Description != null) list.Description = dto.Description;
        if (dto.Avatar != null) list.AvatarUrl = dto.Avatar;

        // Sync with Repository
        if (!string.IsNullOrEmpty(list.Uri))
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user != null && !string.IsNullOrEmpty(user.Did))
            {
                var rkey = list.Uri.Split('/').Last();
                bool isRemoteUser = !user.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);
                
                // Convert to Dictionary<string, object> for CBOR encoding
                var listRecord = new Dictionary<string, object>
                {
                    ["$type"] = "app.bsky.graph.list",
                    ["name"] = list.Name,
                    ["purpose"] = list.Purpose ?? "app.bsky.graph.defs#curatelist",
                    ["description"] = list.Description ?? "",
                    ["createdAt"] = list.CreatedAt?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") ?? DateTime.UtcNow.ToString("o")
                };

                // Only include avatar for local users (remote users need blob upload)
                if (!isRemoteUser && !string.IsNullOrEmpty(list.AvatarUrl))
                {
                    listRecord["avatar"] = list.AvatarUrl;
                }

                if (isRemoteUser)
                {
                    // Remote user - proxy putRecord to their PDS
                    var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
                    if (!string.IsNullOrWhiteSpace(token))
                    {
                        var requestBody = new Dictionary<string, object?>
                        {
                            ["repo"] = user.Did,
                            ["collection"] = "app.bsky.graph.list",
                            ["rkey"] = rkey,
                            ["record"] = listRecord
                        };

                        var result = await _xrpcProxy.ProxyRequestAsync(
                            user.Did,
                            "com.atproto.repo.putRecord",
                            new Dictionary<string, string?>(),
                            token,
                            "POST",
                            requestBody,
                            userId
                        );

                        if (result.Success)
                        {
                            using var doc = JsonDocument.Parse(result.Content);
                            var root = doc.RootElement;
                            list.Cid = root.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() : list.Cid;
                        }
                    }
                }
                else
                {
                    // Local user - putRecord behavior (update in local repo)
                    var cid = await _repoManager.CreateRecordAsync(user.Did, "app.bsky.graph.list", listRecord, rkey);
                    list.Cid = cid;
                }
            }
        }

        _unitOfWork.Lists.Update(list);
        await _unitOfWork.CompleteAsync();

        return await MapToListDto(list, userId);
    }

    public async Task<ListDto> UpdateListByIdOrUriAsync(Guid userId, string listIdOrUri, UpdateListDto dto)
    {
        // Try to parse as GUID first (local list)
        if (Guid.TryParse(listIdOrUri, out var listGuid))
        {
            return await UpdateListAsync(userId, listGuid, dto);
        }

        // Remote list path - get user's DID
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.Did))
        {
            throw new Exception("User DID not found");
        }

        // Construct AT URI from rkey or use full URI if provided
        string listUri;
        string rkey;
        if (listIdOrUri.StartsWith("at://"))
        {
            listUri = listIdOrUri;
            rkey = listUri.Split('/').Last();
        }
        else
        {
            // It's an rkey, construct the full URI
            rkey = listIdOrUri;
            listUri = $"at://{user.Did}/app.bsky.graph.list/{rkey}";
        }

        // Get auth token
        var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new Exception("Bluesky session expired. Please log out and back in.");
        }

        // Step 1: Fetch current record using app.bsky.graph.getList
        var getListParams = new Dictionary<string, string?>
        {
            ["list"] = listUri
        };

        var getResult = await _xrpcProxy.ProxyRequestAsync(
            user.Did,
            "app.bsky.graph.getList",
            getListParams,
            token,
            "GET",
            null,
            userId
        );

        if (!getResult.Success)
        {
            _logger.LogError("[UpdateListByIdOrUriAsync] Failed to fetch remote list {Uri}: {Content}", listUri, getResult.Content);
            throw new Exception($"Failed to fetch list: {getResult.Content}");
        }

        // Parse the current list record
        using var getDoc = JsonDocument.Parse(getResult.Content);
        var getRoot = getDoc.RootElement;
        
        if (!getRoot.TryGetProperty("list", out var listElement))
        {
            throw new Exception("List not found in response");
        }

        // Step 2: Merge updates - start with current record
        var mergedRecord = new Dictionary<string, object>
        {
            ["$type"] = "app.bsky.graph.list"
        };

        // Update name if provided, otherwise keep current
        if (dto.Name != null)
        {
            mergedRecord["name"] = dto.Name;
        }
        else if (listElement.TryGetProperty("name", out var nameProp))
        {
            mergedRecord["name"] = nameProp.GetString() ?? "";
        }

        // Update description if provided, otherwise keep current
        if (dto.Description != null)
        {
            mergedRecord["description"] = dto.Description;
        }
        else if (listElement.TryGetProperty("description", out var descProp))
        {
            mergedRecord["description"] = descProp.GetString() ?? "";
        }

        // Preserve purpose from original record (UpdateListDto doesn't include purpose)
        if (listElement.TryGetProperty("purpose", out var purposeProp))
        {
            mergedRecord["purpose"] = purposeProp.GetString() ?? "app.bsky.graph.defs#curatelist";
        }
        else
        {
            mergedRecord["purpose"] = "app.bsky.graph.defs#curatelist";
        }

        // Preserve createdAt from original record
        if (listElement.TryGetProperty("createdAt", out var createdAtProp))
        {
            mergedRecord["createdAt"] = createdAtProp.GetString() ?? DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        }
        else
        {
            mergedRecord["createdAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ");
        }

        // Handle avatar update - upload as blob if provided
        if (dto.Avatar != null)
        {
            if (!string.IsNullOrEmpty(dto.Avatar))
            {
                try
                {
                    // Download the avatar image from the URL
                    using var httpClient = new HttpClient();
                    var imageBytes = await httpClient.GetByteArrayAsync(dto.Avatar);
                    
                    // Determine MIME type from URL or default to image/jpeg
                    string mimeType = "image/jpeg";
                    if (dto.Avatar.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                        mimeType = "image/png";
                    else if (dto.Avatar.EndsWith(".gif", StringComparison.OrdinalIgnoreCase))
                        mimeType = "image/gif";
                    else if (dto.Avatar.EndsWith(".webp", StringComparison.OrdinalIgnoreCase))
                        mimeType = "image/webp";

                    // Upload blob to AT Protocol
                    using var imageStream = new MemoryStream(imageBytes);
                    var uploadResult = await _xrpcProxy.ProxyRequestAsync(
                        user.Did,
                        "com.atproto.repo.uploadBlob",
                        new Dictionary<string, string?>(),
                        token,
                        "POST",
                        imageStream,
                        userId,
                        mimeType
                    );

                    if (uploadResult.Success)
                    {
                        // Parse blob reference from response
                        using var blobDoc = JsonDocument.Parse(uploadResult.Content);
                        var blobRoot = blobDoc.RootElement;
                        if (blobRoot.TryGetProperty("blob", out var blobProp))
                        {
                            // Create blob object with proper structure
                            var avatarBlob = new Dictionary<string, object>
                            {
                                ["$type"] = "blob",
                                ["ref"] = blobProp.GetProperty("ref").GetProperty("$link").GetString() ?? "",
                                ["mimeType"] = blobProp.GetProperty("mimeType").GetString() ?? mimeType,
                                ["size"] = blobProp.GetProperty("size").GetInt32()
                            };
                            
                            mergedRecord["avatar"] = avatarBlob;
                            _logger.LogInformation("[UpdateListByIdOrUriAsync] Avatar blob uploaded successfully");
                        }
                    }
                    else
                    {
                        _logger.LogWarning("[UpdateListByIdOrUriAsync] Failed to upload avatar blob: {Content}", uploadResult.Content);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[UpdateListByIdOrUriAsync] Error uploading avatar blob");
                    // Continue without avatar update rather than failing the entire update
                }
            }
            else
            {
                // Empty string means remove avatar
                mergedRecord.Remove("avatar");
            }
        }
        else
        {
            // dto.Avatar is null - preserve existing avatar
            if (listElement.TryGetProperty("avatar", out var existingAvatarProp))
            {
                // Preserve existing avatar blob
                mergedRecord["avatar"] = JsonSerializer.Deserialize<Dictionary<string, object>>(existingAvatarProp.GetRawText()) ?? new Dictionary<string, object>();
            }
        }

        // Step 3: Call putRecord with merged record
        var putRequestBody = new Dictionary<string, object?>
        {
            ["repo"] = user.Did,
            ["collection"] = "app.bsky.graph.list",
            ["rkey"] = rkey,
            ["record"] = mergedRecord
        };

        var putResult = await _xrpcProxy.ProxyRequestAsync(
            user.Did,
            "com.atproto.repo.putRecord",
            new Dictionary<string, string?>(),
            token,
            "POST",
            putRequestBody,
            userId
        );

        if (!putResult.Success)
        {
            _logger.LogError("[UpdateListByIdOrUriAsync] Failed to update remote list {Uri}: {Content}", listUri, putResult.Content);
            throw new Exception($"Failed to update list: {putResult.Content}");
        }

        // Step 4: Parse response and build ListDto
        using var putDoc = JsonDocument.Parse(putResult.Content);
        var putRoot = putDoc.RootElement;
        string? cid = putRoot.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() : null;
        string? updatedUri = putRoot.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() : listUri;

        // Build and return ListDto
        var resultDto = new ListDto
        {
            Id = Guid.NewGuid(), // Temporary ID for remote list
            OwnerId = userId,
            Owner = new UserDto(
                user.Id,
                user.Username,
                user.Handle,
                user.Email ?? "",
                user.DisplayName,
                user.AvatarUrl,
                user.CoverImageUrl,
                user.Bio,
                null, // Location
                null, // Website
                null, // DateOfBirth
                user.FollowersCount ?? 0,
                user.FollowingCount ?? 0,
                user.PostsCount ?? 0,
                user.Role,
                null, // ListMembershipStatus
                user.IsVerified,
                user.Did
            ),
            Name = mergedRecord.ContainsKey("name") ? mergedRecord["name"].ToString() ?? "" : "",
            Description = mergedRecord.ContainsKey("description") ? mergedRecord["description"].ToString() : null,
            Purpose = mergedRecord.ContainsKey("purpose") ? mergedRecord["purpose"].ToString() : null,
            AvatarUrl = listElement.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : null,
            MembersCount = listElement.TryGetProperty("listItemCount", out var countProp) ? countProp.GetInt32() : 0,
            PostsCount = 0,
            CreatedAt = mergedRecord.ContainsKey("createdAt") ? DateTime.Parse(mergedRecord["createdAt"].ToString() ?? DateTime.UtcNow.ToString()) : DateTime.UtcNow,
            IsPinned = false,
            IsOwner = true,
            Cid = cid,
            Uri = updatedUri
        };

        _logger.LogInformation("[UpdateListByIdOrUriAsync] Successfully updated remote list {Uri}", updatedUri);
        return resultDto;
    }

    public async Task<bool> DeleteListAsync(Guid userId, Guid listId)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null || list.OwnerId != userId) return false;

        // 1. Delete from Repository if it has a URI
        if (!string.IsNullOrEmpty(list.Uri))
        {
            var user = await _userService.GetUserByIdAsync(userId);
            if (user != null && !string.IsNullOrEmpty(user.Did))
            {
                var rkey = list.Uri.Split('/').Last();
                await _repoManager.DeleteRecordAsync(user.Did, "app.bsky.graph.list", rkey);
            }
        }

        // 2. Soft delete in local DB
        list.IsDeleted = true;
        _unitOfWork.Lists.Update(list);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> DeleteListByIdOrUriAsync(Guid userId, string listIdOrUri)
    {
        // Try to parse as GUID first (local list)
        if (Guid.TryParse(listIdOrUri, out var listGuid))
        {
            return await DeleteListAsync(userId, listGuid);
        }

        // Remote list path - get user's DID
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.Did))
        {
            _logger.LogError("[DeleteListByIdOrUriAsync] User DID not found for userId: {UserId}", userId);
            return false;
        }

        // Construct AT URI from rkey or use full URI if provided
        string listUri;
        string rkey;
        if (listIdOrUri.StartsWith("at://"))
        {
            listUri = listIdOrUri;
            rkey = listUri.Split('/').Last();
        }
        else
        {
            // It's an rkey, construct the full URI
            rkey = listIdOrUri;
            listUri = $"at://{user.Did}/app.bsky.graph.list/{rkey}";
        }

        // Get auth token
        var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new Exception("Bluesky session expired. Please log out and back in.");
        }

        // Call deleteRecord via XrpcProxy
        var requestBody = new Dictionary<string, object?>
        {
            ["repo"] = user.Did,
            ["collection"] = "app.bsky.graph.list",
            ["rkey"] = rkey
        };

        var result = await _xrpcProxy.ProxyRequestAsync(
            user.Did,
            "com.atproto.repo.deleteRecord",
            new Dictionary<string, string?>(),
            token,
            "POST",
            requestBody,
            userId
        );

        if (!result.Success)
        {
            _logger.LogError("[DeleteListByIdOrUriAsync] Failed to delete remote list {Uri}: {Content}", listUri, result.Content);
            return false;
        }

        _logger.LogInformation("[DeleteListByIdOrUriAsync] Successfully deleted remote list {Uri}", listUri);
        return true;
    }

    // Members

    public async Task<bool> AddMemberByIdOrUriAsync(Guid ownerId, string listIdOrUri, Guid targetUserId)
    {
        // Try to parse as GUID first (local list)
        if (Guid.TryParse(listIdOrUri, out var listGuid))
        {
            return await AddMemberAsync(ownerId, listGuid, targetUserId);
        }

        // For remote lists (rkey or AT URI), construct the list URI and add member directly via AT Protocol
        var owner = await _userService.GetUserByIdAsync(ownerId);
        if (owner == null || string.IsNullOrEmpty(owner.Did)) return false;

        var targetUser = await _userService.GetUserByIdAsync(targetUserId);
        if (targetUser == null || string.IsNullOrEmpty(targetUser.Did)) return false;

        // Construct full AT URI if only rkey is provided
        string listUri;
        if (listIdOrUri.StartsWith("at://"))
        {
            listUri = listIdOrUri;
        }
        else
        {
            // It's an rkey, construct the full URI
            listUri = $"at://{owner.Did}/app.bsky.graph.list/{listIdOrUri}";
        }

        // Create listitem via AT Protocol
        var rkey = ProtocolUtils.GenerateTid();
        var listItemRecord = new Dictionary<string, object>
        {
            ["$type"] = "app.bsky.graph.listitem",
            ["subject"] = targetUser.Did,
            ["list"] = listUri,
            ["createdAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        var token = await _userService.GetOrRefreshBlueskyTokenAsync(ownerId);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new Exception("Bluesky session expired. Please log out and back in.");
        }

        var requestBody = new Dictionary<string, object?>
        {
            ["repo"] = owner.Did,
            ["collection"] = "app.bsky.graph.listitem",
            ["rkey"] = rkey,
            ["record"] = listItemRecord
        };

        var result = await _xrpcProxy.ProxyRequestAsync(
            owner.Did,
            "com.atproto.repo.createRecord",
            new Dictionary<string, string?>(),
            token,
            "POST",
            requestBody,
            ownerId
        );

        if (!result.Success)
        {
            _logger.LogError("[AddMemberByIdOrUriAsync] Failed to add member to remote list: {Content}", result.Content);
            return false;
        }

        return true;
    }

    public async Task<bool> AddMemberAsync(Guid ownerId, Guid listId, Guid targetUserId)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null || list.OwnerId != ownerId) return false;

        var targetUser = await _userService.GetUserByIdAsync(targetUserId);
        if (targetUser == null || string.IsNullOrEmpty(targetUser.Did)) return false;

        var owner = await _userService.GetUserByIdAsync(ownerId);
        if (owner == null || string.IsNullOrEmpty(owner.Did)) return false;

        // 1. Check if already member
        var existing = await _unitOfWork.ListMembers.Query()
            .FirstOrDefaultAsync(lm => lm.ListId == listId && lm.UserId == targetUserId);
        
        if (existing != null && !string.IsNullOrEmpty(existing.Uri)) return true; // Already exists in Repo

        // 2. Create listitem Record in Repository
        var rkey = ProtocolUtils.GenerateTid();
        
        // Convert to Dictionary<string, object> for CBOR encoding
        var listItemRecord = new Dictionary<string, object>
        {
            ["$type"] = "app.bsky.graph.listitem",
            ["subject"] = targetUser.Did,
            ["list"] = list.Uri,
            ["createdAt"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        string cid;
        string uri;
        bool isRemoteOwner = !owner.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

        if (isRemoteOwner)
        {
            // Remote owner - proxy to their PDS
            var token = await _userService.GetOrRefreshBlueskyTokenAsync(ownerId);
            if (string.IsNullOrWhiteSpace(token))
            {
                throw new Exception("Bluesky session expired. Please log out and back in.");
            }

            var requestBody = new Dictionary<string, object?>
            {
                ["repo"] = owner.Did,
                ["collection"] = "app.bsky.graph.listitem",
                ["rkey"] = rkey,
                ["record"] = listItemRecord
            };

            var result = await _xrpcProxy.ProxyRequestAsync(
                owner.Did,
                "com.atproto.repo.createRecord",
                new Dictionary<string, string?>(),
                token,
                "POST",
                requestBody,
                ownerId
            );

            if (!result.Success)
            {
                throw new Exception($"Failed to add user to list on remote PDS: {result.Content}");
            }

            using var doc = JsonDocument.Parse(result.Content);
            var root = doc.RootElement;
            cid = root.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() ?? "" : "";
            uri = root.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() ?? "" : $"at://{owner.Did}/app.bsky.graph.listitem/{rkey}";
        }
        else
        {
            // Local owner - create in local repo
            cid = await _repoManager.CreateRecordAsync(owner.Did, "app.bsky.graph.listitem", listItemRecord, rkey);
            uri = $"at://{owner.Did}/app.bsky.graph.listitem/{rkey}";
        }

        // 3. Mirror to Local Database
        if (existing != null)
        {
            existing.Status = 1; // Mark as accepted immediately for ATProto lists
            existing.JoinedAt = DateTime.UtcNow;
            existing.Uri = uri;
            existing.Cid = cid;
            _unitOfWork.ListMembers.Update(existing);
        }
        else
        {
            var member = new ListMember
            {
                ListId = listId,
                UserId = targetUserId,
                JoinedAt = DateTime.UtcNow,
                Status = 1,
                Uri = uri,
                Cid = cid
            };
            await _unitOfWork.ListMembers.AddAsync(member);
        }

        // Note: For ATProto-compliant lists, we skip the "invitation" flow and add directly.
        await _unitOfWork.CompleteAsync();
        return true;
    }

    public async Task<bool> RemoveMemberAsync(Guid requestingUserId, Guid listId, Guid targetUserId)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null) return false;

        // Allow if requester is owner OR requester is removing themselves
        if (list.OwnerId != requestingUserId && requestingUserId != targetUserId) 
        {
            return false;
        }

        var existing = await _unitOfWork.ListMembers.Query()
            .FirstOrDefaultAsync(lm => lm.ListId == listId && lm.UserId == targetUserId);

        if (existing == null) return false;

        // 1. Delete from Repository
        if (!string.IsNullOrEmpty(existing.Uri))
        {
            var owner = await _userService.GetUserByIdAsync(list.OwnerId);
            if (owner != null && !string.IsNullOrEmpty(owner.Did))
            {
                var rkey = existing.Uri.Split('/').Last();
                await _repoManager.DeleteRecordAsync(owner.Did, "app.bsky.graph.listitem", rkey);
            }
        }

        // 2. Remove from local DB
        _unitOfWork.ListMembers.Remove(existing);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> RemoveMemberByIdOrUriAsync(Guid requestingUserId, string listIdOrUri, Guid targetUserId)
    {
        // Try to parse as GUID first (local list)
        if (Guid.TryParse(listIdOrUri, out var listGuid))
        {
            return await RemoveMemberAsync(requestingUserId, listGuid, targetUserId);
        }

        // Remote list path - get requesting user's DID
        var requestingUser = await _userService.GetUserByIdAsync(requestingUserId);
        if (requestingUser == null || string.IsNullOrEmpty(requestingUser.Did))
        {
            _logger.LogError("[RemoveMemberByIdOrUriAsync] Requesting user DID not found for userId: {UserId}", requestingUserId);
            return false;
        }

        // Get target user's DID
        var targetUser = await _userService.GetUserByIdAsync(targetUserId);
        if (targetUser == null || string.IsNullOrEmpty(targetUser.Did))
        {
            _logger.LogError("[RemoveMemberByIdOrUriAsync] Target user DID not found for userId: {UserId}", targetUserId);
            return false;
        }

        // Construct list AT URI (use as full URI if provided, or construct from DID + rkey)
        string listUri;
        if (listIdOrUri.StartsWith("at://"))
        {
            listUri = listIdOrUri;
        }
        else
        {
            // It's an rkey, construct the full URI using requesting user's DID
            listUri = $"at://{requestingUser.Did}/app.bsky.graph.list/{listIdOrUri}";
        }

        // Get auth token
        var token = await _userService.GetOrRefreshBlueskyTokenAsync(requestingUserId);
        if (string.IsNullOrWhiteSpace(token))
        {
            throw new Exception("Bluesky session expired. Please log out and back in.");
        }

        // Step 1: Query app.bsky.graph.getList to get all members and find the target listitem
        var getListParams = new Dictionary<string, string?>
        {
            ["list"] = listUri,
            ["limit"] = "100" // Fetch up to 100 members (AT Protocol default)
        };

        var getListResult = await _xrpcProxy.ProxyRequestAsync(
            requestingUser.Did,
            "app.bsky.graph.getList",
            getListParams,
            token,
            "GET",
            null,
            requestingUserId
        );

        if (!getListResult.Success)
        {
            _logger.LogError("[RemoveMemberByIdOrUriAsync] Failed to fetch remote list {Uri}: {Content}", listUri, getListResult.Content);
            return false;
        }

        // Step 2: Parse response and find the listitem where subject matches target user's DID
        using var doc = JsonDocument.Parse(getListResult.Content);
        var root = doc.RootElement;
        
        if (!root.TryGetProperty("items", out var itemsArray))
        {
            _logger.LogError("[RemoveMemberByIdOrUriAsync] No items array in response for list {Uri}", listUri);
            return false;
        }

        string? listitemUri = null;
        foreach (var item in itemsArray.EnumerateArray())
        {
            if (item.TryGetProperty("subject", out var subjectElem))
            {
                string? subjectDid = null;
                
                // Subject can be either a string (DID) or an object with a 'did' property
                if (subjectElem.ValueKind == JsonValueKind.String)
                {
                    subjectDid = subjectElem.GetString();
                }
                else if (subjectElem.ValueKind == JsonValueKind.Object && subjectElem.TryGetProperty("did", out var didProp))
                {
                    subjectDid = didProp.GetString();
                }

                if (subjectDid == targetUser.Did)
                {
                    // Found the matching listitem
                    if (item.TryGetProperty("uri", out var uriProp))
                    {
                        listitemUri = uriProp.GetString();
                        break;
                    }
                }
            }
        }

        // If listitem not found, the member isn't in the list
        if (string.IsNullOrEmpty(listitemUri))
        {
            _logger.LogWarning("[RemoveMemberByIdOrUriAsync] Member {TargetDid} not found in list {Uri}", targetUser.Did, listUri);
            return false;
        }

        // Step 3: Extract the itemRkey from the listitem URI
        // URI format: at://{ownerDid}/app.bsky.graph.listitem/{itemRkey}
        var uriParts = listitemUri.Split('/');
        if (uriParts.Length < 5)
        {
            _logger.LogError("[RemoveMemberByIdOrUriAsync] Invalid listitem URI format: {Uri}", listitemUri);
            return false;
        }
        
        string itemRkey = uriParts[^1]; // Last segment is the rkey
        string ownerDid = uriParts[2]; // Third segment is the owner DID (after at:// and empty string)

        // Step 4: Call deleteRecord to remove the listitem
        var deleteRequestBody = new Dictionary<string, object?>
        {
            ["repo"] = ownerDid,
            ["collection"] = "app.bsky.graph.listitem",
            ["rkey"] = itemRkey
        };

        var deleteResult = await _xrpcProxy.ProxyRequestAsync(
            requestingUser.Did,
            "com.atproto.repo.deleteRecord",
            new Dictionary<string, string?>(),
            token,
            "POST",
            deleteRequestBody,
            requestingUserId
        );

        if (!deleteResult.Success)
        {
            _logger.LogError("[RemoveMemberByIdOrUriAsync] Failed to delete listitem {Uri}: {Content}", listitemUri, deleteResult.Content);
            return false;
        }

        _logger.LogInformation("[RemoveMemberByIdOrUriAsync] Successfully removed member {TargetDid} from list {Uri}", targetUser.Did, listUri);
        return true;
    }

    public async Task<IEnumerable<ListItemDto>> GetListMembersAsync(Guid listId)
    {
        var members = await _unitOfWork.ListMembers.Query()
            .Where(lm => lm.ListId == listId && lm.Status == 1) // Only accepted members show up on the list
            .Include(lm => lm.User)
            .OrderByDescending(lm => lm.JoinedAt)
            .ToListAsync();

        return members.Select(lm => new ListItemDto
        {
            UserId = lm.UserId,
            User = new UserDto(
                lm.User.Id,
                lm.User.Username,
                lm.User.Handle,
                lm.User.Email,
                lm.User.DisplayName,
                lm.User.AvatarUrl,
                lm.User.CoverImageUrl,
                lm.User.Bio,
                lm.User.Location,
                lm.User.Website,
                lm.User.DateOfBirth,
                lm.User.FollowersCount,
                lm.User.FollowingCount,
                lm.User.PostsCount,
                lm.User.Role,
                null,
                lm.User.IsVerified,
                lm.User.Did
            ),
            JoinedAt = lm.JoinedAt ?? DateTime.UtcNow,
            Uri = lm.Uri,
            Cid = lm.Cid
        });
    }

    public async Task<IEnumerable<ListItemDto>> GetListMembersByIdOrUriAsync(string listIdOrUri, Guid? viewerId = null)
    {
        // Try to parse as GUID first (local list)
        if (Guid.TryParse(listIdOrUri, out var listGuid))
        {
            return await GetListMembersAsync(listGuid);
        }

        // Remote list path - construct AT URI
        string listUri;
        if (listIdOrUri.StartsWith("at://"))
        {
            // Already a full AT URI
            listUri = listIdOrUri;
        }
        else
        {
            // It's an rkey - we need to construct the full URI
            // Design recommends frontend provides full URI for remote lists
            // For now, we'll assume it's already a full URI or handle the error
            listUri = listIdOrUri;
        }

        // Get viewer's token if available for authenticated requests
        string? token = null;
        string? viewerDid = null;
        
        if (viewerId.HasValue)
        {
            var viewer = await _userService.GetUserByIdAsync(viewerId.Value);
            if (viewer != null && !string.IsNullOrEmpty(viewer.Did))
            {
                viewerDid = viewer.Did;
                token = await _userService.GetOrRefreshBlueskyTokenAsync(viewerId.Value);
            }
        }

        // Call app.bsky.graph.getList to fetch list members
        var queryParams = new Dictionary<string, string?>
        {
            ["list"] = listUri,
            ["limit"] = "100"
        };

        ProxyResponse result;
        if (!string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(viewerDid))
        {
            // Authenticated request
            result = await _xrpcProxy.ProxyRequestAsync(
                viewerDid,
                "app.bsky.graph.getList",
                queryParams,
                token,
                "GET",
                null,
                viewerId.Value
            );
        }
        else
        {
            // Public/unauthenticated request
            using var client = _httpClientFactory.CreateClient();
            var url = $"https://public.api.bsky.app/xrpc/app.bsky.graph.getList?list={Uri.EscapeDataString(listUri)}&limit=100";
            var httpResp = await client.GetAsync(url);
            
            if (!httpResp.IsSuccessStatusCode)
            {
                _logger.LogError("[GetListMembersByIdOrUriAsync] Failed to fetch remote list members from public API: {StatusCode}", httpResp.StatusCode);
                return new List<ListItemDto>();
            }
            
            result = new ProxyResponse 
            { 
                Success = true, 
                Content = await httpResp.Content.ReadAsStringAsync() 
            };
        }

        if (!result.Success)
        {
            _logger.LogError("[GetListMembersByIdOrUriAsync] Failed to fetch remote list members: {Content}", result.Content);
            return new List<ListItemDto>();
        }

        // Parse JSON response to extract items array
        var memberDtos = new List<ListItemDto>();
        
        try
        {
            using var doc = JsonDocument.Parse(result.Content);
            var root = doc.RootElement;

            if (!root.TryGetProperty("items", out var itemsArray))
            {
                // No members in the list
                return memberDtos;
            }

            // Process each member
            foreach (var item in itemsArray.EnumerateArray())
            {
                if (!item.TryGetProperty("subject", out var subject))
                {
                    continue;
                }

                // Extract subject DID and profile info
                string? subjectDid = subject.TryGetProperty("did", out var didProp) ? didProp.GetString() : null;
                if (string.IsNullOrEmpty(subjectDid))
                {
                    continue;
                }

                // Try to resolve to local User or create lightweight UserDto from AT Protocol data
                var localUser = await _userService.GetUserByDidAsync(subjectDid);
                
                UserDto userDto;
                if (localUser != null)
                {
                    // Use local user data
                    userDto = new UserDto(
                        localUser.Id,
                        localUser.Username,
                        localUser.Handle,
                        localUser.Email ?? "",
                        localUser.DisplayName,
                        localUser.AvatarUrl,
                        localUser.CoverImageUrl,
                        localUser.Bio,
                        null, // Location
                        null, // Website
                        null, // DateOfBirth
                        localUser.FollowersCount ?? 0,
                        localUser.FollowingCount ?? 0,
                        localUser.PostsCount ?? 0,
                        localUser.Role,
                        null, // ListMembershipStatus
                        localUser.IsVerified,
                        localUser.Did
                    );
                }
                else
                {
                    // Create lightweight UserDto from AT Protocol data
                    string handle = subject.TryGetProperty("handle", out var handleProp) ? handleProp.GetString() ?? "" : "";
                    string? displayName = subject.TryGetProperty("displayName", out var displayNameProp) ? displayNameProp.GetString() : null;
                    string? avatarUrl = subject.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : null;
                    string? bio = subject.TryGetProperty("description", out var bioProp) ? bioProp.GetString() : null;

                    userDto = new UserDto(
                        Guid.Empty, // No local ID for remote-only users
                        handle,
                        handle,
                        "", // No email
                        displayName ?? handle,
                        avatarUrl,
                        null, // No cover image
                        bio,
                        null, // Location
                        null, // Website
                        null, // DateOfBirth
                        0, // FollowersCount
                        0, // FollowingCount
                        0, // PostsCount
                        "user",
                        null, // ListMembershipStatus
                        false, // IsVerified
                        subjectDid
                    );
                }

                // Extract item URI and created date
                string? itemUri = item.TryGetProperty("uri", out var uriProp) ? uriProp.GetString() : null;
                string? itemCid = item.TryGetProperty("cid", out var cidProp) ? cidProp.GetString() : null;
                
                DateTime joinedAt = DateTime.UtcNow;
                if (item.TryGetProperty("createdAt", out var createdAtProp))
                {
                    string? createdAtStr = createdAtProp.GetString();
                    if (!string.IsNullOrEmpty(createdAtStr) && DateTime.TryParse(createdAtStr, out var parsedDate))
                    {
                        joinedAt = parsedDate;
                    }
                }

                // Build ListItemDto
                memberDtos.Add(new ListItemDto
                {
                    UserId = userDto.Id,
                    User = userDto,
                    JoinedAt = joinedAt,
                    Uri = itemUri,
                    Cid = itemCid
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[GetListMembersByIdOrUriAsync] Error parsing remote list members response");
            return new List<ListItemDto>();
        }

        return memberDtos;
    }

    // Pinning / Subscribing

    public async Task<bool> PinListAsync(Guid userId, Guid listId)
    {
        var existing = await _unitOfWork.UserListSubscriptions.Query()
            .FirstOrDefaultAsync(uls => uls.UserId == userId && uls.ListId == listId);
        
        if (existing != null) return true;

        var maxOrder = await _unitOfWork.UserListSubscriptions.Query()
            .Where(uls => uls.UserId == userId)
            .MaxAsync(uls => (int?)uls.PinnedOrder) ?? 0;

        var sub = new UserListSubscription
        {
            UserId = userId,
            ListId = listId,
            CreatedAt = DateTime.UtcNow,
            PinnedOrder = maxOrder + 1
        };

        await _unitOfWork.UserListSubscriptions.AddAsync(sub);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> UnpinListAsync(Guid userId, Guid listId)
    {
        var existing = await _unitOfWork.UserListSubscriptions.Query()
            .FirstOrDefaultAsync(uls => uls.UserId == userId && uls.ListId == listId);

        if (existing == null) return true;

        _unitOfWork.UserListSubscriptions.Remove(existing);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<IEnumerable<ListDto>> GetPinnedListsAsync(Guid userId, string? purpose = null)
    {
        var query = _unitOfWork.UserListSubscriptions.Query()
            .Where(uls => uls.UserId == userId)
            .Include(uls => uls.List)
            .ThenInclude(l => l.Owner)
            .Where(uls => uls.List != null && uls.List.IsDeleted != true);

        if (!string.IsNullOrEmpty(purpose))
        {
            query = query.Where(uls => uls.List.Purpose == purpose || (purpose == "app.bsky.graph.defs#modlist" && uls.List.Purpose == "mod"));
        }

        var pinned = await query
            .OrderBy(uls => uls.PinnedOrder)
            .ToListAsync();

        var validLists = pinned.Where(p => p.List != null && p.List.IsDeleted != true).Select(p => p.List!).ToList();
        if (!validLists.Any()) return new List<ListDto>();

        var listIds = validLists.Select(l => l.Id).ToList();

        // Batch fetch counts to avoid N+1
        var memberCounts = await _unitOfWork.ListMembers.Query()
            .Where(lm => listIds.Contains(lm.ListId) && lm.Status == 1)
            .GroupBy(lm => lm.ListId)
            .Select(g => new { ListId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ListId, x => x.Count);

        var postCounts = await _unitOfWork.ListPosts.Query()
            .Where(lp => listIds.Contains(lp.ListId))
            .Join(_unitOfWork.Posts.Query(), lp => lp.PostId, p => p.Id, (lp, p) => new { lp.ListId, p.IsDeleted })
            .Where(x => (x.IsDeleted == false || x.IsDeleted == null))
            .GroupBy(x => x.ListId)
            .Select(g => new { ListId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ListId, x => x.Count);

        var result = new List<ListDto>();
        foreach (var list in validLists)
        {
            memberCounts.TryGetValue(list.Id, out var mCount);
            postCounts.TryGetValue(list.Id, out var pCount);
            result.Add(await MapToListDto(list, userId, true, mCount, pCount));
        }
        return result;
    }

    // Helper
    private async Task<ListDto> MapToListDto(List list, Guid currentUserId, bool? isPinned = null, int? preMembersCount = null, int? prePostsCount = null)
    {
        // Populate owner if missing (e.g. from AddAsync)
        if (list.Owner == null)
        {
             list.Owner = await _unitOfWork.Users.GetByIdAsync(list.OwnerId) ?? new User();
        }

        bool pinned = isPinned ?? await _unitOfWork.UserListSubscriptions.Query()
            .AnyAsync(uls => uls.UserId == currentUserId && uls.ListId == list.Id);

        // Count all list members (AT Protocol lists don't have approval status)
        int membersCount = preMembersCount ?? await _unitOfWork.ListMembers.Query()
            .CountAsync(lm => lm.ListId == list.Id);

        int postsCount = prePostsCount ?? await _unitOfWork.ListPosts.Query()
            .Where(lp => lp.ListId == list.Id)
            .Join(_unitOfWork.Posts.Query(), lp => lp.PostId, p => p.Id, (lp, p) => p)
            .CountAsync(p => p.IsDeleted == false || p.IsDeleted == null);

        return new ListDto
        {
            Id = list.Id,
            OwnerId = list.OwnerId,
            Name = list.Name,
            Description = list.Description,
            Purpose = list.Purpose,
            AvatarUrl = list.AvatarUrl,
            MembersCount = membersCount,
            PostsCount = postsCount,
            CreatedAt = list.CreatedAt ?? DateTime.UtcNow,
            IsPinned = pinned,
            IsOwner = list.OwnerId == currentUserId,
            Uri = list.Uri,
            Cid = list.Cid,
            Owner = list.Owner != null ? new UserDto(
                list.Owner.Id,
                list.Owner.Username,
                list.Owner.Handle,
                list.Owner.Email,
                list.Owner.DisplayName,
                list.Owner.AvatarUrl,
                list.Owner.CoverImageUrl,
                list.Owner.Bio,
                list.Owner.Location,
                list.Owner.Website,
                list.Owner.DateOfBirth,
                list.Owner.FollowersCount,
                list.Owner.FollowingCount,
                list.Owner.PostsCount,
                list.Owner.Role,
                null,
                list.Owner.IsVerified,
                list.Owner.Did
            ) : null
        };
    }

    public async Task<IEnumerable<PostDto>> GetListFeedAsync(Guid userId, Guid listId, int limit = 50, int offset = 0)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null) return new List<PostDto>();

        // Step 1: Get ListPost metadata first (fast)
        var listPosts = await _unitOfWork.ListPosts.Query()
            .Where(lp => lp.ListId == listId)
            .OrderByDescending(lp => lp.AddedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        if (!listPosts.Any()) return new List<PostDto>();

        var postIds = listPosts.Select(lp => lp.PostId).ToList();

        // Step 2: Fetch heavy Post data separately with optimization
        var posts = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.PostMedia)
            .Include(p => p.ReplyToPost).ThenInclude(rp => rp!.LinkPreview)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.Author)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
            .Include(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
            .AsSplitQuery()
            .Where(p => postIds.Contains(p.Id))
            .ToListAsync();

        var postMap = posts.ToDictionary(p => p.Id);

        // Step 3: Map and combine
        var curatedDtos = listPosts
            .Where(lp => postMap.ContainsKey(lp.PostId))
            .Select(lp => {
                var post = postMap[lp.PostId];
                var dto = _postService.MapToDto(post);
                dto.ListCaption = lp.Caption;
                dto.AddedByUserId = lp.AddedByUserId;
                return dto;
            }).OrderByDescending(d => listPosts.First(lp => lp.PostId == d.Id).AddedAt).ToList();
        
        await _postService.EnrichAndFilterPostsAsync(curatedDtos, userId);
        return curatedDtos;
    }


    public async Task<IEnumerable<ListDto>> GetListsIAmOnAsync(Guid userId)
    {
        var listIds = await _unitOfWork.ListMembers.Query()
            .Where(lm => lm.UserId == userId && lm.Status == 1) // Only accepted members
            .Select(lm => lm.ListId)
            .ToListAsync();

        if (!listIds.Any()) return new List<ListDto>();

        var lists = await _unitOfWork.Lists.Query()
            .Where(l => listIds.Contains(l.Id) && l.IsDeleted != true)
            .Include(l => l.Owner)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var result = new List<ListDto>();
        foreach (var list in lists)
        {
            if (list == null) continue;
            result.Add(await MapToListDto(list, userId));
        }
        return result;
    }

    public async Task<IEnumerable<Guid>> GetUserMembershipsInMyListsAsync(Guid viewerId, string targetActor)
    {
        var targetUser = await GetResolvedUserAsync(targetActor, viewerId);
        if (targetUser == null) return new List<Guid>();

        var myLists = await _unitOfWork.Lists.Query()
            .Where(l => l.OwnerId == viewerId && l.IsDeleted != true)
            .Select(l => l.Id)
            .ToListAsync();

        if (!myLists.Any()) return new List<Guid>();

        return await _unitOfWork.ListMembers.Query()
            .Where(lm => myLists.Contains(lm.ListId) && lm.UserId == targetUser.Id && lm.Status == 1)
            .Select(lm => lm.ListId)
            .ToListAsync();
    }

    public async Task<IEnumerable<PostDto>> GetCandidatePostsAsync(Guid listId, Guid userId, int limit = 10, int offset = 0)
    {
        var existingPostIds = await _unitOfWork.ListPosts.Query()
            .Where(lp => lp.ListId == listId)
            .Select(lp => lp.PostId)
            .ToListAsync();

        var posts = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Where(p => p.AuthorId == userId && !existingPostIds.Contains(p.Id) && (p.IsDeleted == false || p.IsDeleted == null) && p.ReplyToPostId == null)
            .OrderByDescending(p => p.CreatedAt)
            .Skip(offset)
            .Take(limit)
            .ToListAsync();

        return posts.Select(p => _postService.MapToDto(p));
    }

    public async Task<IEnumerable<UserDto>> GetCandidateMembersAsync(Guid listId, Guid userId, string? query)
    {
        try
        {
            // Get existing members - skip if remote list (listId == Guid.Empty)
            Dictionary<Guid, int?> existingMembers = new Dictionary<Guid, int?>();
            
            if (listId != Guid.Empty)
            {
                var membersList = await _unitOfWork.ListMembers.Query()
                    .AsNoTracking()
                    .Where(lm => lm.ListId == listId)
                    .ToListAsync();

                existingMembers = membersList
                    .GroupBy(lm => lm.UserId)
                    .ToDictionary(g => g.Key, g => (int?)g.First().Status);
            }

            // Handle listId == Guid.Empty case (remote list scenario)
            if (listId == Guid.Empty)
            {
                var currentUser = await _userService.GetUserByIdAsync(userId);
                if (currentUser == null) return new List<UserDto>();

                bool isRemoteUser = !string.IsNullOrEmpty(currentUser.Did) && 
                                   !currentUser.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

                // Remote user with no search query - fetch top 5 following from AT Protocol
                if (isRemoteUser && string.IsNullOrWhiteSpace(query))
                {
                    var token = await _userService.GetOrRefreshBlueskyTokenAsync(userId);
                    if (string.IsNullOrWhiteSpace(token))
                    {
                        _logger.LogWarning("[GetCandidateMembersAsync] No auth token available for remote user");
                        // Fall back to recently created users
                        return await GetRecentlyCreatedUsersAsync(userId);
                    }

                    var queryParams = new Dictionary<string, string?>
                    {
                        ["actor"] = currentUser.Did,
                        ["limit"] = "5"
                    };

                    var result = await _xrpcProxy.ProxyRequestAsync(
                        currentUser.Did,
                        "app.bsky.graph.getFollows",
                        queryParams,
                        token,
                        "GET",
                        null,
                        userId
                    );

                    if (!result.Success)
                    {
                        _logger.LogError("[GetCandidateMembersAsync] Failed to fetch follows from AT Protocol: {Content}", result.Content);
                        // Fall back to recently created users
                        return await GetRecentlyCreatedUsersAsync(userId);
                    }

                    // Parse follows array from JSON response
                    using var doc = JsonDocument.Parse(result.Content);
                    var root = doc.RootElement;

                    if (!root.TryGetProperty("follows", out var followsArray))
                    {
                        _logger.LogWarning("[GetCandidateMembersAsync] No follows array in response");
                        // Fall back to recently created users
                        return await GetRecentlyCreatedUsersAsync(userId);
                    }

                    var candidates = new List<UserDto>();
                    var count = 0;

                    foreach (var followItem in followsArray.EnumerateArray())
                    {
                        if (count >= 5) break;

                        var did = followItem.TryGetProperty("did", out var didProp) ? didProp.GetString() : null;
                        if (string.IsNullOrEmpty(did)) continue;

                        var handle = followItem.TryGetProperty("handle", out var handleProp) ? handleProp.GetString() : null;
                        var displayName = followItem.TryGetProperty("displayName", out var displayNameProp) ? displayNameProp.GetString() : null;
                        var avatar = followItem.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : null;
                        var description = followItem.TryGetProperty("description", out var descProp) ? descProp.GetString() : null;

                        // Try to find this user in local database
                        var localUser = await _userService.GetUserByDidAsync(did);
                        
                        if (localUser != null)
                        {
                            // Use local user data
                            candidates.Add(new UserDto(
                                localUser.Id,
                                localUser.Username ?? handle ?? "unknown",
                                localUser.Handle ?? handle ?? "unknown",
                                localUser.Email ?? "",
                                localUser.DisplayName ?? displayName ?? handle,
                                localUser.AvatarUrl ?? avatar,
                                localUser.CoverImageUrl,
                                localUser.Bio ?? description,
                                localUser.Location,
                                localUser.Website,
                                localUser.DateOfBirth,
                                localUser.FollowersCount,
                                localUser.FollowingCount,
                                localUser.PostsCount,
                                localUser.Role ?? "user",
                                null, // Status - not applicable for remote list candidates
                                localUser.IsVerified,
                                localUser.Did
                            ));
                        }
                        else
                        {
                            // Create lightweight UserDto from AT Protocol data
                            candidates.Add(new UserDto(
                                Guid.Empty, // No local ID
                                handle ?? "unknown",
                                handle ?? "unknown",
                                "",
                                displayName ?? handle ?? "unknown",
                                avatar,
                                null, // Cover image
                                description,
                                null, // Location
                                null, // Website
                                null, // DateOfBirth
                                0, // FollowersCount
                                0, // FollowingCount
                                0, // PostsCount
                                "user",
                                null, // Status
                                false, // IsVerified
                                did
                            ));
                        }

                        count++;
                    }

                    // If user follows no one, return recently created users from local DB as fallback
                    if (!candidates.Any())
                    {
                        return await GetRecentlyCreatedUsersAsync(userId);
                    }

                    return candidates;
                }

                // If search query provided, fall back to local database search
                if (!string.IsNullOrWhiteSpace(query))
                {
                    return await SearchLocalUsersAsync(userId, query);
                }

                // Local user or other cases - fall back to recently created users
                return await GetRecentlyCreatedUsersAsync(userId);
            }

            // Original logic for non-empty listId (local lists)
            var currentUserForLocal = await _userService.GetUserByIdAsync(userId);
            if (currentUserForLocal == null) return new List<UserDto>();

            bool isRemoteUserForLocal = !string.IsNullOrEmpty(currentUserForLocal.Did) && 
                               !currentUserForLocal.Did.StartsWith("did:local:", StringComparison.OrdinalIgnoreCase);

            List<User> users;

            if (string.IsNullOrWhiteSpace(query))
            {
                if (isRemoteUserForLocal)
                {
                    // For remote users, fetch following from AT Protocol
                    var (followingUsers, _) = await _userService.GetFollowingAsync(currentUserForLocal.Did, limit: 5, cursor: null, viewerId: userId);
                    users = followingUsers.Take(5).ToList();
                }
                else
                {
                    // For local users, get from database
                    var allFollows = await _unitOfWork.Follows.GetFollowingAsync(userId);
                    users = allFollows
                        .Where(f => f.Following != null)
                        .OrderByDescending(f => f.CreatedAt)
                        .Take(5)
                        .Select(f => f.Following)
                        .ToList();
                }
                
                // If user follows no one, get some suggested users (recent)
                if (!users.Any())
                {
                    users = await _unitOfWork.Users.Query()
                        .Where(u => u.Id != userId && u.IsDeleted != true)
                        .OrderByDescending(u => u.CreatedAt)
                        .Take(5)
                        .ToListAsync();
                }
            }
            else
            {
                // Search
                var lowerQuery = query.ToLower();
                users = await _unitOfWork.Users.Query()
                    .Where(u => u.Id != userId && 
                               ((u.Username != null && u.Username.ToLower().Contains(lowerQuery)) || 
                                (u.DisplayName != null && u.DisplayName.ToLower().Contains(lowerQuery)) ||
                                (u.Handle != null && u.Handle.ToLower().Contains(lowerQuery))))
                    .Take(20)
                    .ToListAsync();
            }

            // Map to DTO with status (null for remote lists since we can't check membership)
            var resultForLocal = new List<UserDto>();
            foreach (var user in users)
            {
                if (user == null) continue;
                int? status = existingMembers.ContainsKey(user.Id) ? existingMembers[user.Id] : null;

                resultForLocal.Add(new UserDto(
                    user.Id,
                    user.Username ?? "unknown",
                    user.Handle ?? "unknown",
                    user.Email ?? "unknown",
                    user.DisplayName,
                    user.AvatarUrl,
                    user.CoverImageUrl,
                    user.Bio,
                    user.Location,
                    user.Website,
                    user.DateOfBirth,
                    user.FollowersCount,
                    user.FollowingCount,
                    user.PostsCount,
                    user.Role ?? "user",
                    status,
                    user.IsVerified,
                    user.Did
                ));
            }
            return resultForLocal;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ListService] GetCandidateMembersAsync Critical Error: {ex}");
            return new List<UserDto>();
        }
    }

    private async Task<IEnumerable<UserDto>> GetRecentlyCreatedUsersAsync(Guid userId)
    {
        var users = await _unitOfWork.Users.Query()
            .Where(u => u.Id != userId && u.IsDeleted != true)
            .OrderByDescending(u => u.CreatedAt)
            .Take(5)
            .ToListAsync();

        return users.Select(u => new UserDto(
            u.Id,
            u.Username ?? "unknown",
            u.Handle ?? "unknown",
            u.Email ?? "",
            u.DisplayName,
            u.AvatarUrl,
            u.CoverImageUrl,
            u.Bio,
            u.Location,
            u.Website,
            u.DateOfBirth,
            u.FollowersCount,
            u.FollowingCount,
            u.PostsCount,
            u.Role ?? "user",
            null, // Status
            u.IsVerified,
            u.Did
        ));
    }

    private async Task<IEnumerable<UserDto>> SearchLocalUsersAsync(Guid userId, string query)
    {
        var lowerQuery = query.ToLower();
        var users = await _unitOfWork.Users.Query()
            .Where(u => u.Id != userId && 
                       ((u.Username != null && u.Username.ToLower().Contains(lowerQuery)) || 
                        (u.DisplayName != null && u.DisplayName.ToLower().Contains(lowerQuery)) ||
                        (u.Handle != null && u.Handle.ToLower().Contains(lowerQuery))))
            .Take(20)
            .ToListAsync();

        return users.Select(u => new UserDto(
            u.Id,
            u.Username ?? "unknown",
            u.Handle ?? "unknown",
            u.Email ?? "",
            u.DisplayName,
            u.AvatarUrl,
            u.CoverImageUrl,
            u.Bio,
            u.Location,
            u.Website,
            u.DateOfBirth,
            u.FollowersCount,
            u.FollowingCount,
            u.PostsCount,
            u.Role ?? "user",
            null, // Status
            u.IsVerified,
            u.Did
        ));
    }

    public async Task<bool> AddPostAsync(Guid userId, Guid listId, Guid postId, string? caption = null)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null) return false;

        // Check if member or owner (any member status allowed)
        bool isMember = await _unitOfWork.ListMembers.Query().AnyAsync(lm => lm.ListId == listId && lm.UserId == userId);
        if (list.OwnerId != userId && !isMember) return false;

        // Check if already added
        var existing = await _unitOfWork.ListPosts.Query()
            .FirstOrDefaultAsync(lp => lp.ListId == listId && lp.PostId == postId);
        if (existing != null) return true;

        var post = await _unitOfWork.Posts.Query().Include(p => p.LinkPreview).FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null || post.AuthorId != userId) return false; // Restriction: Only add your own posts

        // Auto-generate caption if null
        if (string.IsNullOrEmpty(caption))
        {
            if (!string.IsNullOrEmpty(post.Content))
            {
                var sentences = post.Content.Split(new[] { '.', '!', '?' }, StringSplitOptions.RemoveEmptyEntries);
                caption = sentences.FirstOrDefault()?.Trim();
            }
            
            if (string.IsNullOrEmpty(caption) && post.LinkPreview != null)
            {
                caption = post.LinkPreview.Title;
            }

            if (caption != null && caption.Length > 200) caption = caption.Substring(0, 197) + "...";
        }

        var listPost = new ListPost
        {
            ListId = listId,
            PostId = postId,
            AddedByUserId = userId,
            AddedAt = DateTime.UtcNow,
            Caption = caption
        };

        if (!list.IsCurated)
        {
            list.IsCurated = true;
            _unitOfWork.Lists.Update(list);
        }

        await _unitOfWork.ListPosts.AddAsync(listPost);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> RemovePostAsync(Guid userId, Guid listId, Guid postId)
    {
        var lp = await _unitOfWork.ListPosts.Query()
             .FirstOrDefaultAsync(x => x.ListId == listId && x.PostId == postId);
        if (lp == null) return false;
        
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null || (list.OwnerId != userId && lp.AddedByUserId != userId)) return false;

    _unitOfWork.ListPosts.Remove(lp);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> AcceptInvitationAsync(Guid userId, Guid listId)
    {
        var member = await _unitOfWork.ListMembers.Query()
            .FirstOrDefaultAsync(lm => lm.ListId == listId && lm.UserId == userId);
        
        if (member == null) return false;
        if (member.Status == 1) return true; // Already accepted
        if (member.Status != 0) return false;

        member.Status = 1; // Accepted
        member.JoinedAt = DateTime.UtcNow;
        _unitOfWork.ListMembers.Update(member);

        // Mark invitation notification as read
        var notification = await _unitOfWork.Notifications.Query()
            .FirstOrDefaultAsync(n => n.RecipientId == userId && n.ListId == listId && n.Type == "list_invitation");
        if (notification != null) notification.IsRead = true;

        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> RejectInvitationAsync(Guid userId, Guid listId)
    {
        var member = await _unitOfWork.ListMembers.Query()
            .FirstOrDefaultAsync(lm => lm.ListId == listId && lm.UserId == userId);
        
        if (member == null || member.Status != 0) return false;

        member.Status = 2; // Rejected
        _unitOfWork.ListMembers.Update(member);

        // Mark invitation notification as read
        var notification = await _unitOfWork.Notifications.Query()
            .FirstOrDefaultAsync(n => n.RecipientId == userId && n.ListId == listId && n.Type == "list_invitation");
        if (notification != null) notification.IsRead = true;

        return await _unitOfWork.CompleteAsync() > 0;
    }
}
