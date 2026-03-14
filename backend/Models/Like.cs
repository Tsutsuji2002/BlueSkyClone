using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class Like
{
    public Guid UserId { get; set; }

    public Guid PostId { get; set; }

    public string Tid { get; set; } = null!;
    public string? Cid { get; set; }
    public string? Uri { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Post Post { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
