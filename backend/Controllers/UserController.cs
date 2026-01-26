using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace BSkyClone.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;

    public UserController(IUserService userService)
    {
        _userService = userService;
    }

    [HttpPatch("profile")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UpdateProfile([FromForm] UpdateProfileRequest request)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var user = await _userService.UpdateProfileAsync(userId, request);
            
            var userDto = new UserDto(
                user.Id,
                user.Username,
                user.Handle,
                user.Email,
                user.DisplayName,
                user.AvatarUrl,
                user.CoverImageUrl,
                user.Bio,
                user.Location,
                user.Website,
                user.DateOfBirth,
                user.FollowersCount,
                user.FollowingCount,
                user.PostsCount
            );

            return Ok(userDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("account")]
    public async Task<IActionResult> UpdateAccount([FromBody] UpdateAccountRequest? request)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Invalid request body" });
        }
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized();
        }

        try
        {
            var user = await _userService.UpdateAccountAsync(userId, request);
            
            var userDto = new UserDto(
                user.Id,
                user.Username,
                user.Handle,
                user.Email,
                user.DisplayName,
                user.AvatarUrl,
                user.CoverImageUrl,
                user.Bio,
                user.Location,
                user.Website,
                user.DateOfBirth,
                user.FollowersCount,
                user.FollowingCount,
                user.PostsCount
            );

            return Ok(userDto);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string q, [FromQuery] int limit = 10)
    {
        var users = await _userService.SearchUsersAsync(q, limit);
        var dtos = users.Select(user => new UserDto(
            user.Id,
            user.Username,
            user.Handle,
            user.Email,
            user.DisplayName,
            user.AvatarUrl,
            user.CoverImageUrl,
            user.Bio,
            user.Location,
            user.Website,
            user.DateOfBirth,
            user.FollowersCount,
            user.FollowingCount,
            user.PostsCount
        ));
        return Ok(dtos);
    }
}
