using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class UserFeedSubscription
{
    public Guid UserId { get; set; }

    public Guid FeedId { get; set; }

    public bool? IsPinned { get; set; }

    public int? PinnedOrder { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Feed Feed { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
