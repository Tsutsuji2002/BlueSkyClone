namespace BSkyClone.DTOs;

public class PostIndex
{
    public Guid Id { get; set; }
    public string Content { get; set; } = null!;
    public string AuthorHandle { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public List<string> Hashtags { get; set; } = new();
    public Guid? QuotePostId { get; set; }
}

public class UserIndex
{
    public Guid Id { get; set; }
    public string Handle { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string DisplayName { get; set; } = null!;
    public string Bio { get; set; } = null!;
    public string AvatarUrl { get; set; } = null!;
}
