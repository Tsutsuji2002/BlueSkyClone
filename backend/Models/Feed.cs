using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Feed
{
    public Guid Id { get; set; }

    public string Tid { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string Handle { get; set; } = null!;

    public string? AvatarUrl { get; set; }

    public Guid? CreatorId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public int? SubscribersCount { get; set; }

    public bool? IsDeleted { get; set; }

    public bool IsOfficial { get; set; } = false;

    public virtual User? Creator { get; set; }

    public virtual ICollection<UserFeedSubscription> UserFeedSubscriptions { get; set; } = new List<UserFeedSubscription>();
}
