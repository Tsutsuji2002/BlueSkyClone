using System;

namespace BSkyClone.Models;

public class LinkPreview
{
    public Guid Id { get; set; }
    public string Url { get; set; } = null!;
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Image { get; set; }
    public string? Domain { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Guid? PostId { get; set; }
    public virtual Post? Post { get; set; }

    public Guid? MessageId { get; set; }
    public virtual Message? Message { get; set; }
}
