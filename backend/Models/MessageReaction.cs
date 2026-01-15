using System;

namespace BSkyClone.Models;

public class MessageReaction
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid UserId { get; set; }
    public string Emoji { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public virtual Message Message { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
