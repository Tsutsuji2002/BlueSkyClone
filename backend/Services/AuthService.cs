using BSkyClone.DTOs;
using BSkyClone.Models;
using BSkyClone.UnitOfWork;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace BSkyClone.Services;

public interface IAuthService
{
    Task<AuthResponse?> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);
    Task<AuthResponse?> RefreshTokenAsync(string refreshToken);
    Task<AuthResponse?> GetUserProfileAsync(Guid userId);
    Task LogoutAsync(string refreshToken);
}

public class AuthService : IAuthService
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;
    private readonly IDistributedCache _cache;

    public AuthService(IUnitOfWork unitOfWork, IConfiguration configuration, IDistributedCache cache)
    {
        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _cache = cache;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        var handle = $"{request.Username.ToLower()}.{request.HostingProvider.ToLower()}";

        if (await _unitOfWork.Users.GetByEmailAsync(request.Email) != null ||
            await _unitOfWork.Users.GetByHandleAsync(handle) != null)
        {
            return null;
        }

        var salt = BCrypt.Net.BCrypt.GenerateSalt();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, salt);

        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = request.Email,
            Username = request.Username,
            Handle = handle,
            DisplayName = request.DisplayName ?? request.Username,
            PasswordHash = passwordHash,
            Salt = salt,
            DateOfBirth = request.DateOfBirth,
            Did = $"did:plc:{Guid.NewGuid():n}",
            CreatedAt = DateTime.UtcNow,
            FollowersCount = 0,
            FollowingCount = 0,
            PostsCount = 0
        };

        user.UserSetting = new UserSetting
        {
            UserId = userId,
            AppLanguage = "en",
            ThemeMode = "system",
            FontSize = 15
        };

        await _unitOfWork.Users.AddAsync(user);
        
        await _unitOfWork.CompleteAsync();
        
        var token = GenerateJwtToken(user);
        var refreshToken = await GenerateAndSaveRefreshToken(user.Id);

        return MapToAuthResponse(user, token, refreshToken);
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _unitOfWork.Users.GetByEmailAsync(request.Identifier) 
                   ?? await _unitOfWork.Users.GetByHandleAsync(request.Identifier);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        var token = GenerateJwtToken(user);
        var refreshToken = await GenerateAndSaveRefreshToken(user.Id);

        return MapToAuthResponse(user, token, refreshToken);
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        var userIdString = await _cache.GetStringAsync($"RefreshToken_{refreshToken}");
        if (string.IsNullOrEmpty(userIdString)) return null;

        var userId = Guid.Parse(userIdString);
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return null;

        // Invalidate old refresh token (optional but recommended for security)
        await _cache.RemoveAsync($"RefreshToken_{refreshToken}");

        var newToken = GenerateJwtToken(user);
        var newRefreshToken = await GenerateAndSaveRefreshToken(user.Id);

        return MapToAuthResponse(user, newToken, newRefreshToken);
    }

    public async Task<AuthResponse?> GetUserProfileAsync(Guid userId)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return null;

        return MapToAuthResponse(user, "", ""); // No new tokens needed for a profile sync
    }

    public async Task LogoutAsync(string refreshToken)
    {
        await _cache.RemoveAsync($"RefreshToken_{refreshToken}");
    }

    private async Task<string> GenerateAndSaveRefreshToken(Guid userId)
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        var refreshToken = Convert.ToBase64String(randomNumber);

        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7)
        };

        await _cache.SetStringAsync($"RefreshToken_{refreshToken}", userId.ToString(), cacheOptions);
        return refreshToken;
    }

    private AuthResponse MapToAuthResponse(User user, string token, string refreshToken)
    {
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
            user.PostsCount,
            user.Role
        );

        var settingsDto = user.UserSetting != null ? new UserSettingDto(
            user.UserSetting.AdultContentFilter,
            user.UserSetting.EnableAdultContent,
            user.UserSetting.SortReplies,
            user.UserSetting.RequireAltText,
            user.UserSetting.AutoplayVideoGif,
            user.UserSetting.AppLanguage,
            user.UserSetting.ThemeMode,
            user.UserSetting.NotifyLikes,
            user.UserSetting.NotifyFollowers,
            user.UserSetting.NotifyReplies,
            user.UserSetting.DefaultReplyRestriction,
            user.UserSetting.DefaultAllowQuotes,
            user.UserSetting.FontSize
        ) : new UserSettingDto(null, null, null, null, null, "en", "system", true, true, true, "anyone", true, 15);

        return new AuthResponse(userDto, settingsDto, token, refreshToken);
    }

    private string GenerateJwtToken(User user)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(_configuration["Jwt:Key"] ?? "a_very_long_secret_key_that_is_at_least_32_chars_long");
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim("handle", user.Handle),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = DateTime.UtcNow.AddHours(1), // Shorter lived JWT
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"]
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
