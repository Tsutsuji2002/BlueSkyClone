using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class ListMember
{
    public Guid ListId { get; set; }

    public Guid UserId { get; set; }

    public DateTime? JoinedAt { get; set; }
    
    public int Status { get; set; } = 0; // 0=Pending, 1=Accepted, 2=Rejected

    public virtual List List { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
