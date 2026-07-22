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

        // For remote users, skip avatar for now (it needs to be uploaded as a blob first)
        // For local users, we can store the URL directly
        if (!isRemoteUser && !string.IsNullOrEmpty(dto.Avatar))
        {
            listRecord["avatar"] = dto.Avatar;
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

            // Build the complete JSON body as a string first to ensure proper serialization
            var requestBodyJson = $@"{{
  ""repo"": ""{user.Did}"",
  ""collection"": ""app.bsky.graph.list"",
  ""rkey"": ""{rkey}"",
  ""record"": {{
    ""$type"": ""app.bsky.graph.list"",
    ""name"": {JsonSerializer.Serialize(dto.Name)},
    ""purpose"": {JsonSerializer.Serialize(dto.Purpose ?? "app.bsky.graph.defs#curatelist")},
    ""description"": {JsonSerializer.Serialize(dto.Description ?? "")},
    ""createdAt"": ""{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ss.fffZ}""
  }}
}}";

            // Log the request body for debugging
            _logger.LogInformation("[CreateList] ===== REQUEST BODY (raw JSON string) =====");
            _logger.LogInformation(requestBodyJson);
            _logger.LogInformation("[CreateList] ===== END REQUEST =====");

            // Parse to object for the proxy (it will re-serialize)
            var requestBody = JsonSerializer.Deserialize<object>(requestBodyJson);

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
            AvatarUrl = null, // No avatar for now
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
                        AvatarUrl = listItem.TryGetProperty("avatar", out var avatarProp) ? avatarProp.GetString() : null,
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

    // Members

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

            List<User> users;

            if (string.IsNullOrWhiteSpace(query))
            {
                // Get top 5 follows (matching group chat creation pattern)
                var allFollows = await _unitOfWork.Follows.GetFollowingAsync(userId);
                users = allFollows
                    .Where(f => f.Following != null)
                    .OrderByDescending(f => f.CreatedAt)
                    .Take(5)
                    .Select(f => f.Following)
                    .ToList();
                
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
            var result = new List<UserDto>();
            foreach (var user in users)
            {
                if (user == null) continue;
                int? status = existingMembers.ContainsKey(user.Id) ? existingMembers[user.Id] : null;

                result.Add(new UserDto(
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
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ListService] GetCandidateMembersAsync Critical Error: {ex}");
            return new List<UserDto>();
        }
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
