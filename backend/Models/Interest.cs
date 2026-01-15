using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Interest
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public string? Icon { get; set; }

    public bool? IsDeleted { get; set; }

    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();

    public virtual ICollection<User> Users { get; set; } = new List<User>();
}
