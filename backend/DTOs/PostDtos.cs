using BSkyClone.Models;

namespace BSkyClone.DTOs;

public class PostDto
{
    public Guid Id { get; set; }
    public string Tid { get; set; } = null!;
    public string? Content { get; set; }
    public DateTime? CreatedAt { get; set; }
    public AuthorDto Author { get; set; } = null!;
    public List<string> ImageUrls { get; set; } = new();
    public int LikesCount { get; set; }
    public int RepostsCount { get; set; }
    public int RepliesCount { get; set; }
    public Guid? ReplyToPostId { get; set; }
    public string? ReplyToHandle { get; set; }
    public Guid? RootPostId { get; set; }
    public bool IsLiked { get; set; }
    public bool IsBookmarked { get; set; }
    public bool IsReposted { get; set; }
    public LinkPreviewDto? LinkPreview { get; set; }
}

public class LinkPreviewDto
{
    public string Url { get; set; } = null!;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? Domain { get; set; }
}

public class AuthorDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = null!;
    public string Handle { get; set; } = null!;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsFollowing { get; set; }
}

public class CreatePostRequest
{
    public string? Content { get; set; }
    public List<IFormFile>? Images { get; set; }
    public Guid? ReplyToPostId { get; set; }
    public Guid? RootPostId { get; set; }
}

public class FeedDto
{
    public Guid Id { get; set; }
    public string Tid { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string? Description { get; set; }
    public string Handle { get; set; } = null!;
    public string? AvatarUrl { get; set; }
    public AuthorDto? Creator { get; set; }
    public int SubscribersCount { get; set; }
    public bool IsPinned { get; set; }
    public int PinnedOrder { get; set; }
    public bool IsSubscribed { get; set; }
}
