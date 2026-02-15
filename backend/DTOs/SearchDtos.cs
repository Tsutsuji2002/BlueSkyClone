namespace BSkyClone.DTOs;

public class PostIndex
{
    public Guid Id { get; set; }
    public string Content { get; set; }
    public string AuthorHandle { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<string> Hashtags { get; set; } = new();
}

public class UserIndex
{
    public Guid Id { get; set; }
    public string Handle { get; set; }
    public string Username { get; set; }
    public string DisplayName { get; set; }
    public string Bio { get; set; }
    public string AvatarUrl { get; set; }
}
