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

    private Guid GetUserId()
    {
        var idClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (idClaim != null && Guid.TryParse(idClaim.Value, out Guid userId))
        {
            return userId;
        }
        throw new UnauthorizedAccessException("User ID not found in token");
    }

    [HttpPost]
    public async Task<IActionResult> CreateList([FromBody] CreateListDto dto)
    {
        var userId = GetUserId();
        var list = await _listService.CreateListAsync(userId, dto);
        return Ok(list);
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyLists()
    {
        var userId = GetUserId();
        var lists = await _listService.GetMyListsAsync(userId);
        return Ok(lists);
    }

    [HttpGet("member")]
    public async Task<IActionResult> GetListsIAmOn()
    {
        var userId = GetUserId();
        var lists = await _listService.GetListsIAmOnAsync(userId);
        return Ok(lists);
    }

    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserLists(Guid userId)
    {
        var viewerId = GetUserId();
        var lists = await _listService.GetUserListsAsync(userId, viewerId);
        return Ok(lists);
    }

    [HttpGet("pinned")]
    public async Task<IActionResult> GetPinnedLists()
    {
        var userId = GetUserId();
        var lists = await _listService.GetPinnedListsAsync(userId);
        return Ok(lists);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetList(Guid id)
    {
        var userId = GetUserId();
        var list = await _listService.GetListByIdAsync(userId, id);
        if (list == null) return NotFound();
        return Ok(list);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateList(Guid id, [FromBody] UpdateListDto dto)
    {
        var userId = GetUserId();
        try
        {
            var list = await _listService.UpdateListAsync(userId, id, dto);
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
        var success = await _listService.DeleteListAsync(userId, id);
        if (!success) return BadRequest("Failed to delete list or not owner");
        return Ok();
    }

    [HttpPost("{id}/pin")]
    public async Task<IActionResult> PinList(Guid id)
    {
        var userId = GetUserId();
        var success = await _listService.PinListAsync(userId, id);
        return success ? Ok() : BadRequest();
    }

    [HttpPost("{id}/unpin")]
    public async Task<IActionResult> UnpinList(Guid id)
    {
        var userId = GetUserId();
        var success = await _listService.UnpinListAsync(userId, id);
        return success ? Ok() : BadRequest();
    }

    [HttpGet("{id}/feed")]
    public async Task<IActionResult> GetListFeed(Guid id, [FromQuery] int limit = 50, [FromQuery] int offset = 0)
    {
        var userId = GetUserId();
        var posts = await _listService.GetListFeedAsync(userId, id, limit, offset);
        return Ok(posts);
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
        var userId = GetUserId(); // Retained original GetUserId() call
        var candidates = await _listService.GetCandidateMembersAsync(id, userId, q);
        return Ok(candidates);
    }

    [HttpGet("{id}/candidate-posts")]
    public async Task<IActionResult> GetCandidatePosts(Guid id, [FromQuery] Guid userId, [FromQuery] int limit = 10, [FromQuery] int offset = 0)
    {
        var posts = await _listService.GetCandidatePostsAsync(id, userId, limit, offset);
        return Ok(posts);
    }

    [HttpPost("{id}/posts")]
    public async Task<IActionResult> AddPost(Guid id, [FromBody] AddListPostRequest dto)
    {
        var userId = GetUserId(); // Retained original GetUserId() call
        var success = await _listService.AddPostAsync(userId, id, dto.PostId, dto.Caption);
        if (!success) return BadRequest("Failed to add post");
        return Ok();
    }

    [HttpDelete("{id}/posts/{postId}")]
    public async Task<IActionResult> RemovePost(Guid id, Guid postId)
    {
        var userId = GetUserId(); // Retained original GetUserId() call
        var success = await _listService.RemovePostAsync(userId, id, postId);
        if (!success) return BadRequest("Failed to remove post");
        return Ok();
    }

    [HttpPost("{id}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddListMemberDto dto)
    {
        var userId = GetUserId();
        var success = await _listService.AddMemberAsync(userId, id, dto.UserId);
        return success ? Ok() : BadRequest("Failed to add member");
    }

    [HttpDelete("{id}/members/{targetId}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid targetId)
    {
        var userId = GetUserId();
        var success = await _listService.RemoveMemberAsync(userId, id, targetId);
        return success ? Ok() : BadRequest("Failed to remove member");
    }

    [HttpPost("{id}/accept")]
    public async Task<IActionResult> AcceptInvitation(Guid id)
    {
        var userId = GetUserId();
        var success = await _listService.AcceptInvitationAsync(userId, id);
        return success ? Ok() : BadRequest("Failed to accept invitation");
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectInvitation(Guid id)
    {
        var userId = GetUserId();
        var success = await _listService.RejectInvitationAsync(userId, id);
        return success ? Ok() : BadRequest("Failed to reject invitation");
    }
}
