using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Hashtag
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string Slug { get; set; } = null!;

    public int? PostsCount { get; set; }

    public DateTime? CreatedAt { get; set; }

    public bool? IsDeleted { get; set; }

    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();
}
