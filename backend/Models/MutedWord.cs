using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class MutedWord
{
    public int Id { get; set; }

    public Guid UserId { get; set; }

    public string Word { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
