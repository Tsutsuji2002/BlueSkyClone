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
    public bool? NotifyMentions { get; set; }
    public bool? NotifyQuotes { get; set; }
    public bool? NotifyReposts { get; set; }

    public bool? PushNotifyLikes { get; set; }
    public bool? PushNotifyFollowers { get; set; }
    public bool? PushNotifyReplies { get; set; }
    public bool? PushNotifyMentions { get; set; }
    public bool? PushNotifyQuotes { get; set; }
    public bool? PushNotifyReposts { get; set; }

    public bool? InAppNotifyLikes { get; set; }
    public bool? InAppNotifyFollowers { get; set; }
    public bool? InAppNotifyReplies { get; set; }
    public bool? InAppNotifyMentions { get; set; }
    public bool? InAppNotifyQuotes { get; set; }
    public bool? InAppNotifyReposts { get; set; }

    public string? DefaultReplyRestriction { get; set; }
    public bool? DefaultAllowQuotes { get; set; }
    public int? FontSize { get; set; }
    public bool? EnableTrending { get; set; }
    public bool? EnableDiscoverVideo { get; set; }
    public bool? EnableTreeView { get; set; }
    public bool? RequireLogoutVisibility { get; set; }
    public bool? LargerAltBadge { get; set; }

    public virtual User User { get; set; } = null!;
}
