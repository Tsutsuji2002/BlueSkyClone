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
    
    public string? Uri { get; set; }
    public string? Cid { get; set; }

    public virtual ICollection<ListMember> ListMembers { get; set; } = new List<ListMember>();

    public virtual User Owner { get; set; } = null!;

    public virtual ICollection<Post> Posts { get; set; } = new List<Post>(); // Existing, possibly unused?

    public virtual ICollection<ListPost> ListPosts { get; set; } = new List<ListPost>();
    
    public bool IsCurated { get; set; } = false;
}
