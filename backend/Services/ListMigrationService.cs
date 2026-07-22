using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace BSkyClone.Services;

/// <summary>
/// Service for cleaning up old local list data for remote AT Protocol users.
/// Remote users should have their lists stored entirely on their PDS, not in local database.
/// </summary>
public class ListMigrationService
{
    private readonly IUnitOfWork _unitOfWork;

    public ListMigrationService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Removes all local list records where the owner is a remote user (DID doesn't start with "did:local:").
    /// This includes the list records, list members, list subscriptions, and list posts.
    /// </summary>
    public async Task<int> CleanupRemoteUserListsAsync()
    {
        int totalRemoved = 0;

        // 1. Find all lists owned by remote users
        var remoteLists = await _unitOfWork.Lists.Query()
            .Include(l => l.Owner)
            .Where(l => l.Owner != null 
                && l.Owner.Did != null 
                && !l.Owner.Did.StartsWith("did:local:"))
            .ToListAsync();

        if (!remoteLists.Any())
        {
            return 0; // No remote user lists found
        }

        var remoteListIds = remoteLists.Select(l => l.Id).ToList();

        // 2. Delete list members for these lists
        var listMembers = await _unitOfWork.ListMembers.Query()
            .Where(lm => remoteListIds.Contains(lm.ListId))
            .ToListAsync();
        
        foreach (var member in listMembers)
        {
            _unitOfWork.ListMembers.Remove(member);
        }
        totalRemoved += listMembers.Count;

        // 3. Delete list subscriptions for these lists
        var listSubscriptions = await _unitOfWork.UserListSubscriptions.Query()
            .Where(uls => remoteListIds.Contains(uls.ListId))
            .ToListAsync();
        
        foreach (var subscription in listSubscriptions)
        {
            _unitOfWork.UserListSubscriptions.Remove(subscription);
        }
        totalRemoved += listSubscriptions.Count;

        // 4. Delete list posts for these lists
        var listPosts = await _unitOfWork.ListPosts.Query()
            .Where(lp => remoteListIds.Contains(lp.ListId))
            .ToListAsync();
        
        foreach (var listPost in listPosts)
        {
            _unitOfWork.ListPosts.Remove(listPost);
        }
        totalRemoved += listPosts.Count;

        // 5. Finally, delete the lists themselves
        foreach (var list in remoteLists)
        {
            _unitOfWork.Lists.Remove(list);
        }
        totalRemoved += remoteLists.Count;

        // Commit all changes
        await _unitOfWork.CompleteAsync();

        return totalRemoved;
    }

    /// <summary>
    /// Gets statistics about lists that would be cleaned up (without actually deleting them).
    /// Useful for preview before running the cleanup.
    /// </summary>
    public async Task<ListMigrationStats> GetCleanupStatsAsync()
    {
        var remoteLists = await _unitOfWork.Lists.Query()
            .Include(l => l.Owner)
            .Where(l => l.Owner != null 
                && l.Owner.Did != null 
                && !l.Owner.Did.StartsWith("did:local:"))
            .ToListAsync();

        if (!remoteLists.Any())
        {
            return new ListMigrationStats();
        }

        var remoteListIds = remoteLists.Select(l => l.Id).ToList();

        var memberCount = await _unitOfWork.ListMembers.Query()
            .CountAsync(lm => remoteListIds.Contains(lm.ListId));

        var subscriptionCount = await _unitOfWork.UserListSubscriptions.Query()
            .CountAsync(uls => remoteListIds.Contains(uls.ListId));

        var postCount = await _unitOfWork.ListPosts.Query()
            .CountAsync(lp => remoteListIds.Contains(lp.ListId));

        return new ListMigrationStats
        {
            ListsToRemove = remoteLists.Count,
            MembersToRemove = memberCount,
            SubscriptionsToRemove = subscriptionCount,
            PostsToRemove = postCount,
            TotalRecordsToRemove = remoteLists.Count + memberCount + subscriptionCount + postCount
        };
    }
}

public class ListMigrationStats
{
    public int ListsToRemove { get; set; }
    public int MembersToRemove { get; set; }
    public int SubscriptionsToRemove { get; set; }
    public int PostsToRemove { get; set; }
    public int TotalRecordsToRemove { get; set; }
}
