using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class UserFollow
{
    public Guid FollowerId { get; set; }

    public Guid FollowingId { get; set; }

    public DateTime? CreatedAt { get; set; }
    public string Tid { get; set; } = null!;

    public virtual User Follower { get; set; } = null!;

    public virtual User Following { get; set; } = null!;
}
