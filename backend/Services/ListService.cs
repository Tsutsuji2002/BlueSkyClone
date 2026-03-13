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
    private readonly IUnitOfWork _unitOfWork;
    private readonly Microsoft.AspNetCore.SignalR.IHubContext<BSkyClone.Hubs.ChatHub> _hubContext;

    public ListService(IUnitOfWork unitOfWork, Microsoft.AspNetCore.SignalR.IHubContext<BSkyClone.Hubs.ChatHub> hubContext)
    {
        _unitOfWork = unitOfWork;
        _hubContext = hubContext;
    }

    public async Task<ListDto> CreateListAsync(Guid userId, CreateListDto dto)
    {
        var list = new List
        {
            Id = Guid.NewGuid(),
            OwnerId = userId,
            Name = dto.Name,
            Description = dto.Description,
            Purpose = dto.Purpose,
            AvatarUrl = dto.Avatar,
            CreatedAt = DateTime.UtcNow,
            IsDeleted = false
        };

        await _unitOfWork.Lists.AddAsync(list);
        await _unitOfWork.CompleteAsync();

        return await MapToListDto(list, userId);
    }

    public async Task<IEnumerable<ListDto>> GetMyListsAsync(Guid userId)
    {
        var lists = await _unitOfWork.Lists.Query()
            .Where(l => l.OwnerId == userId && l.IsDeleted != true)
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

        _unitOfWork.Lists.Update(list);
        await _unitOfWork.CompleteAsync();

        return await MapToListDto(list, userId);
    }

    public async Task<bool> DeleteListAsync(Guid userId, Guid listId)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null || list.OwnerId != userId) return false;

        list.IsDeleted = true; // Soft delete
        _unitOfWork.Lists.Update(list);
        await _unitOfWork.CompleteAsync();
        return true;
    }

    // Members

    public async Task<bool> AddMemberAsync(Guid ownerId, Guid listId, Guid targetUserId)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null || list.OwnerId != ownerId) return false;

        var existing = await _unitOfWork.ListMembers.Query()
            .FirstOrDefaultAsync(lm => lm.ListId == listId && lm.UserId == targetUserId);
        
        if (existing != null) 
        {
            if (existing.Status == 1) return true; // Already member
            
            // Set to accepted (1) by default for better UI responsiveness in current build
            existing.Status = 1;
            existing.JoinedAt = DateTime.UtcNow;
            _unitOfWork.ListMembers.Update(existing);
        }
        else
        {
            var member = new ListMember
            {
                ListId = listId,
                UserId = targetUserId,
                JoinedAt = DateTime.UtcNow,
                Status = 1 // Accepted by default for immediate feedback
            };
            await _unitOfWork.ListMembers.AddAsync(member);
        }

        // Check if a pending notification already exists to avoid spamming
        var existingNotification = await _unitOfWork.Notifications.Query()
            .FirstOrDefaultAsync(n => n.RecipientId == targetUserId && n.ListId == listId && n.Type == "list_invitation" && n.IsRead == false);
        
        if (existingNotification != null) return true;

        // Send Notification
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            Tid = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
            Type = "list_invitation",
            RecipientId = targetUserId,
            SenderId = ownerId,
            ListId = listId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow,
            Title = "List Invitation",
            Content = $"invited you to join the list: {list.Name}"
        };

        await _unitOfWork.Notifications.AddAsync(notification);
        var success = await _unitOfWork.CompleteAsync() > 0;

        if (success)
        {
            // Real-time SignalR notification
            _ = Task.Run(async () => {
                try {
                    var sender = await _unitOfWork.Users.GetByIdAsync(ownerId);
                    if (sender != null) {
                        await _hubContext.Clients.Group($"user-{targetUserId}").SendAsync("ReceiveNotification", new {
                            Id = notification.Id,
                            Type = notification.Type,
                            Sender = new { sender.Id, sender.Username, sender.Handle, sender.AvatarUrl, sender.DisplayName, sender.IsVerified, sender.Did },
                            ListId = notification.ListId,
                            CreatedAt = notification.CreatedAt,
                            Title = notification.Title,
                            Content = notification.Content,
                            IsRead = false,
                            InvitationStatus = 0
                        });
                    }
                } catch { }
            });
        }

        return success;
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

        _unitOfWork.ListMembers.Remove(existing);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<IEnumerable<ListItemDto>> GetListMembersAsync(Guid listId)
    {
        var members = await _unitOfWork.ListMembers.Query()
            .Where(lm => lm.ListId == listId && (lm.Status == 1 || lm.Status == 0)) // Show accepted and pending for responsiveness
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

    public async Task<IEnumerable<ListDto>> GetPinnedListsAsync(Guid userId)
    {
        var pinned = await _unitOfWork.UserListSubscriptions.Query()
            .Where(uls => uls.UserId == userId)
            .Include(uls => uls.List)
            .ThenInclude(l => l.Owner)
            .OrderBy(uls => uls.PinnedOrder)
            .ToListAsync();

        var result = new List<ListDto>();
        foreach (var item in pinned)
        {
            if (item.List != null && item.List.IsDeleted != true)
            {
                result.Add(await MapToListDto(item.List, userId, true));
            }
        }
        return result;
    }

    // Helper
    private async Task<ListDto> MapToListDto(List list, Guid currentUserId, bool? isPinned = null)
    {
        // Populate owner if missing (e.g. from AddAsync)
        if (list.Owner == null)
        {
             list.Owner = await _unitOfWork.Users.GetByIdAsync(list.OwnerId) ?? new User();
        }

        bool pinned = isPinned ?? await _unitOfWork.UserListSubscriptions.Query()
            .AnyAsync(uls => uls.UserId == currentUserId && uls.ListId == list.Id);

        int membersCount = await _unitOfWork.ListMembers.Query()
            .CountAsync(lm => lm.ListId == list.Id && lm.Status == 1);

        int postsCount = await _unitOfWork.ListPosts.Query()
            .CountAsync(lp => lp.ListId == list.Id);

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
        try
        {
            Console.WriteLine($"[ListService] Fetching feed for list {listId} (requested by {userId})");
            var list = await _unitOfWork.Lists.GetByIdAsync(listId);
            if (list == null) 
            {
                Console.WriteLine($"[ListService] List {listId} not found");
                return new List<PostDto>();
            }

            var listPosts = await _unitOfWork.ListPosts.Query()
                .AsNoTracking()
                .Include(lp => lp.Post).ThenInclude(p => p.Author)
                .Include(lp => lp.Post).ThenInclude(p => p.PostMedia)
                .Include(lp => lp.Post).ThenInclude(p => p.LinkPreview)
                .Include(lp => lp.Post).ThenInclude(p => p.ReplyToPost).ThenInclude(rp => rp!.Author)
                .Include(lp => lp.Post).ThenInclude(p => p.ReplyToPost).ThenInclude(rp => rp!.PostMedia)
                .Include(lp => lp.Post).ThenInclude(p => p.ReplyToPost).ThenInclude(rp => rp!.LinkPreview)
                .Include(lp => lp.Post).ThenInclude(p => p.QuotePost).ThenInclude(qp => qp!.Author)
                .Include(lp => lp.Post).ThenInclude(p => p.QuotePost).ThenInclude(qp => qp!.PostMedia)
                .Include(lp => lp.Post).ThenInclude(p => p.QuotePost).ThenInclude(qp => qp!.LinkPreview)
                .Where(lp => lp.ListId == listId)
                .OrderByDescending(lp => lp.AddedAt)
                .Skip(offset)
                .Take(limit)
                .ToListAsync();

            var curatedDtos = new List<PostDto>();
            foreach(var lp in listPosts)
            {
                if (lp.Post == null) continue;
                try 
                {
                    var dto = MapToPostDto(lp.Post);
                    dto.ListCaption = lp.Caption;
                    dto.AddedByUserId = lp.AddedByUserId;
                    curatedDtos.Add(dto);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[ListService] Error mapping post {lp.PostId}: {ex.Message}");
                }
            }

            if (curatedDtos.Any())
            {
                await EnrichPostsWithInteractions(curatedDtos, userId);
            }
            return curatedDtos;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ListService] GetListFeedAsync Critical Error: {ex}");
            return new List<PostDto>();
        }
    }

    // Helper from PostService
    private PostDto MapToPostDto(Post post) => MapToPostDto(post, true, true);

    private PostDto MapToPostDto(Post post, bool includeQuote, bool includeParent)
    {
        if (post == null) return new PostDto { Author = new AuthorDto { Username = "unknown", Handle = "unknown" } };

        return new PostDto
        {
            Id = post.Id,
            Tid = post.Tid ?? "",
            Content = post.Content,
            CreatedAt = post.CreatedAt.HasValue ? DateTime.SpecifyKind(post.CreatedAt.Value, DateTimeKind.Utc) : null,
            Author = post.Author == null ? new AuthorDto { Id = post.AuthorId, Username = "unknown", Handle = "unknown" } : new AuthorDto
            {
                Id = post.Author.Id,
                Username = post.Author.Username ?? "unknown",
                Handle = post.Author.Handle ?? "unknown",
                DisplayName = post.Author.DisplayName,
                AvatarUrl = post.Author.AvatarUrl,
                IsFollowing = false,
                IsVerified = post.Author.IsVerified,
                Did = post.Author.Did
            },
            ImageUrls = post.PostMedia?.Where(m => m.Type == "image").Select(m => m.Url).ToList() ?? new List<string>(),
            Media = post.PostMedia?.OrderBy(m => m.Position ?? 0).Select(m => new MediaDto
            {
                Url = m.Url,
                AltText = m.AltText,
                Type = m.Type
            }).ToList() ?? new List<MediaDto>(),
            VideoUrl = post.PostMedia?.FirstOrDefault(m => m.Type == "video")?.Url,
            LikesCount = post.LikesCount ?? 0,
            RepostsCount = post.RepostsCount ?? 0,
            RepliesCount = post.RepliesCount ?? 0,
            QuotesCount = post.QuotesCount ?? 0,
            BookmarksCount = post.BookmarksCount ?? 0,
            ReplyToPostId = post.ReplyToPostId,
            ReplyToHandle = post.ReplyToPost?.Author?.Handle,
            RootPostId = post.RootPostId,
            IsLiked = false,
            IsBookmarked = false,
            IsReposted = false,
            LinkPreview = post.LinkPreview == null ? null : new LinkPreviewDto
            {
                Url = post.LinkPreview.Url ?? "",
                Title = post.LinkPreview.Title,
                Description = post.LinkPreview.Description,
                Image = post.LinkPreview.Image,
                Domain = post.LinkPreview.Domain
            },
            QuotePostId = post.QuotePostId,
            QuotePost = (includeQuote && post.QuotePost != null) ? MapToPostDto(post.QuotePost, false, false) : null,
            ParentPost = (includeParent && post.ReplyToPost != null) ? MapToPostDto(post.ReplyToPost, false, false) : null,
            IsDeleted = post.IsDeleted ?? false,
            CanReply = true,
            Uri = !string.IsNullOrEmpty(post.Author?.Did) && !string.IsNullOrEmpty(post.Tid)
                ? $"at://{post.Author.Did}/app.bsky.feed.post/{post.Tid}"
                : $"at://local/app.bsky.feed.post/{post.Id}",
            Cid = post.Id.ToString()
        };
    }

    private async Task EnrichPostsWithInteractions(List<PostDto> posts, Guid viewerId)
    {
        if (!posts.Any()) return;

        var postIds = posts.Select(p => p.Id).ToList();

        var likedPostIds = await _unitOfWork.Likes.Query()
            .Where(l => l.UserId == viewerId && postIds.Contains(l.PostId))
            .Select(l => l.PostId)
            .ToListAsync();

        var bookmarkedPostIds = await _unitOfWork.Bookmarks.Query()
            .Where(b => b.UserId == viewerId && postIds.Contains(b.PostId))
            .Select(b => b.PostId)
            .ToListAsync();

        var repostedPostIds = await _unitOfWork.Reposts.Query()
            .Where(r => r.UserId == viewerId && postIds.Contains(r.PostId))
            .Select(r => r.PostId)
            .ToListAsync();

        var followedUserIds = await _unitOfWork.Follows.GetFollowingAsync(viewerId); 
             
        var followingIds = followedUserIds.Select(f => f.FollowingId).ToHashSet();

        foreach (var post in posts)
        {
            post.IsLiked = likedPostIds.Contains(post.Id);
            post.IsBookmarked = bookmarkedPostIds.Contains(post.Id);
            post.IsReposted = repostedPostIds.Contains(post.Id);
            if (post.Author != null)
            {
                post.Author.IsFollowing = followingIds.Contains(post.Author.Id);
            }
        }
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

        return posts.Select(MapToPostDto);
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

        // Check if member or owner
        bool isMember = await _unitOfWork.ListMembers.Query().AnyAsync(lm => lm.ListId == listId && lm.UserId == userId);
        if (list.OwnerId != userId && !isMember) return false;

        // Check if already added
        var existing = await _unitOfWork.ListPosts.Query()
            .FirstOrDefaultAsync(lp => lp.ListId == listId && lp.PostId == postId);
        if (existing != null) return true;

        var post = await _unitOfWork.Posts.Query().Include(p => p.LinkPreview).FirstOrDefaultAsync(p => p.Id == postId);
        if (post == null) return false;
        // RELAXED: Allow adding any post to curate a list, not just your own

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
