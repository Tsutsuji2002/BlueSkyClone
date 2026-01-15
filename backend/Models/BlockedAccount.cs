using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class BlockedAccount
{
    public Guid UserId { get; set; }

    public Guid BlockedUserId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual User BlockedUser { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
