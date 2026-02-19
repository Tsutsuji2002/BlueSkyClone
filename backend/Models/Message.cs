using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Message
{
    public Guid Id { get; set; }

    public string Tid { get; set; } = null!;

    public Guid ConversationId { get; set; }

    public Guid SenderId { get; set; }

    public string? Content { get; set; }
    public string? ImageUrl { get; set; }
    public string? AltText { get; set; }

    public DateTime? CreatedAt { get; set; }

    public bool? IsRead { get; set; }
    public bool IsModified { get; set; }
    public bool IsRecalled { get; set; }
    public bool? IsDeleted { get; set; }

    public Guid? ReplyToId { get; set; }
    public virtual Message? ReplyTo { get; set; }

    public virtual Conversation Conversation { get; set; } = null!;
    public virtual User Sender { get; set; } = null!;
    public virtual LinkPreview? LinkPreview { get; set; }
    public virtual ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
}
