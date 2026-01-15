using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class List
{
    public Guid Id { get; set; }

    public Guid OwnerId { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public string? Purpose { get; set; }

    public string? AvatarUrl { get; set; }

    public DateTime? CreatedAt { get; set; }

    public bool? IsDeleted { get; set; }

    public virtual ICollection<ListMember> ListMembers { get; set; } = new List<ListMember>();

    public virtual User Owner { get; set; } = null!;

    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
}
