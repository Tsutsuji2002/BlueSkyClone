using System;

namespace BSkyClone.Models;

public partial class HiddenRepostAccount
{
    public Guid UserId { get; set; }

    public Guid TargetUserId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual User TargetUser { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
