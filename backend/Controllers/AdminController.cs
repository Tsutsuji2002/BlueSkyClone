using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "admin")]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;

    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var stats = await _adminService.GetStatsAsync();
        return Ok(stats);
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetUsersAsync(skip, take, search);
        return Ok(result);
    }

    [HttpPost("users/{id}/ban")]
    public async Task<IActionResult> BanUser(Guid id)
    {
        var success = await _adminService.BanUserAsync(id);
        if (!success) return NotFound(new { message = "User not found" });
        return Ok(new { message = "User banned successfully" });
    }

    [HttpPost("users/{id}/unban")]
    public async Task<IActionResult> UnbanUser(Guid id)
    {
        var success = await _adminService.UnbanUserAsync(id);
        if (!success) return NotFound(new { message = "User not found" });
        return Ok(new { message = "User unbanned successfully" });
    }

    [HttpPost("users/{id}/verify")]
    public async Task<IActionResult> ToggleVerify(Guid id)
    {
        var success = await _adminService.ToggleVerifyUserAsync(id);
        if (!success) return NotFound(new { message = "User not found" });
        return Ok(new { message = "User verification toggled successfully" });
    }

    [HttpPatch("users/{id}/role")]
    public async Task<IActionResult> ChangeRole(Guid id, [FromBody] ChangeRoleRequest request)
    {
        var success = await _adminService.ChangeUserRoleAsync(id, request.Role);
        if (!success) return BadRequest(new { message = "Invalid role or user not found" });
        return Ok(new { message = "User role updated successfully" });
    }

    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null, [FromQuery] bool includeDeleted = false, [FromQuery] bool onlyDeleted = false)
    {
        var result = await _adminService.GetPostsAsync(skip, take, search, includeDeleted, onlyDeleted);
        return Ok(result);
    }

    [HttpPost("posts/{id}/hide")]
    public async Task<IActionResult> HidePost(Guid id)
    {
        var success = await _adminService.HidePostAsync(id);
        if (!success) return NotFound(new { message = "Post not found" });
        return Ok(new { message = "Post hidden successfully" });
    }

    [HttpDelete("posts/{id}/permanent")]
    public async Task<IActionResult> DeletePostPermanent(Guid id)
    {
        var success = await _adminService.DeletePostPermanentAsync(id);
        if (!success) return NotFound(new { message = "Post not found" });
        return Ok(new { message = "Post permanently deleted" });
    }

    [HttpDelete("posts/{id}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var success = await _adminService.DeletePostAsync(id);
        if (!success) return NotFound(new { message = "Post not found" });
        return Ok(new { message = "Post deleted successfully" });
    }

    [HttpGet("feeds")]
    public async Task<IActionResult> GetFeeds([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetFeedsAsync(skip, take, search);
        return Ok(result);
    }

    [HttpGet("feeds/{id}/subscribers")]
    public async Task<IActionResult> GetFeedSubscribers(Guid id, [FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetFeedSubscribersAsync(id, skip, take, search);
        return Ok(result);
    }

    [HttpDelete("feeds/{id}")]
    public async Task<IActionResult> DeleteFeed(Guid id)
    {
        var success = await _adminService.DeleteFeedAsync(id);
        if (!success) return NotFound(new { message = "Feed not found" });
        return Ok(new { message = "Feed deleted successfully" });
    }

    [HttpPost("feeds")]
    public async Task<IActionResult> CreateFeed([FromBody] CreateFeedRequest request)
    {
        var result = await _adminService.CreateFeedAsync(request);
        if (result == null) return BadRequest(new { message = "Feed creation failed" });
        return Ok(result);
    }

    [HttpPut("feeds/{id}")]
    public async Task<IActionResult> UpdateFeed(Guid id, [FromBody] UpdateFeedRequest request)
    {
        var result = await _adminService.UpdateFeedAsync(id, request);
        if (result == null) return NotFound(new { message = "Feed not found" });
        return Ok(result);
    }

    // ── Interests Management ──

    [HttpGet("interests")]
    public async Task<IActionResult> GetInterests([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetInterestsAsync(skip, take, search);
        return Ok(result);
    }

    [HttpGet("interests/{interest}/users")]
    public async Task<IActionResult> GetInterestUsers(string interest, [FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        // Decode interest name if needed, but FromRoute usually handles it.
        // Might need handling for special chars if interest is a tag.
        var result = await _adminService.GetInterestUsersAsync(interest, skip, take, search);
        return Ok(result);
    }

    [HttpDelete("interests/{interest}")]
    public async Task<IActionResult> DeleteInterest(string interest)
    {
        var success = await _adminService.DeleteInterestAsync(interest);
        if (!success) return NotFound(new { message = "Interest not found" });
        return Ok(new { message = "Interest deleted successfully" });
    }

    // ── Lists Management ──

    [HttpGet("lists")]
    public async Task<IActionResult> GetLists([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetListsAsync(skip, take, search);
        return Ok(result);
    }

    [HttpDelete("lists/{id}")]
    public async Task<IActionResult> DeleteList(Guid id)
    {
        var success = await _adminService.DeleteListAsync(id);
        if (!success) return NotFound(new { message = "List not found" });
        return Ok(new { message = "List deleted successfully" });
    }

    [HttpGet("lists/{id}/members")]
    public async Task<IActionResult> GetListMembers(Guid id, [FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetListMembersAsync(id, skip, take, search);
        return Ok(result);
    }

    // ── Conversations Management ──

    [HttpGet("conversations")]
    public async Task<IActionResult> GetConversations([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetConversationsAsync(skip, take, search);
        return Ok(result);
    }

    [HttpDelete("conversations/{id}")]
    public async Task<IActionResult> DeleteConversation(Guid id)
    {
        var success = await _adminService.DeleteConversationAsync(id);
        if (!success) return NotFound(new { message = "Conversation not found" });
        return Ok(new { message = "Conversation deleted successfully" });
    }

    // ── Moderation ──

    [HttpGet("moderation/blocks")]
    public async Task<IActionResult> GetBlocks([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetBlocksAsync(skip, take, search);
        return Ok(result);
    }

    [HttpGet("moderation/mutes")]
    public async Task<IActionResult> GetMutes([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetMutesAsync(skip, take, search);
        return Ok(result);
    }

    // ── Hashtags Management ──

    [HttpGet("hashtags")]
    public async Task<IActionResult> GetHashtags([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetHashtagsAsync(skip, take, search);
        return Ok(result);
    }

    [HttpDelete("hashtags/{id}")]
    public async Task<IActionResult> DeleteHashtag(int id)
    {
        var success = await _adminService.DeleteHashtagAsync(id);
        if (!success) return NotFound(new { message = "Hashtag not found" });
        return Ok(new { message = "Hashtag deleted successfully" });
    }

    // ── Notifications ──

    [HttpPost("notifications/broadcast")]
    public async Task<IActionResult> BroadcastNotification([FromBody] BroadcastNotificationRequest request)
    {
        var success = await _adminService.BroadcastNotificationAsync(request);
        if (!success) return Ok(new { message = "No matching users were found for this broadcast." });
        return Ok(new { message = "Notification broadcasted successfully" });
    }
    [HttpPost("system/reindex")]
    public async Task<IActionResult> ReindexSystem()
    {
        await _adminService.ReindexSystemAsync();
        return Ok(new { message = "Reindexing started in the background" });
    }
}
