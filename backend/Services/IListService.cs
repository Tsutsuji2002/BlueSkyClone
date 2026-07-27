using BSkyClone.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface IListService
{
    Task<ListDto> CreateListAsync(Guid userId, CreateListDto dto);
    Task<IEnumerable<ListDto>> GetMyListsAsync(Guid userId, string? purpose = null);
    Task<IEnumerable<ListDto>> GetUserListsAsync(string actor, Guid? viewerId);
    Task<ListDto?> GetListByIdAsync(Guid userId, Guid listId);
    Task<ListDto> UpdateListAsync(Guid userId, Guid listId, UpdateListDto dto);
    Task<bool> DeleteListAsync(Guid userId, Guid listId); // Only owner
    Task<bool> DeleteListByIdOrUriAsync(Guid userId, string listIdOrUri);
    Task<ListDto> UpdateListByIdOrUriAsync(Guid userId, string listIdOrUri, UpdateListDto dto);
    
    // Members
    Task<bool> AddMemberByIdOrUriAsync(Guid ownerId, string listIdOrUri, Guid targetUserId);
    Task<bool> AddMemberAsync(Guid ownerId, Guid listId, Guid targetUserId);
    Task<bool> RemoveMemberAsync(Guid requestingUserId, Guid listId, Guid targetUserId);
    Task<bool> RemoveMemberByIdOrUriAsync(Guid requestingUserId, string listIdOrUri, Guid targetUserId);
    Task<IEnumerable<ListItemDto>> GetListMembersAsync(Guid listId);
    Task<IEnumerable<ListItemDto>> GetListMembersByIdOrUriAsync(string listIdOrUri, Guid? viewerId = null);
    Task<bool> AcceptInvitationAsync(Guid userId, Guid listId);
    Task<bool> RejectInvitationAsync(Guid userId, Guid listId);
    
    // Pinning / Subscribing
    Task<bool> PinListAsync(Guid userId, Guid listId);
    Task<bool> UnpinListAsync(Guid userId, Guid listId);
    Task<IEnumerable<ListDto>> GetPinnedListsAsync(Guid userId, string? purpose = null);
    Task<IEnumerable<PostDto>> GetListFeedAsync(Guid userId, Guid listId, int limit = 50, int offset = 0); 

    Task<IEnumerable<ListDto>> GetListsIAmOnAsync(Guid userId);
    Task<IEnumerable<Guid>> GetUserMembershipsInMyListsAsync(Guid viewerId, string targetActor);
    Task<IEnumerable<UserDto>> GetCandidateMembersAsync(Guid listId, Guid userId, string? query);
    Task<IEnumerable<PostDto>> GetCandidatePostsAsync(Guid listId, Guid userId, int limit = 10, int offset = 0);

    // List Posts
    Task<bool> AddPostAsync(Guid userId, Guid listId, Guid postId, string? caption = null);
    Task<bool> RemovePostAsync(Guid userId, Guid listId, Guid postId);
}
