using BSkyClone.Models;
using BSkyClone.Repositories;
using BSkyClone.Services;
using BSkyClone.Services.ML;
using BSkyClone.UnitOfWork;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Http.Features;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();

// Increase Max Upload Size (500MB)
builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 524288000; // 500 MB
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 524288000; // 500 MB
});

// Configure Forwarded Headers for Nginx SSL
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Ensure WebRootPath is set
if (string.IsNullOrEmpty(builder.Environment.WebRootPath))
{
    builder.Environment.WebRootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
}
if (!Directory.Exists(builder.Environment.WebRootPath))
{
    Directory.CreateDirectory(builder.Environment.WebRootPath);
}

// CORS for Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(_ => true) // Allow any origin in production
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .WithExposedHeaders("*");
    });
});

// Database
builder.Services.AddDbContext<BSkyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure())
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// Repository and Unit of Work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IFeedService, FeedService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<ILinkService, LinkService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IListService, ListService>();
builder.Services.AddScoped<ICacheService, CacheService>();
builder.Services.AddScoped<ICategorizationService, CategorizationService>();
builder.Services.AddScoped<ISearchService, ElasticSearchService>();
builder.Services.AddSingleton<IMLModelService, MLModelService>();

// Redis Caching
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
    options.InstanceName = "BSky_";
});

// Elasticsearch
var esUri = new Uri(builder.Configuration["Elasticsearch:Uri"] ?? "http://elasticsearch:9200");
var esSettings = new Elastic.Clients.Elasticsearch.ElasticsearchClientSettings(esUri)
    .DefaultMappingFor<BSkyClone.Models.Post>(m => m.IndexName("posts"))
    .DefaultMappingFor<BSkyClone.Models.User>(m => m.IndexName("users"));

builder.Services.AddSingleton(new Elastic.Clients.Elasticsearch.ElasticsearchClient(esSettings));

// JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"] ?? "a_very_long_secret_key_that_is_at_least_32_chars_long";
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
    
    x.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && 
                (path.StartsWithSegments("/hubs/chat")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// Swagger config for JWT
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo { Title = "BSkyClone API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Handle Forwarded Headers from Nginx
app.UseForwardedHeaders();

// Configure the HTTP request pipeline.
// Enable Swagger in production for easy debugging
app.UseSwagger();
app.UseSwaggerUI();

/* 
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
*/

app.UseCors("AllowFrontend");

// Configure static files
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(app.Environment.WebRootPath),
    RequestPath = "",
    ServeUnknownFileTypes = false,
    OnPrepareResponse = ctx =>
    {
        // Add CORS headers for images
        ctx.Context.Response.Headers["Access-Control-Allow-Origin"] = "*";
    }
});

app.UseAuthentication();
app.UseMiddleware<BSkyClone.Middleware.BannedUserMiddleware>();
app.UseAuthorization();

app.MapControllers();
app.MapHub<BSkyClone.Hubs.ChatHub>("/hubs/chat");

// Apply database migrations automatically
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<BSkyDbContext>();
        
        // Apply any pending migrations before manual updates
        context.Database.Migrate();

        // --- MANUAL SCHEMA UPDATES ---
        try
        {
                // Ensure Notification Columns exist
                // This is critical because the code now depends on these columns
                var modSql = @"
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notifications') AND name = 'Title')
                    BEGIN
                        ALTER TABLE Notifications ADD Title NVARCHAR(MAX) NULL;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notifications') AND name = 'Content')
                    BEGIN
                        ALTER TABLE Notifications ADD Content NVARCHAR(MAX) NULL;
                    END
                    
                    -- Admin properties for Users
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'IsBanned')
                    BEGIN
                        ALTER TABLE Users ADD IsBanned BIT NOT NULL DEFAULT 0;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'IsVerified')
                    BEGIN
                        ALTER TABLE Users ADD IsVerified BIT NOT NULL DEFAULT 0;
                    END
                    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Feeds') AND name = 'IsOfficial')
                    BEGIN
                        ALTER TABLE Feeds ADD IsOfficial BIT NOT NULL DEFAULT 0;
                    END";
                context.Database.ExecuteSqlRaw(modSql);

            // Ensure MutedWords columns
            var mutedWordsSql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MutedWords') AND name = 'MuteBehavior')
                BEGIN
                    ALTER TABLE MutedWords ADD MuteBehavior NVARCHAR(20) NOT NULL DEFAULT 'hide';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('MutedWords') AND name = 'CreatedAt')
                BEGIN
                    ALTER TABLE MutedWords ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE();
                END";
            context.Database.ExecuteSqlRaw(mutedWordsSql);

            // Ensure Post interaction columns exist
            var postInteractionSql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Posts') AND name = 'ReplyRestriction')
                BEGIN
                    ALTER TABLE Posts ADD ReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Posts') AND name = 'AllowQuotes')
                BEGIN
                    ALTER TABLE Posts ADD AllowQuotes BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Posts') AND name = 'QuotesCount')
                BEGIN
                    ALTER TABLE Posts ADD QuotesCount INT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Posts') AND name = 'QuotePostId')
                BEGIN
                    ALTER TABLE Posts ADD QuotePostId UNIQUEIDENTIFIER NULL;
                END
                
                -- Add Foreign Key for QuotePostId if not exists
                IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PostQuote')
                BEGIN
                    ALTER TABLE Posts ADD CONSTRAINT FK_PostQuote FOREIGN KEY (QuotePostId) REFERENCES Posts(Id);
                END";
            context.Database.ExecuteSqlRaw(postInteractionSql);

            // Ensure UserSettings interaction columns exist
            var userSettingsInteractionSql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('UserSettings') AND name = 'DefaultReplyRestriction')
                BEGIN
                    ALTER TABLE UserSettings ADD DefaultReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('UserSettings') AND name = 'DefaultAllowQuotes')
                BEGIN
                    ALTER TABLE UserSettings ADD DefaultAllowQuotes BIT NULL DEFAULT 1;
                END";
            context.Database.ExecuteSqlRaw(userSettingsInteractionSql);

            // Ensure Hashtags and PostHashtags tables
            var hashtagsSql = @"
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Hashtags' AND xtype='U')
                BEGIN
                    CREATE TABLE Hashtags (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        Name NVARCHAR(100) NOT NULL,
                        Slug NVARCHAR(100) NOT NULL UNIQUE,
                        PostsCount INT NOT NULL DEFAULT 0,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        IsDeleted BIT NOT NULL DEFAULT 0
                    )
                END
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PostHashtags' AND xtype='U')
                BEGIN
                    CREATE TABLE PostHashtags (
                        PostId UNIQUEIDENTIFIER NOT NULL,
                        HashtagId INT NOT NULL,
                        PRIMARY KEY (PostId, HashtagId),
                        CONSTRAINT FK_PH_Post FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE,
                        CONSTRAINT FK_PH_Hashtag FOREIGN KEY (HashtagId) REFERENCES Hashtags(Id) ON DELETE CASCADE
                    )
                END";
            context.Database.ExecuteSqlRaw(hashtagsSql);

            // Manual Table Creation for UserListSubscriptions (since we can't run migrations)
            var sql = @"
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserListSubscriptions' AND xtype='U')
                BEGIN
                    CREATE TABLE UserListSubscriptions (
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        ListId UNIQUEIDENTIFIER NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        PinnedOrder INT NOT NULL DEFAULT 0,
                        CONSTRAINT PK_UserListSubscription PRIMARY KEY (UserId, ListId),
                        CONSTRAINT FK_ULS_User FOREIGN KEY (UserId) REFERENCES Users(Id),
                        CONSTRAINT FK_ULS_List FOREIGN KEY (ListId) REFERENCES Lists(Id) ON DELETE CASCADE
                    )
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Notifications') AND name = 'ListId')
                BEGIN
                    ALTER TABLE Notifications ADD ListId UNIQUEIDENTIFIER NULL;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ListMembers') AND name = 'Status')
                BEGIN
                    ALTER TABLE ListMembers ADD Status INT NOT NULL DEFAULT 0;
                END
                -- Always ensure any status-less (0) members are migrated to Accepted (1) 
                -- for users transitioning to the invitation system.
                EXEC('IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(''ListMembers'') AND name = ''Status'') UPDATE ListMembers SET Status = 1 WHERE Status = 0');

                -- CLEANUP: Remove old chat notifications from general feed
                DELETE FROM Notifications WHERE Type = 'message';

                -- RECALCULATE: Fix PostsCount for all users based on actual non-deleted posts
                UPDATE u SET u.PostsCount = sub.ActualCount
                FROM Users u
                INNER JOIN (
                    SELECT AuthorId, COUNT(*) AS ActualCount
                    FROM Posts
                    WHERE IsDeleted = 0 OR IsDeleted IS NULL
                    GROUP BY AuthorId
                ) sub ON u.Id = sub.AuthorId
                WHERE u.PostsCount != sub.ActualCount OR u.PostsCount IS NULL;

                -- Also zero out users with no posts
                UPDATE Users SET PostsCount = 0
                WHERE PostsCount IS NULL AND Id NOT IN (
                    SELECT DISTINCT AuthorId FROM Posts WHERE IsDeleted = 0 OR IsDeleted IS NULL
                );

                -- ADMIN: Set admin role for specific users
                UPDATE Users SET Role = 'admin' WHERE Username = 'trungtrung';
                ";
            context.Database.ExecuteSqlRaw(sql);
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(ex, "An error occurred during manual schema updates. Continuing...");
        }

        // --- SEED AI FEEDS AND INTERESTS ---
        try
        {
            var feedService = services.GetRequiredService<IFeedService>();
            await feedService.PreSeedFeedsAsync();
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "An error occurred during AI feed seeding.");
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }
}


// WeatherForecast remains as a minimal API example
var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
    {
        var forecast = Enumerable.Range(1, 5).Select(index =>
                new WeatherForecast
                (
                    DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    Random.Shared.Next(-20, 55),
                    summaries[Random.Shared.Next(summaries.Length)]
                ))
            .ToArray();
        return forecast;
    })
    .WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}