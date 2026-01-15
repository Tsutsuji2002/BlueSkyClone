using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class PostMedium
{
    public Guid Id { get; set; }

    public Guid PostId { get; set; }

    public string? Type { get; set; }

    public string Url { get; set; } = null!;

    public string? AltText { get; set; }

    public int? Position { get; set; }

    public bool? IsDeleted { get; set; }

    public DateTime CreatedAt { get; set; }


    public virtual Post Post { get; set; } = null!;
}

