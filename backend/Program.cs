using BSkyClone.Models;
using BSkyClone.Repositories;
using BSkyClone.Services;
using BSkyClone.UnitOfWork;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();

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
        sqlOptions => sqlOptions.EnableRetryOnFailure()));

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

// Redis Caching
builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = builder.Configuration["Redis:ConnectionString"] ?? "localhost:6379";
    options.InstanceName = "BSky_";
});

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
                    END";
                context.Database.ExecuteSqlRaw(modSql);

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
                EXEC('UPDATE ListMembers SET Status = 1 WHERE Status = 0');
                ";
            context.Database.ExecuteSqlRaw(sql);
        }
        catch (Exception ex)
        {
            var logger = services.GetRequiredService<ILogger<Program>>();
            logger.LogWarning(ex, "An error occurred during manual schema updates. Continuing...");
        }

        // Apply any pending migrations
        context.Database.Migrate();
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