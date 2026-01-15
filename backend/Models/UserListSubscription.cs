using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class UserListSubscription
{
    public Guid UserId { get; set; }
    public Guid ListId { get; set; }
    public DateTime CreatedAt { get; set; }
    public int PinnedOrder { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual List List { get; set; } = null!;
}
