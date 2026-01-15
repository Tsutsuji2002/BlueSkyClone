using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class ListMember
{
    public Guid ListId { get; set; }

    public Guid UserId { get; set; }

    public DateTime? JoinedAt { get; set; }

    public virtual List List { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
