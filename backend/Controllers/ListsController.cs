using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ListsController : ControllerBase
{
    private readonly IListService _listService;

    public ListsController(IListService listService)
    {
        _listService = listService;
    }

    private Guid? GetUserId()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (userIdStr != null && Guid.TryParse(userIdStr, out Guid userId))
        {
            return userId;
        }
        return null;
    }

    [HttpPost]
    public async Task<IActionResult> CreateList([FromBody] CreateListDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var list = await _listService.CreateListAsync(userId.Value, dto);
        return Ok(list);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyLists([FromQuery] string? purpose = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var lists = await _listService.GetMyListsAsync(userId.Value, purpose);
        return Ok(lists);
    }

    [HttpGet("member")]
    public async Task<IActionResult> GetListsIAmOn()
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var lists = await _listService.GetListsIAmOnAsync(userId.Value);
        return Ok(lists);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserLists(Guid userId)
    {
        var viewerId = GetUserId();
        if (viewerId == null) return Unauthorized();
        var lists = await _listService.GetUserListsAsync(userId, viewerId.Value);
        return Ok(lists);
    }

    [HttpGet("memberships/{targetUserId}")]
    public async Task<IActionResult> GetUserMembershipsInMyLists(Guid targetUserId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var memberships = await _listService.GetUserMembershipsInMyListsAsync(userId.Value, targetUserId);
        return Ok(memberships);
    }

    [HttpGet("pinned")]
    public async Task<IActionResult> GetPinnedLists([FromQuery] string? purpose = null)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var lists = await _listService.GetPinnedListsAsync(userId.Value, purpose);
        return Ok(lists);
    }

    [AllowAnonymous]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetList(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var list = await _listService.GetListByIdAsync(userId.Value, id);
        if (list == null) return NotFound();
        return Ok(list);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateList(Guid id, [FromBody] UpdateListDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        try
        {
            var list = await _listService.UpdateListAsync(userId.Value, id, dto);
            return Ok(list);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteList(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var success = await _listService.DeleteListAsync(userId.Value, id);
        if (!success) return BadRequest("Failed to delete list or not owner");
        return Ok();
    }

    [HttpPost("{id}/pin")]
    public async Task<IActionResult> PinList(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var success = await _listService.PinListAsync(userId.Value, id);
        return success ? Ok() : BadRequest();
    }

    [HttpPost("{id}/unpin")]
    public async Task<IActionResult> UnpinList(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var success = await _listService.UnpinListAsync(userId.Value, id);
        return success ? Ok() : BadRequest();
    }

    [AllowAnonymous]
    [HttpGet("{id}/feed")]
    public async Task<IActionResult> GetListFeed(Guid id, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        try
        {
            var userId = GetUserId();
            var posts = await _listService.GetListFeedAsync(userId ?? Guid.Empty, id, limit, offset);
            return Ok(posts);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ListsController] GetListFeed Exception: {ex.ToString()}");
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(Guid id)
    {
        var members = await _listService.GetListMembersAsync(id);
        return Ok(members);
    }

    [HttpGet("{id}/candidates")]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetCandidateMembers(Guid id, [FromQuery] string? q)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized();
            var candidates = await _listService.GetCandidateMembersAsync(id, userId.Value, q);
            return Ok(candidates);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = "InternalError", message = ex.Message });
        }
    }

    [HttpGet("{id}/candidate-posts")]
    public async Task<IActionResult> GetCandidatePosts(Guid id, [FromQuery] Guid? userId, [FromQuery] int limit = 10, [FromQuery] int offset = 0)
    {
        var myUserId = GetUserId();
        if (myUserId == null) return Unauthorized();
        var posts = await _listService.GetCandidatePostsAsync(id, userId ?? myUserId.Value, limit, offset);
        return Ok(posts);
    }

    [HttpPost("{id}/posts")]
    public async Task<IActionResult> AddPost(Guid id, [FromBody] AddListPostRequest dto)
    {
        var userId = GetUserId(); // Retained original GetUserId() call
        if (userId == null) return Unauthorized();
        var success = await _listService.AddPostAsync(userId.Value, id, dto.PostId, dto.Caption);
        if (!success) return BadRequest("Failed to add post");
        return Ok();
    }

    [HttpDelete("{id}/posts/{postId}")]
    public async Task<IActionResult> RemovePost(Guid id, Guid postId)
    {
        var userId = GetUserId(); // Retained original GetUserId() call
        if (userId == null) return Unauthorized();
        var success = await _listService.RemovePostAsync(userId.Value, id, postId);
        if (!success) return BadRequest("Failed to remove post");
        return Ok();
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddListMemberDto dto)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var success = await _listService.AddMemberAsync(userId.Value, id, dto.UserId);
        return success ? Ok() : BadRequest("Failed to add member");
    }

    [HttpDelete("{id}/members/{targetId}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid targetId)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var success = await _listService.RemoveMemberAsync(userId.Value, id, targetId);
        return success ? Ok() : BadRequest("Failed to remove member");
    }

    [HttpPost("{id}/accept")]
    public async Task<IActionResult> AcceptInvitation(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var success = await _listService.AcceptInvitationAsync(userId.Value, id);
        return success ? Ok() : BadRequest("Failed to accept invitation");
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectInvitation(Guid id)
    {
        var userId = GetUserId();
        if (userId == null) return Unauthorized();
        var success = await _listService.RejectInvitationAsync(userId.Value, id);
        return success ? Ok() : BadRequest("Failed to reject invitation");
    }
}
