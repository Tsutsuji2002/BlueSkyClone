using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class UserSetting
{
    public Guid UserId { get; set; }

    public string? AdultContentFilter { get; set; }

    public bool? EnableAdultContent { get; set; }

    public string? SortReplies { get; set; }

    public bool? RequireAltText { get; set; }

    public bool? AutoplayVideoGif { get; set; }

    public string? AppLanguage { get; set; }

    public string? ThemeMode { get; set; }

    public bool? NotifyLikes { get; set; }

    public bool? NotifyFollowers { get; set; }

    public bool? NotifyReplies { get; set; }

    public string? DefaultReplyRestriction { get; set; }

    public bool? DefaultAllowQuotes { get; set; }

    public int? FontSize { get; set; }

    public virtual User User { get; set; } = null!;
}
