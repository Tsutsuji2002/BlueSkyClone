using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Conversation
{
    public Guid Id { get; set; }

    public DateTime? CreatedAt { get; set; }

    public Guid? LastMessageId { get; set; }

    public bool? IsDeleted { get; set; }
    
    public bool IsAccepted { get; set; } = true;
    
    public string? GroupName { get; set; }
    
    public string? BlueskyConvoId { get; set; }

    public virtual ICollection<ConversationParticipant> ConversationParticipants { get; set; } = new List<ConversationParticipant>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}
