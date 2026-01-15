using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class MutedAccount
{
    public Guid UserId { get; set; }

    public Guid MutedUserId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual User MutedUser { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
