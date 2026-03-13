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
using System.Text.RegularExpressions;

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
    private readonly ICryptoService _crypto;

    public AuthService(IUnitOfWork unitOfWork, IConfiguration configuration, IDistributedCache cache, ICryptoService crypto)
    {
        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _cache = cache;
        _crypto = crypto;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        var username = request.Username.ToLower();
        if (string.IsNullOrWhiteSpace(username) || 
            username.Length > 16 || 
            !Regex.IsMatch(username, @"^[a-z0-9.]+$"))
        {
            return null;
        }

        var handle = $"{username}.{request.HostingProvider.ToLower()}";

        if (await _unitOfWork.Users.GetByEmailAsync(request.Email) != null ||
            await _unitOfWork.Users.GetByHandleAsync(handle) != null)
        {
            return null;
        }

        var salt = BCrypt.Net.BCrypt.GenerateSalt();
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, salt);

        var userId = Guid.NewGuid();
        var keys = _crypto.GenerateSecp256k1Keypair();
        var user = new User
        {
            Id = userId,
            Email = request.Email,
            Username = username,
            Handle = handle,
            DisplayName = request.DisplayName ?? username,
            PasswordHash = passwordHash,
            Salt = salt,
            DateOfBirth = request.DateOfBirth,
            Did = $"did:plc:{Guid.NewGuid():n}",
            CreatedAt = DateTime.UtcNow,
            FollowersCount = 0,
            FollowingCount = 0,
            PostsCount = 0,
            SigningPublicKey = keys.publicKey,
            EncryptedSigningPrivateKey = _crypto.EncryptPrivateKey(keys.privateKey)
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

        // Banned user logic: Prevent login
        if (user.IsBanned)
        {
            throw new UnauthorizedAccessException("Your account has been banned.");
        }

        var token = GenerateJwtToken(user, request.RememberMe);
        var refreshToken = await GenerateAndSaveRefreshToken(user.Id, request.RememberMe);

        // Auto-generate key for existing users if missing
        if (string.IsNullOrEmpty(user.SigningPublicKey))
        {
            var keys = _crypto.GenerateSecp256k1Keypair();
            user.SigningPublicKey = keys.publicKey;
            user.EncryptedSigningPrivateKey = _crypto.EncryptPrivateKey(keys.privateKey);
            _unitOfWork.Users.Update(user);
            await _unitOfWork.CompleteAsync();
        }

        return MapToAuthResponse(user, token, refreshToken);
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        var userIdString = await _cache.GetStringAsync($"RefreshToken_{refreshToken}");
        if (string.IsNullOrEmpty(userIdString)) return null;

        var userId = Guid.Parse(userIdString.Split('|')[0]);
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return null;

        // Invalidate old refresh token (optional but recommended for security)
        await _cache.RemoveAsync($"RefreshToken_{refreshToken}");

        // Persist rememberMe status if it was encoded in the value
        bool rememberMe = userIdString.Contains("|") && bool.Parse(userIdString.Split('|')[1]);

        var newToken = GenerateJwtToken(user, rememberMe);
        var newRefreshToken = await GenerateAndSaveRefreshToken(user.Id, rememberMe);

        return MapToAuthResponse(user, newToken, newRefreshToken);
    }

    public async Task<AuthResponse?> GetUserProfileAsync(Guid userId)
    {
        User? user = null;
        try 
        {
            user = await _unitOfWork.Users.Query()
                .Include(u => u.UserSetting)
                .FirstOrDefaultAsync(u => u.Id == userId);
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[AuthService] Error fetching user with settings: {ex.Message}. Falling back to basic fetch.");
            user = await _unitOfWork.Users.GetByIdAsync(userId);
        }

        if (user == null) return null;

        user.PostsCount = await _unitOfWork.Posts.Query().CountAsync(p => p.AuthorId == user.Id && p.IsDeleted != true);

        // Banned user logic: Instantly invalidate session if banned
        if (user.IsBanned)
        {
            throw new UnauthorizedAccessException("Your account has been banned.");
        }

        return MapToAuthResponse(user, "", ""); // No new tokens needed for a profile sync
    }

    public async Task LogoutAsync(string refreshToken)
    {
        await _cache.RemoveAsync($"RefreshToken_{refreshToken}");
    }

    private async Task<string> GenerateAndSaveRefreshToken(Guid userId, bool rememberMe = false)
    {
        var randomNumber = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomNumber);
        var refreshToken = Convert.ToBase64String(randomNumber);

        var cacheOptions = new DistributedCacheEntryOptions
        {
            // If rememberMe is checked, extend refresh token to 30 days, else keep it at 7 days
            AbsoluteExpirationRelativeToNow = rememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromDays(7)
        };

        await _cache.SetStringAsync($"RefreshToken_{refreshToken}", $"{userId}|{rememberMe}", cacheOptions);
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
            user.Role,
            null,
            user.IsVerified,
            user.Did
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
            user.UserSetting.NotifyMentions,
            user.UserSetting.NotifyQuotes,
            user.UserSetting.NotifyReposts,
            user.UserSetting.PushNotifyLikes,
            user.UserSetting.PushNotifyFollowers,
            user.UserSetting.PushNotifyReplies,
            user.UserSetting.PushNotifyMentions,
            user.UserSetting.PushNotifyQuotes,
            user.UserSetting.PushNotifyReposts,
            user.UserSetting.InAppNotifyLikes,
            user.UserSetting.InAppNotifyFollowers,
            user.UserSetting.InAppNotifyReplies,
            user.UserSetting.InAppNotifyMentions,
            user.UserSetting.InAppNotifyQuotes,
            user.UserSetting.InAppNotifyReposts,
            user.UserSetting.NotifyActivity,
            user.UserSetting.PushNotifyActivity,
            user.UserSetting.InAppNotifyActivity,
            user.UserSetting.NotifyLikesOfReposts,
            user.UserSetting.PushNotifyLikesOfReposts,
            user.UserSetting.InAppNotifyLikesOfReposts,
            user.UserSetting.NotifyRepostsOfReposts,
            user.UserSetting.PushNotifyRepostsOfReposts,
            user.UserSetting.InAppNotifyRepostsOfReposts,
            user.UserSetting.NotifyOthers,
            user.UserSetting.PushNotifyOthers,
            user.UserSetting.InAppNotifyOthers,
            user.UserSetting.DefaultReplyRestriction,
            user.UserSetting.DefaultAllowQuotes,
            user.UserSetting.FontSize,
            user.UserSetting.EnableTrending,
            user.UserSetting.EnableDiscoverVideo,
            user.UserSetting.EnableTreeView,
            user.UserSetting.RequireLogoutVisibility,
            user.UserSetting.LargerAltBadge,
            user.UserSetting.ShowReplies,
            user.UserSetting.ShowReposts,
            user.UserSetting.ShowQuotePosts,
            user.UserSetting.ShowSampleSavedFeeds,
            user.UserSetting.EnabledMediaProviders
        ) : new UserSettingDto(
            null, null, null, null, null, "en", "system",
            true, true, true, true, true, true,  // Notify* (6)
            true, true, true, true, true, true,  // PushNotify* (6)
            true, true, true, true, true, true,  // InAppNotify* (6)
            true, true, true,                    // Activity (3)
            true, true, true,                    // LikesOfReposts (3)
            true, true, true,                    // RepostsOfReposts (3)
            true, true, true,                    // Others (3)
            "anyone", true, 15,                  // ReplyRestriction, AllowQuotes, FontSize
            true, true, false, false, false,     // Trending, Video, TreeView, Logout, AltBadge
            true, true, true, false,             // ShowReplies, ShowReposts, ShowQuotes, ShowSampleFeeds
            null                                 // EnabledMediaProviders
        );

        return new AuthResponse(userDto, settingsDto, token, refreshToken);
    }

    private string GenerateJwtToken(User user, bool rememberMe = false)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(_configuration["Jwt:Key"] ?? "a_very_long_secret_key_that_is_at_least_32_chars_long");
        
        // If remember me is true, set a longer-lived JWT token (e.g., 7 days)
        // Otherwise, keep it short (e.g., 2 hours)
        var expires = rememberMe ? DateTime.UtcNow.AddDays(7) : DateTime.UtcNow.AddHours(2);

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim("sub", user.Id.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim("handle", user.Handle),
                new Claim("did", user.Did),
                new Claim(ClaimTypes.Role, user.Role)
            }),
            Expires = expires,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature),
            Issuer = _configuration["Jwt:Issuer"],
            Audience = _configuration["Jwt:Audience"]
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }
}
