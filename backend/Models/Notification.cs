using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Notification
{
    public Guid Id { get; set; }

    public string Tid { get; set; } = null!;

    public string? Type { get; set; }

    public Guid RecipientId { get; set; }

    public Guid SenderId { get; set; }

    public Guid? PostId { get; set; }
    public Guid? ListId { get; set; }

    public bool? IsRead { get; set; }
    public string? Content { get; set; }
    public string? Title { get; set; }
    public DateTime? CreatedAt { get; set; }

    public bool? IsDeleted { get; set; }


    public virtual User Recipient { get; set; } = null!;

    public virtual User Sender { get; set; } = null!;

    public virtual Post? Post { get; set; }
}
