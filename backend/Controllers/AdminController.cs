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

    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts([FromQuery] int skip = 0, [FromQuery] int take = 20, [FromQuery] string? search = null)
    {
        var result = await _adminService.GetPostsAsync(skip, take, search);
        return Ok(result);
    }

    [HttpDelete("posts/{id}")]
    public async Task<IActionResult> DeletePost(Guid id)
    {
        var success = await _adminService.DeletePostAsync(id);
        if (!success) return NotFound(new { message = "Post not found" });
        return Ok(new { message = "Post deleted successfully" });
    }

    [HttpGet("feeds")]
    public async Task<IActionResult> GetFeeds([FromQuery] int skip = 0, [FromQuery] int take = 20)
    {
        var result = await _adminService.GetFeedsAsync(skip, take);
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
}
