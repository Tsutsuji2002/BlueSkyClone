using BSkyClone.DTOs;
using BSkyClone.Models;
using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.QueryDsl;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Services;

public class ElasticSearchService : ISearchService
{
    private readonly ElasticsearchClient _client;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ElasticSearchService> _logger;

    public ElasticSearchService(ElasticsearchClient client, IServiceScopeFactory scopeFactory, ILogger<ElasticSearchService> logger)
    {
        _client = client;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task IndexPostAsync(Post post)
    {
        var postIndex = new PostIndex
        {
            Id = post.Id,
            Content = post.Content ?? "",
            AuthorHandle = post.Author?.Handle ?? "",
            CreatedAt = post.CreatedAt ?? DateTime.UtcNow,
            Hashtags = post.Hashtags?.Select(h => h.Name).ToList() ?? new List<string>()
        };

        var response = await _client.IndexAsync(postIndex, idx => idx.Index("posts").Id(post.Id));
        if (!response.IsValidResponse)
        {
            _logger.LogError("Failed to index post {PostId}: {DebugInformation}", post.Id, response.DebugInformation);
        }
    }

    public async Task DeletePostAsync(Guid postId)
    {
        var response = await _client.DeleteAsync<PostIndex>(postId, idx => idx.Index("posts"));
        if (!response.IsValidResponse)
        {
            _logger.LogError("Failed to delete post {PostId} from index: {DebugInformation}", postId, response.DebugInformation);
        }
    }

    public async Task IndexUserAsync(User user)
    {
        var userIndex = new UserIndex
        {
            Id = user.Id,
            Handle = user.Handle,
            Username = user.Username,
            DisplayName = user.DisplayName ?? "",
            Bio = user.Bio ?? "",
            AvatarUrl = user.AvatarUrl ?? ""
        };

        var response = await _client.IndexAsync(userIndex, idx => idx.Index("users").Id(user.Id));
        if (!response.IsValidResponse)
        {
            _logger.LogError("Failed to index user {UserId}: {DebugInformation}", user.Id, response.DebugInformation);
        }
    }

    public async Task<IEnumerable<Guid>> SearchPostsAsync(string query, int skip = 0, int take = 20)
    {
        var response = await _client.SearchAsync<PostIndex>(s => s
            .Index("posts")
            .From(skip)
            .Size(take)
            .Query(q => q
                .MultiMatch(mm => mm
                    .Query(query)
                    .Fields(new[] { "content", "hashtags" })
                    .Fuzziness(new Fuzziness("AUTO"))
                )
            )
        );

        if (!response.IsValidResponse)
        {
            _logger.LogError("Failed to search posts: {DebugInformation}", response.DebugInformation);
            return Enumerable.Empty<Guid>();
        }

        return response.Documents.Select(d => d.Id);
    }

    public async Task<IEnumerable<Guid>> SearchUsersAsync(string query, int skip = 0, int take = 20)
    {
        var response = await _client.SearchAsync<UserIndex>(s => s
            .Index("users")
            .From(skip)
            .Size(take)
            .Query(q => q
                .MultiMatch(mm => mm
                    .Query(query)
                    .Fields(new[] { "handle", "username", "displayName", "bio" })
                    .Fuzziness(new Fuzziness("AUTO"))
                )
            )
        );

        if (!response.IsValidResponse)
        {
            _logger.LogError("Failed to search users: {DebugInformation}", response.DebugInformation);
            return Enumerable.Empty<Guid>();
        }

        return response.Documents.Select(d => d.Id);
    }

    public async Task ReindexAllAsync()
    {
        // Run in background to avoid blocking
        _ = Task.Run(async () =>
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<BSkyDbContext>();

            _logger.LogInformation("Starting Reindex All...");

            // 1. Reindex Users
            var users = await context.Users.AsNoTracking().ToListAsync();
            foreach (var user in users)
            {
                await IndexUserAsync(user);
            }
            _logger.LogInformation("Reindexed {Count} users.", users.Count);

            // 2. Reindex Posts
            var posts = await context.Posts
                .Include(p => p.Author)
                .Include(p => p.Hashtags)
                .AsNoTracking()
                .ToListAsync();

            foreach (var post in posts)
            {
                await IndexPostAsync(post);
            }
            _logger.LogInformation("Reindexed {Count} posts.", posts.Count);
        });
    }
}
