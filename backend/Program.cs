using BSkyClone.Models;
using BSkyClone.Repositories;
using BSkyClone.Services;
using BSkyClone.Services.ML;
using BSkyClone.UnitOfWork;
using BSkyClone.Utilities;
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
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<ISupportRequestService, SupportRequestService>();
builder.Services.AddScoped<IRepoManager, RepoManager>();
builder.Services.AddScoped<IPlcService, PlcService>();
builder.Services.AddScoped<MstService>();
builder.Services.AddScoped<IDidResolver, DidResolverService>();
builder.Services.AddScoped<ICryptoService, CryptoService>();
builder.Services.AddScoped<IXrpcProxyService, XrpcProxyService>();

// Redis Caching
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDistributedMemoryCache();
}
else
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
        options.InstanceName = "BSky_";
    });
}

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
        ValidateIssuer = false, // Relaxed for VPS consistency
        ValidateAudience = false, // Relaxed for VPS consistency
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"] ?? "a_very_long_secret_key_that_is_at_least_32_chars_long")),
        ClockSkew = TimeSpan.Zero
    };
    
    x.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && 
                (path.StartsWithSegments("/hubs/chat") || path.StartsWithSegments("/hubs/posts")))
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

app.UseMiddleware<BSkyClone.Middleware.RequestLoggingMiddleware>();

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

app.UseMiddleware<BSkyClone.Middleware.XrpcMiddleware>();
app.MapControllers();
app.MapHub<BSkyClone.Hubs.ChatHub>("/hubs/chat");
app.MapHub<BSkyClone.Hubs.PostHub>("/hubs/posts");

// Apply database migrations automatically
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<BSkyDbContext>();
        var logger = services.GetRequiredService<ILogger<Program>>();
        
        // Try to apply pending migrations, but don't let failures here block manual updates
        try
        {
            context.Database.Migrate();
            logger.LogInformation("Database migrations applied successfully.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Database migration failed. Attempting manual schema updates as fallback...");
        }

        // --- MANUAL SCHEMA UPDATES ---
        
        // 1. Notifications and User Properties
        try
        {
            var sql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Notifications') OR object_id = OBJECT_ID('Notifications')) AND name = 'Title')
                BEGIN
                    ALTER TABLE dbo.Notifications ADD Title NVARCHAR(MAX) NULL;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Notifications') OR object_id = OBJECT_ID('Notifications')) AND name = 'Content')
                BEGIN
                    ALTER TABLE dbo.Notifications ADD Content NVARCHAR(MAX) NULL;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Users') OR object_id = OBJECT_ID('Users')) AND name = 'IsBanned')
                BEGIN
                    ALTER TABLE dbo.Users ADD IsBanned BIT NOT NULL DEFAULT 0;
                    PRINT 'Added IsBanned to Users';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Users') OR object_id = OBJECT_ID('Users')) AND name = 'IsVerified')
                BEGIN
                    ALTER TABLE dbo.Users ADD IsVerified BIT NOT NULL DEFAULT 0;
                    PRINT 'Added IsVerified to Users';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Users') OR object_id = OBJECT_ID('Users')) AND name = 'RepoRoot')
                BEGIN
                    ALTER TABLE dbo.Users ADD RepoRoot NVARCHAR(100) NULL;
                    PRINT 'Added RepoRoot to Users';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Users') OR object_id = OBJECT_ID('Users')) AND name = 'RepoCommit')
                BEGIN
                    ALTER TABLE dbo.Users ADD RepoCommit NVARCHAR(100) NULL;
                    PRINT 'Added RepoCommit to Users';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Users') OR object_id = OBJECT_ID('Users')) AND name = 'RepoCommitSignature')
                BEGIN
                    ALTER TABLE dbo.Users ADD RepoCommitSignature NVARCHAR(256) NULL;
                    PRINT 'Added RepoCommitSignature to Users';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Users') OR object_id = OBJECT_ID('Users')) AND name = 'RepoRev')
                BEGIN
                    ALTER TABLE dbo.Users ADD RepoRev NVARCHAR(100) NULL;
                    PRINT 'Added RepoRev to Users';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Feeds') OR object_id = OBJECT_ID('Feeds')) AND name = 'IsOfficial')
                BEGIN
                    ALTER TABLE dbo.Feeds ADD IsOfficial BIT NOT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Notifications') OR object_id = OBJECT_ID('Notifications')) AND name = 'Cid')
                BEGIN
                    ALTER TABLE dbo.Notifications ADD Cid NVARCHAR(100) NULL;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Notifications') OR object_id = OBJECT_ID('Notifications')) AND name = 'Uri')
                BEGIN
                    ALTER TABLE dbo.Notifications ADD Uri NVARCHAR(200) NULL;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Notifications') OR object_id = OBJECT_ID('Notifications')) AND name = 'Tid')
                BEGIN
                    ALTER TABLE dbo.Notifications ADD Tid NVARCHAR(20) NULL;
                END
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RepoBlocks' AND xtype='U')
                BEGIN
                    CREATE TABLE RepoBlocks (
                        Cid NVARCHAR(100) PRIMARY KEY,
                        Data VARBINARY(MAX) NOT NULL,
                        Did NVARCHAR(100) NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    );
                    CREATE INDEX IX_RepoBlocks_Did ON RepoBlocks(Did);
                    PRINT 'Created RepoBlocks table';
                END";
            context.Database.ExecuteSqlRaw(sql);
            logger.LogInformation("Applied/Verified manual schema updates for Notifications and User properties.");
        }
        catch (Exception ex) { logger.LogWarning(ex, "Manual update block 1 failed. This might cause issues with BannedUserMiddleware."); }

        // 2. MutedWords
        try
        {
            var sql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MutedWords') AND name = 'MuteBehavior')
                BEGIN
                    ALTER TABLE MutedWords ADD MuteBehavior NVARCHAR(20) NOT NULL DEFAULT 'hide';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.MutedWords') AND name = 'CreatedAt')
                BEGIN
                    ALTER TABLE MutedWords ADD CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE();
                END";
            context.Database.ExecuteSqlRaw(sql);
            logger.LogInformation("Applied manual schema updates for MutedWords.");
        }
        catch (Exception ex) { logger.LogWarning(ex, "Manual update block 2 failed."); }

        // 3. Post Interaction Columns (Quote Feature)
        try
        {
            var sql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Posts') OR object_id = OBJECT_ID('Posts')) AND name = 'ReplyRestriction')
                BEGIN
                    ALTER TABLE dbo.Posts ADD ReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';
                    PRINT 'Added ReplyRestriction to Posts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Posts') OR object_id = OBJECT_ID('Posts')) AND name = 'AllowQuotes')
                BEGIN
                    ALTER TABLE dbo.Posts ADD AllowQuotes BIT NULL DEFAULT 1;
                    PRINT 'Added AllowQuotes to Posts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Posts') OR object_id = OBJECT_ID('Posts')) AND name = 'QuotesCount')
                BEGIN
                    ALTER TABLE dbo.Posts ADD QuotesCount INT NULL DEFAULT 0;
                    PRINT 'Added QuotesCount to Posts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Posts') OR object_id = OBJECT_ID('Posts')) AND name = 'QuotePostId')
                BEGIN
                    ALTER TABLE dbo.Posts ADD QuotePostId UNIQUEIDENTIFIER NULL;
                    PRINT 'Added QuotePostId to Posts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE (object_id = OBJECT_ID('dbo.Posts') OR object_id = OBJECT_ID('Posts')) AND name = 'Language')
                BEGIN
                    ALTER TABLE dbo.Posts ADD Language NVARCHAR(MAX) NULL;
                    PRINT 'Added Language to Posts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'Cid')
                BEGIN
                    ALTER TABLE dbo.Posts ADD Cid NVARCHAR(100) NULL;
                    PRINT 'Added Cid to Posts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'Uri')
                BEGIN
                    ALTER TABLE dbo.Posts ADD Uri NVARCHAR(200) NULL;
                    PRINT 'Added Uri to Posts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'Tid')
                BEGIN
                    ALTER TABLE dbo.Posts ADD Tid NVARCHAR(20) NULL;
                    PRINT 'Added Tid to Posts';
                END";
            context.Database.ExecuteSqlRaw(sql);
            
            // Separate block for the FK to avoid batch issues
            var fkSql = @"
                IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PostQuote')
                BEGIN
                    ALTER TABLE dbo.Posts ADD CONSTRAINT FK_PostQuote FOREIGN KEY (QuotePostId) REFERENCES dbo.Posts(Id);
                    PRINT 'Added FK_PostQuote to Posts';
                END
                
                -- Ensure unique index on Tid for Posts
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'UQ_Posts_Tid')
                BEGIN
                    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'Tid')
                    BEGIN
                        CREATE UNIQUE INDEX UQ_Posts_Tid ON dbo.Posts(Tid) WHERE Tid IS NOT NULL;
                    END
                END

                -- Ensure unique index on Tid for Notifications
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'UQ_Notifications_Tid')
                BEGIN
                    IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'Tid')
                    BEGIN
                        CREATE UNIQUE INDEX UQ_Notifications_Tid ON dbo.Notifications(Tid) WHERE Tid IS NOT NULL;
                    END
                END";
            context.Database.ExecuteSqlRaw(fkSql);
            logger.LogInformation("Finished checking/applying Post interaction schema updates.");
        }
        catch (Exception ex) 
        { 
            logger.LogError(ex, "CRITICAL: Manual update for QuotePostId failed! This will cause ISE 500 on Post APIs."); 
        }

        // 4. UserSettings
        try
        {
            var sql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'DefaultReplyRestriction')
                BEGIN
                    ALTER TABLE UserSettings ADD DefaultReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'DefaultAllowQuotes')
                BEGIN
                    ALTER TABLE UserSettings ADD DefaultAllowQuotes BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnableTrending')
                BEGIN
                    ALTER TABLE UserSettings ADD EnableTrending BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnableDiscoverVideo')
                BEGIN
                    ALTER TABLE UserSettings ADD EnableDiscoverVideo BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnableTreeView')
                BEGIN
                    ALTER TABLE UserSettings ADD EnableTreeView BIT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'RequireLogoutVisibility')
                BEGIN
                    ALTER TABLE UserSettings ADD RequireLogoutVisibility BIT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'LargerAltBadge')
                BEGIN
                    ALTER TABLE UserSettings ADD LargerAltBadge BIT NULL DEFAULT 0;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowReplies')
                BEGIN
                    ALTER TABLE UserSettings ADD ShowReplies BIT NULL DEFAULT 1;
                    PRINT 'Added ShowReplies to UserSettings';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowReposts')
                BEGIN
                    ALTER TABLE UserSettings ADD ShowReposts BIT NULL DEFAULT 1;
                    PRINT 'Added ShowReposts to UserSettings';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowQuotePosts')
                BEGIN
                    ALTER TABLE UserSettings ADD ShowQuotePosts BIT NULL DEFAULT 1;
                    PRINT 'Added ShowQuotePosts to UserSettings';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowSampleSavedFeeds')
                BEGIN
                    ALTER TABLE UserSettings ADD ShowSampleSavedFeeds BIT NULL DEFAULT 0;
                    PRINT 'Added ShowSampleSavedFeeds to UserSettings';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'SelectedInterests')
                BEGIN
                    ALTER TABLE UserSettings ADD SelectedInterests NVARCHAR(MAX) NULL;
                    PRINT 'Added SelectedInterests to UserSettings';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnabledMediaProviders')
                BEGIN
                    ALTER TABLE UserSettings ADD EnabledMediaProviders NVARCHAR(MAX) NULL;
                    PRINT 'Added EnabledMediaProviders to UserSettings';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'NotifyActivity')
                BEGIN
                    ALTER TABLE UserSettings ADD NotifyActivity BIT NULL DEFAULT 1;
                    PRINT 'Added NotifyActivity to UserSettings';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'NotifyLikesOfReposts')
                BEGIN
                    ALTER TABLE UserSettings ADD NotifyLikesOfReposts BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'NotifyRepostsOfReposts')
                BEGIN
                    ALTER TABLE UserSettings ADD NotifyRepostsOfReposts BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'NotifyOthers')
                BEGIN
                    ALTER TABLE UserSettings ADD NotifyOthers BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'PushNotifyActivity')
                BEGIN
                    ALTER TABLE UserSettings ADD PushNotifyActivity BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'PushNotifyLikesOfReposts')
                BEGIN
                    ALTER TABLE UserSettings ADD PushNotifyLikesOfReposts BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'PushNotifyRepostsOfReposts')
                BEGIN
                    ALTER TABLE UserSettings ADD PushNotifyRepostsOfReposts BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'PushNotifyOthers')
                BEGIN
                    ALTER TABLE UserSettings ADD PushNotifyOthers BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'InAppNotifyActivity')
                BEGIN
                    ALTER TABLE UserSettings ADD InAppNotifyActivity BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'InAppNotifyLikesOfReposts')
                BEGIN
                    ALTER TABLE UserSettings ADD InAppNotifyLikesOfReposts BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'InAppNotifyRepostsOfReposts')
                BEGIN
                    ALTER TABLE UserSettings ADD InAppNotifyRepostsOfReposts BIT NULL DEFAULT 1;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'InAppNotifyOthers')
                BEGIN
                    ALTER TABLE UserSettings ADD InAppNotifyOthers BIT NULL DEFAULT 1;
                END
";
            context.Database.ExecuteSqlRaw(sql);
            logger.LogInformation("Verified/Applied UserSettings resilience columns.");
        }
        catch (Exception ex) { logger.LogError(ex, "Manual update block 4 (UserSettings) failed. This WILL cause 500 errors in feeds if columns are missing."); }

        // 5. Hashtags and Other Tables
        try
        {
            var sql = @"
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
                END
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
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'ListId')
                BEGIN
                    ALTER TABLE Notifications ADD ListId UNIQUEIDENTIFIER NULL;
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ListMembers') AND name = 'Status')
                BEGIN
                    ALTER TABLE ListMembers ADD Status INT NOT NULL DEFAULT 0;
                END
                -- Cleanup and Recalculations
                EXEC('IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(''dbo.ListMembers'') AND name = ''Status'') UPDATE ListMembers SET Status = 1 WHERE Status = 0');
                DELETE FROM Notifications WHERE Type = 'message';
                UPDATE u SET u.PostsCount = sub.ActualCount FROM Users u INNER JOIN (SELECT AuthorId, COUNT(*) AS ActualCount FROM Posts WHERE IsDeleted = 0 OR IsDeleted IS NULL GROUP BY AuthorId) sub ON u.Id = sub.AuthorId WHERE u.PostsCount != sub.ActualCount OR u.PostsCount IS NULL;
                UPDATE Users SET PostsCount = 0 WHERE PostsCount IS NULL AND Id NOT IN (SELECT DISTINCT AuthorId FROM Posts WHERE IsDeleted = 0 OR IsDeleted IS NULL);
                UPDATE Users SET Role = 'admin' WHERE Username = 'trungtrung';
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SupportRequests' AND xtype='U')
                BEGIN
                    CREATE TABLE SupportRequests (
                        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                        Email NVARCHAR(256) NOT NULL,
                        Description NVARCHAR(MAX) NOT NULL,
                        Username NVARCHAR(256) NULL,
                        Category NVARCHAR(50) NOT NULL,
                        DeviceType NVARCHAR(20) NOT NULL,
                        Status NVARCHAR(20) NOT NULL DEFAULT 'pending',
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        UserId UNIQUEIDENTIFIER NULL,
                        CONSTRAINT FK_Support_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL
                    )
                END;

                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PageContents' AND xtype='U')
                BEGIN
                    CREATE TABLE PageContents (
                        Slug NVARCHAR(100) PRIMARY KEY,
                        Title NVARCHAR(200) NOT NULL,
                        HtmlContent NVARCHAR(MAX) NOT NULL,
                        UpdatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE()
                    )
                END;

                IF NOT EXISTS (SELECT * FROM PageContents WHERE Slug = 'privacy-policy')
                BEGIN
                    INSERT INTO PageContents (Slug, Title, HtmlContent, UpdatedAt)
                    VALUES ('privacy-policy', 'Privacy Policy', '<h1>Privacy Policy</h1><p>This is the default privacy policy. Please edit it in the Admin UI.</p>', GETUTCDATE())
                END";
            context.Database.ExecuteSqlRaw(sql);
            logger.LogInformation("Applied manual schema updates for Hashtags, Lists, SupportRequests, and Cleanup.");
        }
        catch (Exception ex) { logger.LogWarning(ex, "Manual update block 5 failed."); }

        // 6. Core Entities Resilience (Reposts, Interests, etc.)
        try
        {
            var sql = @"
                -- Reposts Table
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Reposts' AND xtype='U')
                BEGIN
                    CREATE TABLE Reposts (
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        PostId UNIQUEIDENTIFIER NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        Tid NVARCHAR(20) NULL,
                        PRIMARY KEY (UserId, PostId),
                        CONSTRAINT FK_RepostPost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE,
                        CONSTRAINT FK_RepostUser FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created Reposts table';
                END

                -- Interests Table
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Interests' AND xtype='U')
                BEGIN
                    CREATE TABLE Interests (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        Name NVARCHAR(100) NOT NULL,
                        Slug NVARCHAR(100) NOT NULL UNIQUE,
                        Icon NVARCHAR(50) NULL,
                        IsDeleted BIT NOT NULL DEFAULT 0
                    );
                    PRINT 'Created Interests table';
                END

                -- PostInterests Join Table
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PostInterests' AND xtype='U')
                BEGIN
                    CREATE TABLE PostInterests (
                        PostId UNIQUEIDENTIFIER NOT NULL,
                        InterestId INT NOT NULL,
                        PRIMARY KEY (PostId, InterestId),
                        CONSTRAINT FK_PI_Post FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE,
                        CONSTRAINT FK_PI_Interest FOREIGN KEY (InterestId) REFERENCES Interests(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created PostInterests table';
                END

                -- UserInterests Join Table
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UserInterests' AND xtype='U')
                BEGIN
                    CREATE TABLE UserInterests (
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        InterestId INT NOT NULL,
                        PRIMARY KEY (UserId, InterestId),
                        CONSTRAINT FK_UI_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
                        CONSTRAINT FK_UI_Interest FOREIGN KEY (InterestId) REFERENCES Interests(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created UserInterests table';
                END

                -- PostMedia Table
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PostMedia' AND xtype='U')
                BEGIN
                    CREATE TABLE PostMedia (
                        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                        PostId UNIQUEIDENTIFIER NOT NULL,
                        Url NVARCHAR(MAX) NOT NULL,
                        Type NVARCHAR(50) NOT NULL,
                        Position INT NOT NULL DEFAULT 0,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        IsDeleted BIT NOT NULL DEFAULT 0,
                        CONSTRAINT FK_MediaPost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created PostMedia table';
                END

                -- LinkPreviews Table
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LinkPreviews' AND xtype='U')
                BEGIN
                    CREATE TABLE LinkPreviews (
                        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                        PostId UNIQUEIDENTIFIER NULL,
                        MessageId UNIQUEIDENTIFIER NULL,
                        Url NVARCHAR(MAX) NOT NULL,
                        Title NVARCHAR(MAX) NULL,
                        Description NVARCHAR(MAX) NULL,
                        ImageUrl NVARCHAR(MAX) NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_LP_Post FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created LinkPreviews table';
                END

                -- Verify Critical Columns
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'IsDeleted')
                BEGIN
                    ALTER TABLE dbo.Posts ADD IsDeleted BIT NOT NULL DEFAULT 0;
                    PRINT 'Added IsDeleted to Posts';
                END
                
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'RepostsCount')
                BEGIN
                    ALTER TABLE dbo.Posts ADD RepostsCount INT NULL DEFAULT 0;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'LikesCount')
                BEGIN
                    ALTER TABLE dbo.Posts ADD LikesCount INT NULL DEFAULT 0;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'RepliesCount')
                BEGIN
                    ALTER TABLE dbo.Posts ADD RepliesCount INT NULL DEFAULT 0;
                END

                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'BookmarksCount')
                BEGIN
                    ALTER TABLE dbo.Posts ADD BookmarksCount INT NULL DEFAULT 0;
                END
";
            context.Database.ExecuteSqlRaw(sql);
            logger.LogInformation("Applied Block 6 - Core Entities Schema Repair.");
        }
        catch (Exception ex) { logger.LogError(ex, "Manual update block 6 (Core Entities) failed."); }

        // --- MST BACKFILL ---
        if (args.Contains("--backfill-mst"))
        {
            try
            {
                logger.LogInformation("Starting MST Backfill...");
                var mst = services.GetRequiredService<MstService>();
                var repo = services.GetRequiredService<IRepoManager>();
                
                var users = context.Users.ToList();
                foreach (var user in users)
                {
                    logger.LogInformation($"Backfilling MST for user: {user.Handle} ({user.Did})");
                    
                    // Reset root if starting fresh backfill (optional)
                    // user.RepoRoot = null;
                    // context.SaveChanges();

                    // Posts
                    var posts = context.Posts.Where(p => p.AuthorId == user.Id && p.Cid != null && p.Tid != null).ToList();
                    foreach (var p in posts) await mst.UpdateRecordAsync(user.Did, $"app.bsky.feed.post/{p.Tid}", p.Cid);
                    
                    // Likes
                    var likes = context.Likes.Where(l => l.UserId == user.Id && l.Cid != null && l.Tid != null).ToList();
                    foreach (var l in likes) await mst.UpdateRecordAsync(user.Did, $"app.bsky.feed.like/{l.Tid}", l.Cid);

                    // Follows
                    var follows = context.UserFollows.Where(f => f.FollowerId == user.Id && f.Cid != null && f.Tid != null).ToList();
                    foreach (var f in follows) await mst.UpdateRecordAsync(user.Did, $"app.bsky.graph.follow/{f.Tid}", f.Cid);

                    // Reposts
                    var reposts = context.Reposts.Where(r => r.UserId == user.Id && r.Cid != null && r.Tid != null).ToList();
                    foreach (var r in reposts) await mst.UpdateRecordAsync(user.Did, $"app.bsky.feed.repost/{r.Tid}", r.Cid);

                    // Final sign to update RepoCommit
                    var currentUser = context.Users.First(u => u.Id == user.Id);
                    if (!string.IsNullOrEmpty(currentUser.RepoRoot)) 
                    {
                        await repo.SignRepoAsync(user.Did, currentUser.RepoRoot);
                        logger.LogInformation($"Signed repo for {user.Handle}. Root: {currentUser.RepoRoot}");
                    }
                }
                logger.LogInformation("MST Backfill completed successfully.");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "MST Backfill failed.");
            }
        }

        // 7. Relationship and System Tables (Follows, Likes, Blocks, Mutes, Conversations)
        try
        {
            var sql = @"
                BEGIN
                    CREATE TABLE UserFollows (
                        FollowerId UNIQUEIDENTIFIER NOT NULL,
                        FollowingId UNIQUEIDENTIFIER NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        Tid NVARCHAR(20) NULL,
                        PRIMARY KEY (FollowerId, FollowingId),
                        CONSTRAINT FK_Follower FOREIGN KEY (FollowerId) REFERENCES Users(Id),
                        CONSTRAINT FK_Following FOREIGN KEY (FollowingId) REFERENCES Users(Id)
                    );
                    PRINT 'Created UserFollows table';
                END

                -- Likes
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Likes' AND xtype='U')
                BEGIN
                    CREATE TABLE Likes (
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        PostId UNIQUEIDENTIFIER NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        Tid NVARCHAR(20) NULL,
                        PRIMARY KEY (UserId, PostId),
                        CONSTRAINT FK_LikeUser FOREIGN KEY (UserId) REFERENCES Users(Id),
                        CONSTRAINT FK_LikePost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created Likes table';
                END

                -- Bookmarks
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Bookmarks' AND xtype='U')
                BEGIN
                    CREATE TABLE Bookmarks (
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        PostId UNIQUEIDENTIFIER NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        Tid NVARCHAR(20) NULL,
                        PRIMARY KEY (UserId, PostId),
                        CONSTRAINT FK_BookmarkUser FOREIGN KEY (UserId) REFERENCES Users(Id),
                        CONSTRAINT FK_BookmarkPost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created Bookmarks table';
                END

                -- BlockedAccounts
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BlockedAccounts' AND xtype='U')
                BEGIN
                    CREATE TABLE BlockedAccounts (
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        BlockedUserId UNIQUEIDENTIFIER NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        PRIMARY KEY (UserId, BlockedUserId),
                        CONSTRAINT FK_BlockedOwner FOREIGN KEY (UserId) REFERENCES Users(Id),
                        CONSTRAINT FK_BlockedUser FOREIGN KEY (BlockedUserId) REFERENCES Users(Id)
                    );
                    PRINT 'Created BlockedAccounts table';
                END

                -- MutedAccounts
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MutedAccounts' AND xtype='U')
                BEGIN
                    CREATE TABLE MutedAccounts (
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        MutedUserId UNIQUEIDENTIFIER NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        PRIMARY KEY (UserId, MutedUserId),
                        CONSTRAINT FK_MutedOwner FOREIGN KEY (UserId) REFERENCES Users(Id),
                        CONSTRAINT FK_MutedUser FOREIGN KEY (MutedUserId) REFERENCES Users(Id)
                    );
                    PRINT 'Created MutedAccounts table';
                END

                -- MutedWords (Full Table if missing)
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='MutedWords' AND xtype='U')
                BEGIN
                    CREATE TABLE MutedWords (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        Word NVARCHAR(256) NOT NULL,
                        MuteBehavior NVARCHAR(20) NOT NULL DEFAULT 'hide',
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        CONSTRAINT FK_MutedWordUser FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
                    );
                    PRINT 'Created MutedWords table';
                END

                -- Conversations
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Conversations' AND xtype='U')
                BEGIN
                    CREATE TABLE Conversations (
                        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        IsDeleted BIT NOT NULL DEFAULT 0,
                        LastMessageId UNIQUEIDENTIFIER NULL
                    );
                    PRINT 'Created Conversations table';
                END

                -- ConversationParticipants
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ConversationParticipants' AND xtype='U')
                BEGIN
                    CREATE TABLE ConversationParticipants (
                        ConversationId UNIQUEIDENTIFIER NOT NULL,
                        UserId UNIQUEIDENTIFIER NOT NULL,
                        JoinedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        PRIMARY KEY (ConversationId, UserId),
                        CONSTRAINT FK_CP_Conv FOREIGN KEY (ConversationId) REFERENCES Conversations(Id),
                        CONSTRAINT FK_CP_User FOREIGN KEY (UserId) REFERENCES Users(Id)
                    );
                    PRINT 'Created ConversationParticipants table';
                END

                -- Messages
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Messages' AND xtype='U')
                BEGIN
                    CREATE TABLE Messages (
                        Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
                        ConversationId UNIQUEIDENTIFIER NOT NULL,
                        SenderId UNIQUEIDENTIFIER NOT NULL,
                        Content NVARCHAR(MAX) NOT NULL,
                        CreatedAt DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
                        IsDeleted BIT NOT NULL DEFAULT 0,
                        IsRead BIT NOT NULL DEFAULT 0,
                        Tid NVARCHAR(20) NULL,
                        ReplyToId UNIQUEIDENTIFIER NULL,
                        CONSTRAINT FK_MsgConv FOREIGN KEY (ConversationId) REFERENCES Conversations(Id),
                        CONSTRAINT FK_MsgSender FOREIGN KEY (SenderId) REFERENCES Users(Id)
                    );
                    PRINT 'Created Messages table';
                END
";
            context.Database.ExecuteSqlRaw(sql);
            logger.LogInformation("Applied Block 7 - Relationship and System Schema Repair.");
        }
        catch (Exception ex) { logger.LogError(ex, "Manual update block 7 (Relationships) failed."); }

        // 8. AT Protocol Metadata Columns (Likes, Reposts, Follows, Bookmarks, Media)
        try
        {
            var sql = @"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Likes') AND name = 'Cid')
                BEGIN
                    ALTER TABLE dbo.Likes ADD Cid NVARCHAR(100) NULL, Uri NVARCHAR(200) NULL;
                    PRINT 'Added Cid and Uri to Likes';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Reposts') AND name = 'Cid')
                BEGIN
                    ALTER TABLE dbo.Reposts ADD Cid NVARCHAR(100) NULL, Uri NVARCHAR(200) NULL;
                    PRINT 'Added Cid and Uri to Reposts';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserFollows') AND name = 'Cid')
                BEGIN
                    ALTER TABLE dbo.UserFollows ADD Cid NVARCHAR(100) NULL, Uri NVARCHAR(200) NULL;
                    PRINT 'Added Cid and Uri to UserFollows';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Bookmarks') AND name = 'Cid')
                BEGIN
                    ALTER TABLE dbo.Bookmarks ADD Cid NVARCHAR(100) NULL, Uri NVARCHAR(200) NULL;
                    PRINT 'Added Cid and Uri to Bookmarks';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Bookmarks') AND name = 'Tid')
                BEGIN
                    ALTER TABLE dbo.Bookmarks ADD Tid NVARCHAR(20) NULL;
                    PRINT 'Added Tid to Bookmarks';
                END
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.PostMedia') AND name = 'Cid')
                BEGIN
                    ALTER TABLE dbo.PostMedia ADD Cid NVARCHAR(100) NULL;
                    PRINT 'Added Cid to PostMedia';
                END";
            context.Database.ExecuteSqlRaw(sql);
            logger.LogInformation("Applied Block 8 - AT Protocol Metadata Schema Repair.");
        }
        catch (Exception ex) { logger.LogError(ex, "Manual update block 8 (AT Metadata) failed."); }


        // --- SEED AI FEEDS AND INTERESTS ---
        try
        {
            var feedService = services.GetRequiredService<IFeedService>();
            await feedService.PreSeedFeedsAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred during AI feed seeding.");
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while migrating the database.");
    }

    if (args.Contains("--test-mst"))
    {
        await MstTestRunner.RunTests(services);
        Environment.Exit(0);
    }

    if (args.Contains("--seed-sync-test"))
    {
        await MstTestRunner.SeedRepo(services);
        Environment.Exit(0);
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