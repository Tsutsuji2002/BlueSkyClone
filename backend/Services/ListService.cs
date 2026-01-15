using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public class ListService : IListService
{
    private readonly IUnitOfWork _unitOfWork;

    public ListService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
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
            result.Add(await MapToListDto(list, userId));
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
        
        if (existing != null) return true; // Already member

        var member = new ListMember
        {
            ListId = listId,
            UserId = targetUserId,
            JoinedAt = DateTime.UtcNow
        };

        await _unitOfWork.ListMembers.AddAsync(member);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<bool> RemoveMemberAsync(Guid ownerId, Guid listId, Guid targetUserId)
    {
        var list = await _unitOfWork.Lists.GetByIdAsync(listId);
        if (list == null || list.OwnerId != ownerId) return false;

        var existing = await _unitOfWork.ListMembers.Query()
            .FirstOrDefaultAsync(lm => lm.ListId == listId && lm.UserId == targetUserId);

        if (existing == null) return false;

        _unitOfWork.ListMembers.Remove(existing);
        return await _unitOfWork.CompleteAsync() > 0;
    }

    public async Task<IEnumerable<ListItemDto>> GetListMembersAsync(Guid listId)
    {
        var members = await _unitOfWork.ListMembers.Query()
            .Where(lm => lm.ListId == listId)
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
                lm.User.Role
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
            .CountAsync(lm => lm.ListId == list.Id);

        return new ListDto
        {
            Id = list.Id,
            OwnerId = list.OwnerId,
            Name = list.Name,
            Description = list.Description,
            Purpose = list.Purpose,
            AvatarUrl = list.AvatarUrl,
            MembersCount = membersCount,
            CreatedAt = list.CreatedAt ?? DateTime.UtcNow,
            IsPinned = pinned,
            IsOwner = list.OwnerId == currentUserId,
            Owner = new UserDto(
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
                list.Owner.Role
            )
        };
    }

    public async Task<IEnumerable<PostDto>> GetListFeedAsync(Guid userId, Guid listId)
    {
        var memberIds = await _unitOfWork.ListMembers.Query()
            .Where(lm => lm.ListId == listId)
            .Select(lm => lm.UserId)
            .ToListAsync();

        if (!memberIds.Any()) return new List<PostDto>();

        var posts = await _unitOfWork.Posts.Query()
            .Include(p => p.Author)
            .Include(p => p.PostMedia)
            .Include(p => p.LinkPreview)
            .Where(p => memberIds.Contains(p.AuthorId) && (p.IsDeleted == false || p.IsDeleted == null) && p.ReplyToPostId == null)
            .OrderByDescending(p => p.CreatedAt)
            .Take(50)
            .ToListAsync();

        var postDtos = posts.Select(MapToPostDto).ToList();
        await EnrichPostsWithInteractions(postDtos, userId);

        return postDtos;
    }

    // Helper from PostService
    private PostDto MapToPostDto(Post post)
    {
        return new PostDto
        {
            Id = post.Id,
            Tid = post.Tid,
            Content = post.Content,
            CreatedAt = post.CreatedAt.HasValue ? DateTime.SpecifyKind(post.CreatedAt.Value, DateTimeKind.Utc) : null,
            Author = new AuthorDto
            {
                Id = post.Author.Id,
                Username = post.Author.Username,
                Handle = post.Author.Handle,
                DisplayName = post.Author.DisplayName,
                AvatarUrl = post.Author.AvatarUrl,
                IsFollowing = false
            },
            ImageUrls = post.PostMedia.Select(m => m.Url).ToList(),
            LikesCount = post.LikesCount ?? 0,
            RepostsCount = post.RepostsCount ?? 0,
            RepliesCount = post.RepliesCount ?? 0,
            ReplyToPostId = post.ReplyToPostId,
            ReplyToHandle = post.ReplyToPost?.Author?.Handle,
            RootPostId = post.RootPostId,
            IsLiked = false,
            IsBookmarked = false,
            IsReposted = false,
            LinkPreview = post.LinkPreview == null ? null : new LinkPreviewDto
            {
                Url = post.LinkPreview.Url,
                Title = post.LinkPreview.Title,
                Description = post.LinkPreview.Description,
                Image = post.LinkPreview.Image,
                Domain = post.LinkPreview.Domain
            }
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
            post.Author.IsFollowing = followingIds.Contains(post.Author.Id);
        }
    }
}
