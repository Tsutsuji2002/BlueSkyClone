using BSkyClone.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BSkyClone.Services;

public interface IListService
{
    Task<ListDto> CreateListAsync(Guid userId, CreateListDto dto);
    Task<IEnumerable<ListDto>> GetMyListsAsync(Guid userId);
    Task<ListDto?> GetListByIdAsync(Guid userId, Guid listId);
    Task<ListDto> UpdateListAsync(Guid userId, Guid listId, UpdateListDto dto);
    Task<bool> DeleteListAsync(Guid userId, Guid listId); // Only owner
    
    // Members
    Task<bool> AddMemberAsync(Guid ownerId, Guid listId, Guid targetUserId);
    Task<bool> RemoveMemberAsync(Guid ownerId, Guid listId, Guid targetUserId);
    Task<IEnumerable<ListItemDto>> GetListMembersAsync(Guid listId);
    
    // Pinning / Subscribing
    Task<bool> PinListAsync(Guid userId, Guid listId);
    Task<bool> UnpinListAsync(Guid userId, Guid listId);
    Task<IEnumerable<ListDto>> GetPinnedListsAsync(Guid userId);
    Task<IEnumerable<PostDto>> GetListFeedAsync(Guid userId, Guid listId); // New
}
