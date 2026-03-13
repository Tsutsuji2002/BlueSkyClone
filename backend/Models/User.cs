using System;
using System.Collections.Generic;

namespace BSkyClone.Models;

public partial class User
{
    public Guid Id { get; set; }

    public string Did { get; set; } = null!;
    public string? SigningPublicKey { get; set; }

    public string Username { get; set; } = null!;

    public string Handle { get; set; } = null!;

    public string Role { get; set; } = "user";

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string Salt { get; set; } = null!;

    public string? DisplayName { get; set; }

    public string? AvatarUrl { get; set; }

    public string? CoverImageUrl { get; set; }

    public string? Bio { get; set; }

    public string? Location { get; set; }

    public string? Website { get; set; }

    public DateTime? DateOfBirth { get; set; }

    public int? FollowersCount { get; set; }

    public int? FollowingCount { get; set; }

    public int? PostsCount { get; set; }

    public DateTime? CreatedAt { get; set; }

    public DateTime? LastLoginAt { get; set; }

    public bool? IsOnline { get; set; }

    public bool? IsPrivate { get; set; }

    public bool? IsDeleted { get; set; }

    public bool IsBanned { get; set; } = false;

    public bool IsVerified { get; set; } = false;

    public virtual ICollection<BlockedAccount> BlockedAccountBlockedUsers { get; set; } = new List<BlockedAccount>();

    public virtual ICollection<BlockedAccount> BlockedAccountUsers { get; set; } = new List<BlockedAccount>();

    public virtual ICollection<Bookmark> Bookmarks { get; set; } = new List<Bookmark>();

    public virtual ICollection<ConversationParticipant> ConversationParticipants { get; set; } = new List<ConversationParticipant>();

    public virtual ICollection<Feed> Feeds { get; set; } = new List<Feed>();

    public virtual ICollection<Like> Likes { get; set; } = new List<Like>();

    public virtual ICollection<ListMember> ListMembers { get; set; } = new List<ListMember>();

    public virtual ICollection<List> Lists { get; set; } = new List<List>();

    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();

    public virtual ICollection<MutedAccount> MutedAccountMutedUsers { get; set; } = new List<MutedAccount>();

    public virtual ICollection<MutedAccount> MutedAccountUsers { get; set; } = new List<MutedAccount>();

    public virtual ICollection<MutedWord> MutedWords { get; set; } = new List<MutedWord>();

    public virtual ICollection<Notification> NotificationRecipients { get; set; } = new List<Notification>();

    public virtual ICollection<Notification> NotificationSenders { get; set; } = new List<Notification>();

    public virtual ICollection<Post> Posts { get; set; } = new List<Post>();

    public virtual ICollection<Repost> Reposts { get; set; } = new List<Repost>();

    public virtual ICollection<UserFeedSubscription> UserFeedSubscriptions { get; set; } = new List<UserFeedSubscription>();

    public virtual ICollection<UserFollow> UserFollowFollowers { get; set; } = new List<UserFollow>();

    public virtual ICollection<UserFollow> UserFollowFollowings { get; set; } = new List<UserFollow>();

    public virtual UserSetting? UserSetting { get; set; }

    public virtual ICollection<Interest> Interests { get; set; } = new List<Interest>();
}
