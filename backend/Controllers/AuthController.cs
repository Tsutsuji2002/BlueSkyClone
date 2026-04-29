using BSkyClone.DTOs;
using BSkyClone.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;

namespace BSkyClone.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _authService.GetUserProfileAsync(userId);
            if (result == null) return NotFound();
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("register")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        try
        {
            var result = await _authService.RegisterAsync(request);
            if (result == null)
            {
                return BadRequest(new { message = "User with this email or handle already exists." });
            }
            SetTokenCookies(result.Token, result.RefreshToken);
            return Ok(new { user = result.User, settings = result.Settings });
        }
        catch (Exception ex)
        {
            // Return 400 so the frontend can display the specific Bluesky error message
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("request-phone-verification")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> RequestPhoneVerification([FromBody] PhoneVerificationRequest request)
    {
        try
        {
            await _authService.RequestPhoneVerificationAsync(request.PhoneNumber);
            return Ok();
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        try
        {
            var result = await _authService.LoginAsync(request);
            if (result == null)
            {
                return Unauthorized(new { message = "Invalid email/handle or password." });
            }
            SetTokenCookies(result.Token, result.RefreshToken);
            return Ok(new { user = result.User, settings = result.Settings });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            // Log exception here in a real scenario
            return StatusCode(500, new { message = "An unexpected error occurred. Please try again." });
        }
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("login")]
    public async Task<IActionResult> Refresh()
    {
        var refreshToken = Request.Cookies["refresh_token"];
        if (string.IsNullOrEmpty(refreshToken)) return Unauthorized(new { message = "No refresh token provided." });

        var result = await _authService.RefreshTokenAsync(refreshToken);
        if (result == null)
        {
            return Unauthorized(new { message = "Invalid refresh token." });
        }
        SetTokenCookies(result.Token, result.RefreshToken);
        return Ok(new { user = result.User, settings = result.Settings });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshToken = Request.Cookies["refresh_token"];
        if (!string.IsNullOrEmpty(refreshToken))
        {
            await _authService.LogoutAsync(refreshToken);
        }
        
        Response.Cookies.Delete("access_token");
        Response.Cookies.Delete("refresh_token");
        return Ok();
    }

    private void SetTokenCookies(string token, string refreshToken)
    {
        var cookieOptions = new CookieOptions
        {
            HttpOnly = true,
            Secure = true, // Ensure HTTPS is required
            SameSite = SameSiteMode.Lax, // Allow some cross-site for SPA
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        };
        Response.Cookies.Append("access_token", token, cookieOptions);
        Response.Cookies.Append("refresh_token", refreshToken, cookieOptions);
    }
}
