using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class MutedWord
{
    public int Id { get; set; }

    public Guid UserId { get; set; }

    public string Word { get; set; } = null!;

    public string MuteBehavior { get; set; } = "hide";
    public string Targets { get; set; } = "content"; // "content", "tag", or "content,tag"
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public virtual User User { get; set; } = null!;
}
