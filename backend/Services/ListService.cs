using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public class ListService : IListService
{
    private readonly IRepoManager _repoManager;
    private readonly IUserService _userService;

    public ListService(
        IUnitOfWork unitOfWork, 
        Microsoft.AspNetCore.SignalR.IHubContext<BSkyClone.Hubs.ChatHub> hubContext, 
        IPostService postService, 
        IServiceScopeFactory scopeFactory,
        IRepoManager repoManager,
        IUserService userService) 
    {
        _unitOfWork = unitOfWork;
        _hubContext = hubContext;
        _postService = postService;
        _scopeFactory = scopeFactory;
        _repoManager = repoManager;
        _userService = userService;
    }

    public async Task<ListDto> CreateListAsync(Guid userId, CreateListDto dto)
    {
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null || string.IsNullOrEmpty(user.Did)) throw new Exception("User DID not found");

        var rkey = Utilities.ProtocolUtils.GenerateTid();
        var listRecord = new
        {
            name = dto.Name,
            purpose = dto.Purpose ?? "app.bsky.graph.defs#curatelist",
            description = dto.Description,
            avatar = dto.Avatar,
            createdAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        // 1. Create record in Repository
        var cid = await _repoManager.CreateRecordAsync(user.Did, "app.bsky.graph.list", listRecord, rkey);
        var uri = $"at://{user.Did}/app.bsky.graph.list/{rkey}";

        // 2. Mirror to Local Database
        var list = new List
        {
            Id = Guid.NewGuid(), // Keep local ID for relational consistency
            OwnerId = userId,
            Name = dto.Name,
            Description = dto.Description,
            Purpose = listRecord.purpose,
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

    public async Task<IEnumerable<ListDto>> GetMyListsAsync(Guid userId, string? purpose = null)
    {
        var query = _unitOfWork.Lists.Query()
            .Where(l => l.OwnerId == userId && l.IsDeleted != true);

        if (!string.IsNullOrEmpty(purpose))
        {
            query = query.Where(l => l.Purpose == purpose || (purpose == "app.bsky.graph.defs#modlist" && l.Purpose == "mod"));
        }

        var lists = await query
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var result = new List<ListDto>();
        foreach (var list in lists)
        {
            result.Add(await MapToListDto(list, userId));
        }
        return result;
    }

    public async Task<IEnumerable<ListDto>> GetUserListsAsync(Guid userId, Guid viewerId)
    {
        // Lists of another user (or current user)
        var lists = await _unitOfWork.Lists.Query()
            .Where(l => l.OwnerId == userId && l.IsDeleted != true)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync();

        var result = new List<ListDto>();
        foreach (var list in lists)
        {
            if (list == null) continue;
            result.Add(await MapToListDto(list, viewerId));
        }
        return result;
    }

    public async Task<ListDto?> GetListByIdAsync(Guid userId, Guid listId)
    {
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
                var listRecord = new
                {
                    name = list.Name,
                    purpose = list.Purpose ?? "app.bsky.graph.defs#curatelist",
                    description = list.Description,
                    avatar = list.AvatarUrl,
                    createdAt = list.CreatedAt?.ToString("yyyy-MM-ddTHH:mm:ss.fffZ") ?? DateTime.UtcNow.ToString("o")
                };
                
                //putRecord behavior
                var cid = await _repoManager.CreateRecordAsync(user.Did, "app.bsky.graph.list", listRecord, rkey);
                list.Cid = cid;
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
        var rkey = Utilities.ProtocolUtils.GenerateTid();
        var listItemRecord = new
        {
            subject = targetUser.Did,
            list = list.Uri,
            createdAt = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        };

        var cid = await _repoManager.CreateRecordAsync(owner.Did, "app.bsky.graph.listitem", listItemRecord, rkey);
        var uri = $"at://{owner.Did}/app.bsky.graph.listitem/{rkey}";

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
            JoinedAt = lm.JoinedAt ?? DateTime.UtcNow
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

        int membersCount = preMembersCount ?? await _unitOfWork.ListMembers.Query()
            .CountAsync(lm => lm.ListId == list.Id && lm.Status == 1);

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

    public async Task<IEnumerable<Guid>> GetUserMembershipsInMyListsAsync(Guid viewerId, Guid targetUserId)
    {
        var myLists = await _unitOfWork.Lists.Query()
            .Where(l => l.OwnerId == viewerId && l.IsDeleted != true)
            .Select(l => l.Id)
            .ToListAsync();

        if (!myLists.Any()) return new List<Guid>();

        return await _unitOfWork.ListMembers.Query()
            .Where(lm => myLists.Contains(lm.ListId) && lm.UserId == targetUserId && lm.Status == 1)
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
            // Get existing members safely handling potential duplicates or orphaned entries
            var membersList = await _unitOfWork.ListMembers.Query()
                .AsNoTracking()
                .Where(lm => lm.ListId == listId)
                .ToListAsync();

            var existingMembers = membersList
                .GroupBy(lm => lm.UserId)
                .ToDictionary(g => g.Key, g => g.First().Status);

            List<User> users;

            if (string.IsNullOrWhiteSpace(query))
            {
                // Get follows
                var allFollows = await _unitOfWork.Follows.GetFollowingAsync(userId);
                users = allFollows
                    .Where(f => f.Following != null)
                    .OrderByDescending(f => f.CreatedAt)
                    .Take(20)
                    .Select(f => f.Following)
                    .ToList();
                
                // If user follows no one, get some suggested users (recent)
                if (!users.Any())
                {
                    users = await _unitOfWork.Users.Query()
                        .Where(u => u.Id != userId && u.IsDeleted != true)
                        .OrderByDescending(u => u.CreatedAt)
                        .Take(10)
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

            // Map to DTO with status
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
