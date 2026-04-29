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
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddMemoryCache();
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
});

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
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() 
            ?? new[] { "https://bskyclone.site", "https://www.bskyclone.site", "http://localhost:3000" };
            
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials()
              .WithExposedHeaders("*");
    });
});

// Database
builder.Services.AddDbContext<BSkyDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions => sqlOptions.EnableRetryOnFailure().CommandTimeout(300))
        .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

// Enable detailed logging for database queries in development
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDbContext<BSkyDbContext>(options =>
        options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
            sqlOptions => sqlOptions.EnableRetryOnFailure().CommandTimeout(300))
            .EnableSensitiveDataLogging()
            .EnableDetailedErrors()
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));
}

// Repository and Unit of Work
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IPostService, PostService>();
builder.Services.AddScoped<IFeedService, FeedService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddHttpClient(Microsoft.Extensions.Options.Options.DefaultName, client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
    client.DefaultRequestHeaders.ConnectionClose = false;
})
.ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(15),
    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(5),
    MaxConnectionsPerServer = 100
});

// Dedicated Bluesky API client with circuit breaker
builder.Services.AddHttpClient("BlueskyClient", client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
    client.DefaultRequestHeaders.Add("User-Agent", "BSkyClone/1.0");
    client.DefaultRequestHeaders.ConnectionClose = false;
})
.ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(15),
    PooledConnectionIdleTimeout = TimeSpan.FromMinutes(5),
    MaxConnectionsPerServer = 100
});
builder.Services.AddScoped<ILinkService, LinkService>();
builder.Services.AddScoped<IRecommendationService, RecommendationService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<IListService, ListService>();
builder.Services.AddScoped<ICacheService, CacheService>();
builder.Services.AddScoped<ICategorizationService, CategorizationService>();
builder.Services.AddScoped<ISearchService, ElasticSearchService>();
builder.Services.AddSingleton<IMLModelService, MLModelService>();
builder.Services.AddSingleton<ThreadReplyCacheService>();

builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<ISupportRequestService, SupportRequestService>();
builder.Services.AddScoped<IRepoManager, RepoManager>();
builder.Services.AddScoped<IPlcService, PlcService>();
builder.Services.AddScoped<MstService>();
builder.Services.AddScoped<IDidResolver, DidResolverService>();
builder.Services.AddScoped<ICryptoService, CryptoService>();
builder.Services.AddScoped<IXrpcProxyService, XrpcProxyService>();
builder.Services.AddScoped<IChatProxyService, ChatProxyService>();
builder.Services.AddScoped<ILabelingService, LabelingService>();
builder.Services.AddSingleton<PerformanceMonitoringService>();
builder.Services.AddHostedService<FirehoseService>();

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
var jwtKey = builder.Configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT signing key (Jwt:Key) is not configured.");
var key = Encoding.ASCII.GetBytes(jwtKey);

builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = true;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(key),
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
            else if (string.IsNullOrEmpty(context.Token) && context.Request.Cookies.TryGetValue("access_token", out var cookieToken))
            {
                context.Token = cookieToken;
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
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");
app.UseRateLimiter(); // Apply rate limiting middleware

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

        // Keep muted-word moderation resilient even if an older deployment missed one of the later schema changes.
        try
        {
            context.Database.ExecuteSqlRaw(@"
IF COL_LENGTH('MutedWords', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [CreatedAt] datetime2 NOT NULL CONSTRAINT [DF_MutedWords_CreatedAt] DEFAULT ((getutcdate()));
END
IF COL_LENGTH('MutedWords', 'MuteBehavior') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [MuteBehavior] nvarchar(20) NOT NULL CONSTRAINT [DF_MutedWords_MuteBehavior] DEFAULT N'hide';
END
IF COL_LENGTH('MutedWords', 'Targets') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [Targets] nvarchar(50) NOT NULL CONSTRAINT [DF_MutedWords_Targets] DEFAULT N'content';
END
IF COL_LENGTH('MutedWords', 'ExpiresAt') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [ExpiresAt] datetime2 NULL;
END
IF COL_LENGTH('MutedWords', 'ExcludeFollowing') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [ExcludeFollowing] bit NOT NULL CONSTRAINT [DF_MutedWords_ExcludeFollowing] DEFAULT ((0));
END
");
            logger.LogInformation("Verified muted word schema.");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to verify muted word schema.");
        }


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
