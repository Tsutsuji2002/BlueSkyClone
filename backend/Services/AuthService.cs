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
using System.Text.Json;
using System.Text.RegularExpressions;
using BSkyClone.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace BSkyClone.Services;

public interface IAuthService
{
    Task RequestPhoneVerificationAsync(string phone);
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
    private readonly IXrpcProxyService _xrpcProxy;
    private readonly IFeedService _feedService;
    private readonly IHubContext<PostHub> _postHubContext;
    private readonly ILogger<AuthService> _logger;

    public AuthService(IUnitOfWork unitOfWork, IConfiguration configuration, IDistributedCache cache, IXrpcProxyService xrpcProxy, IFeedService feedService, IHubContext<PostHub> postHubContext, ILogger<AuthService> logger)
    {
        _unitOfWork = unitOfWork;
        _configuration = configuration;
        _cache = cache;
        _xrpcProxy = xrpcProxy;
        _feedService = feedService;
        _postHubContext = postHubContext;
        _logger = logger;
    }

    public async Task RequestPhoneVerificationAsync(string phone)
    {
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new {
            phoneNumber = phone
        }), Encoding.UTF8, "application/json");

        var response = await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.server.requestPhoneVerification", content);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Exception($"Failed to request SMS Verification: {errorBody}");
        }
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

        // Proxy to Bluesky createAccount
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var payload = new Dictionary<string, object>
        {
            { "handle", handle },
            { "email", request.Email },
            { "password", request.Password }
        };

        if (!string.IsNullOrEmpty(request.VerificationPhone))
            payload["verificationPhone"] = request.VerificationPhone;
        
        if (!string.IsNullOrEmpty(request.VerificationCode))
            payload["verificationCode"] = request.VerificationCode;

        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        var response = await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.server.createAccount", content);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new Exception($"Bluesky Registration Failed: {errorBody}");
        }

        var bskySession = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(await response.Content.ReadAsStreamAsync());
        
        string did = bskySession.GetProperty("did").GetString()!;
        string accessJwt = bskySession.GetProperty("accessJwt").GetString()!;
        string refreshJwt = bskySession.GetProperty("refreshJwt").GetString()!;

        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Email = request.Email,
            Username = username,
            Handle = handle,
            DisplayName = request.DisplayName ?? username,
            Did = did,
            CreatedAt = DateTime.UtcNow,
            FollowersCount = 0,
            FollowingCount = 0,
            PostsCount = 0,
            PasswordHash = "PROXY_ACCOUNT", // No local password
            Salt = "PROXY_ACCOUNT"
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

        var bskyCacheOptions = new DistributedCacheEntryOptions { 
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30) 
        };
        await _cache.SetStringAsync($"BlueskyToken_{user.Id}", accessJwt, bskyCacheOptions);
        await _cache.SetStringAsync($"BlueskyRefreshToken_{user.Id}", refreshJwt, bskyCacheOptions);

        try
        {
            await SeedDefaultFeedsAsync(user.Id);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to seed default saved feeds for user {UserId}", user.Id);
        }

        return MapToAuthResponse(user, token, refreshToken);
    }


    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        // Proxy to Bluesky createSession
        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(new {
            identifier = request.Identifier,
            password = request.Password
        }), Encoding.UTF8, "application/json");

        var response = await httpClient.PostAsync("https://bsky.social/xrpc/com.atproto.server.createSession", content);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new UnauthorizedAccessException($"Bluesky Login Failed: {errorBody}");
        }

        var bskySession = await System.Text.Json.JsonSerializer.DeserializeAsync<System.Text.Json.JsonElement>(await response.Content.ReadAsStreamAsync());
        
        string did = bskySession.GetProperty("did").GetString()!;
        string handle = bskySession.GetProperty("handle").GetString()!;
        string email = bskySession.TryGetProperty("email", out var emailProp) ? emailProp.GetString()! : $"{handle}@bluesky.local";
        string accessJwt = bskySession.GetProperty("accessJwt").GetString()!;
        string refreshJwt = bskySession.GetProperty("refreshJwt").GetString()!;

        var user = await _unitOfWork.Users.GetByDidAsync(did) ?? await _unitOfWork.Users.GetByHandleAsync(handle);
        
        if (user == null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                Did = did,
                Handle = handle,
                Email = email,
                Username = handle.Contains(".") ? handle.Split('.')[0] : handle,
                DisplayName = handle,
                CreatedAt = DateTime.UtcNow,
                IsBanned = false,
                PasswordHash = "PROXY_ACCOUNT",
                Salt = "PROXY_ACCOUNT"
            };
            user.UserSetting = new UserSetting { UserId = user.Id, AppLanguage = "en", ThemeMode = "system" };
            await _unitOfWork.Users.AddAsync(user);
        }
        else
        {
            if (user.IsBanned) throw new UnauthorizedAccessException("Your account has been banned locally.");
            user.Handle = handle;
            _unitOfWork.Users.Update(user);
        }

        // Sync Profile Metadata (DisplayName, Avatar)
        try
        {
            var profileResponse = await _xrpcProxy.ProxyRequestAsync(did, "app.bsky.actor.getProfile", new Dictionary<string, string?> { { "actor", did } }, accessJwt);
            if (profileResponse.Success)
            {
                var profileJson = profileResponse.Content;
                using var profileDoc = JsonDocument.Parse(profileJson);
                var profileRoot = profileDoc.RootElement;

                if (profileRoot.TryGetProperty("displayName", out var dn)) user.DisplayName = dn.GetString();
                if (profileRoot.TryGetProperty("avatar", out var av)) user.AvatarUrl = av.GetString();
                if (profileRoot.TryGetProperty("description", out var bio)) user.Bio = bio.GetString();
                if (profileRoot.TryGetProperty("banner", out var banner)) user.CoverImageUrl = banner.GetString();
            }
        }
        catch (Exception ex)
        {
            System.Console.WriteLine($"[AuthService] Failed to sync profile metadata during login: {ex.Message}");
        }

        await _unitOfWork.CompleteAsync();

        // Broadcast Real-time Profile Update (Sync from Bluesky)
        var userDto = new UserDto(user.Id, user.Username, user.Handle, user.Email, user.DisplayName, user.AvatarUrl, user.CoverImageUrl, user.Bio, user.Location, user.Website, user.DateOfBirth, user.FollowersCount, user.FollowingCount, user.PostsCount, user.Role, null, user.IsVerified, user.Did);
        await _postHubContext.Clients.All.SendAsync("UserUpdated", userDto);

        var token = GenerateJwtToken(user, request.RememberMe);
        var refreshToken = await GenerateAndSaveRefreshToken(user.Id, request.RememberMe);

        var bskyCacheOptions = new DistributedCacheEntryOptions { 
            AbsoluteExpirationRelativeToNow = request.RememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromHours(24) 
        };
        await _cache.SetStringAsync($"BlueskyToken_{user.Id}", accessJwt, bskyCacheOptions);
        await _cache.SetStringAsync($"BlueskyRefreshToken_{user.Id}", refreshJwt, bskyCacheOptions);

        return MapToAuthResponse(user, token, refreshToken);
    }

    public async Task<AuthResponse?> RefreshTokenAsync(string refreshToken)
    {
        var userIdString = await _cache.GetStringAsync($"RefreshToken_{refreshToken}");
        if (string.IsNullOrEmpty(userIdString)) return null;

        var userId = Guid.Parse(userIdString.Split('|')[0]);
        var user = await _unitOfWork.Users.GetByIdAsync(userId);
        if (user == null) return null;

        // Persist rememberMe status if it was encoded in the value
        bool rememberMe = userIdString.Contains("|") && bool.Parse(userIdString.Split('|')[1]);

        var newToken = GenerateJwtToken(user, rememberMe);
        var newRefreshToken = await GenerateAndSaveRefreshToken(user.Id, rememberMe);
        
        // Synchronize Bluesky session refresh
        if (!string.IsNullOrEmpty(user.Did))
        {
            var bskyRefreshToken = await _cache.GetStringAsync($"BlueskyRefreshToken_{user.Id}");
            if (!string.IsNullOrEmpty(bskyRefreshToken))
            {
                try 
                {
                    var refreshResult = await _xrpcProxy.ProxyRequestAsync(
                        user.Did, 
                        "com.atproto.server.refreshSession", 
                        new Dictionary<string, string?>(), 
                        bskyRefreshToken, 
                        "POST"
                    );
                    
                    if (refreshResult.Success)
                    {
                        var bskySession = JsonSerializer.Deserialize<JsonElement>(refreshResult.Content);
                        string nextAccessJwt = bskySession.GetProperty("accessJwt").GetString()!;
                        string nextRefreshJwt = bskySession.GetProperty("refreshJwt").GetString()!;

                        var bskyCacheOptions = new DistributedCacheEntryOptions { 
                            AbsoluteExpirationRelativeToNow = rememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromHours(24) 
                        };
                        await _cache.SetStringAsync($"BlueskyToken_{user.Id}", nextAccessJwt, bskyCacheOptions);
                        await _cache.SetStringAsync($"BlueskyRefreshToken_{user.Id}", nextRefreshJwt, bskyCacheOptions);
                        _logger.LogInformation("Successfully refreshed Bluesky session for user {UserId}", user.Id);
                    }
                    else
                    {
                        _logger.LogWarning("Failed to refresh Bluesky session for user {UserId}. Status: {Status}, Body: {Body}", user.Id, refreshResult.StatusCode, refreshResult.Content);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error refreshing Bluesky session for user {UserId}", user.Id);
                }
            }
        }

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

        // Auto-sync DisplayName/Avatar if missing and it's a proxy account
        if (string.IsNullOrEmpty(user.DisplayName) || string.IsNullOrEmpty(user.AvatarUrl))
        {
            try
            {
                var token = await _cache.GetStringAsync($"BlueskyToken_{user.Id}");
                if (!string.IsNullOrEmpty(token))
                {
                    var profileResponse = await _xrpcProxy.ProxyRequestAsync(user.Did!, "app.bsky.actor.getProfile", new Dictionary<string, string?> { { "actor", user.Did } }, token);
                    if (profileResponse.Success)
                    {
                        var profileJson = profileResponse.Content;
                        using var profileDoc = JsonDocument.Parse(profileJson);
                        var profileRoot = profileDoc.RootElement;

                        if (profileRoot.TryGetProperty("displayName", out var dn)) user.DisplayName = dn.GetString();
                        if (profileRoot.TryGetProperty("avatar", out var av)) user.AvatarUrl = av.GetString();
                        
                        await _unitOfWork.CompleteAsync();

                        // Broadcast Real-time Profile Sync
                        var userDtoSync = new UserDto(user.Id, user.Username, user.Handle, user.Email, user.DisplayName, user.AvatarUrl, user.CoverImageUrl, user.Bio, user.Location, user.Website, user.DateOfBirth, user.FollowersCount, user.FollowingCount, user.PostsCount, user.Role, null, user.IsVerified, user.Did);
                        await _postHubContext.Clients.All.SendAsync("UserUpdated", userDtoSync);
                    }
                }
            }
            catch { /* Best effort */ }
        }

        return MapToAuthResponse(user, "", ""); // No new tokens needed for a profile sync
    }

    private async Task SeedDefaultFeedsAsync(Guid userId)
    {
        await _feedService.PinFeedAsync(userId, Guid.Empty, "following");
        await _feedService.PinFeedAsync(userId, Guid.Empty, "discover");
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
            string.IsNullOrWhiteSpace(user.DisplayName) ? user.Handle : user.DisplayName,
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
            user.UserSetting.SexuallyExplicitFilter,
            user.UserSetting.GraphicMediaFilter,
            user.UserSetting.NonSexualNudityFilter,
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
            null, null, null, null, null, null, null, null, "en", "system",
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





