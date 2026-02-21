using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace BSkyClone.Models;

public partial class BSkyDbContext : DbContext
{
    public BSkyDbContext()
    {
    }

    public BSkyDbContext(DbContextOptions<BSkyDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<BlockedAccount> BlockedAccounts { get; set; }

    public virtual DbSet<Bookmark> Bookmarks { get; set; }

    public virtual DbSet<Conversation> Conversations { get; set; }

    public virtual DbSet<ConversationParticipant> ConversationParticipants { get; set; }

    public virtual DbSet<Feed> Feeds { get; set; }

    public virtual DbSet<Hashtag> Hashtags { get; set; }

    public virtual DbSet<Interest> Interests { get; set; }

    public virtual DbSet<Like> Likes { get; set; }

    public virtual DbSet<LinkPreview> LinkPreviews { get; set; }

    public virtual DbSet<List> Lists { get; set; }

    public virtual DbSet<ListMember> ListMembers { get; set; }

    public virtual DbSet<Message> Messages { get; set; }
    public virtual DbSet<MessageReaction> MessageReactions { get; set; }

    public virtual DbSet<MutedAccount> MutedAccounts { get; set; }

    public virtual DbSet<MutedWord> MutedWords { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Post> Posts { get; set; }

    public virtual DbSet<PostMedium> PostMedia { get; set; }

    public virtual DbSet<Repost> Reposts { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserFeedSubscription> UserFeedSubscriptions { get; set; }

    public virtual DbSet<UserFollow> UserFollows { get; set; }

    public virtual DbSet<UserSetting> UserSettings { get; set; }

    public virtual DbSet<UserListSubscription> UserListSubscriptions { get; set; }

    public virtual DbSet<ListPost> ListPosts { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<BlockedAccount>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.BlockedUserId }).HasName("PK__BlockedA__0A8170EB918D5838");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.BlockedUser).WithMany(p => p.BlockedAccountBlockedUsers)
                .HasForeignKey(d => d.BlockedUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BlockedUser");

            entity.HasOne(d => d.User).WithMany(p => p.BlockedAccountUsers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BlockedOwner");
        });

        modelBuilder.Entity<Bookmark>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.PostId }).HasName("PK__Bookmark__8D29EA4D4F993AF5");

            entity.HasIndex(e => e.Tid, "UQ__Bookmark__C451DB30DF335A92").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Tid).HasMaxLength(20);

            entity.HasOne(d => d.Post).WithMany(p => p.Bookmarks)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_BookmarkPost");

            entity.HasOne(d => d.User).WithMany(p => p.Bookmarks)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BookmarkUser");
        });

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Conversa__3214EC0776FD5532");

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
        });

        modelBuilder.Entity<ConversationParticipant>(entity =>
        {
            entity.HasKey(e => new { e.ConversationId, e.UserId }).HasName("PK__Conversa__112854B3CF95C0F9");

            entity.Property(e => e.JoinedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.Conversation).WithMany(p => p.ConversationParticipants)
                .HasForeignKey(d => d.ConversationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CP_Conv");

            entity.HasOne(d => d.User).WithMany(p => p.ConversationParticipants)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_CP_User");
        });

        modelBuilder.Entity<Feed>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Feeds__3214EC0733EF47B5");

            entity.HasIndex(e => e.Tid, "UQ__Feeds__C451DB30DDF6B147").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Handle).HasMaxLength(256);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Name).HasMaxLength(256);
            entity.Property(e => e.SubscribersCount).HasDefaultValue(0);
            entity.Property(e => e.Tid).HasMaxLength(20);

            entity.HasOne(d => d.Creator).WithMany(p => p.Feeds)
                .HasForeignKey(d => d.CreatorId)
                .HasConstraintName("FK_FeedCreator");
        });

        modelBuilder.Entity<Interest>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Interest__3214EC071202F311");

            entity.HasIndex(e => e.Slug, "UQ__Interest__BC7B5FB60749EE1D").IsUnique();

            entity.Property(e => e.Icon).HasMaxLength(50);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Slug).HasMaxLength(100);
        });

        modelBuilder.Entity<Like>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.PostId }).HasName("PK__Likes__8D29EA4DA4FAA6F6");

            entity.HasIndex(e => e.Tid, "UQ__Likes__C451DB30B024EDAB").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Tid).HasMaxLength(20);

            entity.HasOne(d => d.Post).WithMany(p => p.Likes)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_LikePost");

            entity.HasOne(d => d.User).WithMany(p => p.Likes)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LikeUser");
        });

        modelBuilder.Entity<List>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Lists__3214EC07397CB41F");

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.Name).HasMaxLength(256);
            entity.Property(e => e.Purpose)
                .HasMaxLength(50)
                .HasDefaultValue("social");
            entity.Property(e => e.IsCurated).HasDefaultValue(false);

            entity.HasOne(d => d.Owner).WithMany(p => p.Lists)
                .HasForeignKey(d => d.OwnerId)
                .HasConstraintName("FK_ListOwner");
        });

        modelBuilder.Entity<ListMember>(entity =>
        {
            entity.HasKey(e => new { e.ListId, e.UserId }).HasName("PK__ListMemb__32FBA4C18A09448F");

            entity.Property(e => e.JoinedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.List).WithMany(p => p.ListMembers)
                .HasForeignKey(d => d.ListId)
                .HasConstraintName("FK_LM_List");

            entity.HasOne(d => d.User).WithMany(p => p.ListMembers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LM_User");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Messages__3214EC0740CF255F");

            entity.HasIndex(e => e.Tid, "UQ__Messages__C451DB300D86D8F0").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.IsRead).HasDefaultValue(false);
            entity.Property(e => e.Tid).HasMaxLength(20);
            entity.Property(e => e.IsModified).HasDefaultValue(false);
            entity.Property(e => e.IsRecalled).HasDefaultValue(false);

            entity.HasOne(d => d.Conversation).WithMany(p => p.Messages)
                .HasForeignKey(d => d.ConversationId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MsgConv");

            entity.HasOne(d => d.Sender).WithMany(p => p.Messages)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MsgSender");

            entity.HasOne(d => d.ReplyTo).WithMany()
                .HasForeignKey(d => d.ReplyToId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_MessageReactions");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Emoji).HasMaxLength(50);

            entity.HasOne(d => d.Message).WithMany(p => p.Reactions)
                .HasForeignKey(d => d.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<MutedAccount>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.MutedUserId }).HasName("PK__MutedAcc__2416C501D72C1110");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.MutedUser).WithMany(p => p.MutedAccountMutedUsers)
                .HasForeignKey(d => d.MutedUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MutedUser");

            entity.HasOne(d => d.User).WithMany(p => p.MutedAccountUsers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_MutedOwner");
        });

        modelBuilder.Entity<MutedWord>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__MutedWor__3214EC076609311A");

            entity.Property(e => e.Word).HasMaxLength(256);
            entity.Property(e => e.MuteBehavior)
                .HasMaxLength(20)
                .HasDefaultValue("hide");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.User).WithMany(p => p.MutedWords)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_MutedWordUser");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Notifica__3214EC07E46938FE");

            entity.HasIndex(e => e.RecipientId, "IX_Notifications_RecipientId");

            entity.HasIndex(e => e.Tid, "UQ__Notifica__C451DB3001D0607B").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.IsRead).HasDefaultValue(false);
            entity.Property(e => e.Tid).HasMaxLength(20);
            entity.Property(e => e.Type).HasMaxLength(50);
            entity.Property(e => e.Title).IsRequired(false);
            entity.Property(e => e.Content).IsRequired(false);

            entity.HasOne(d => d.Recipient).WithMany(p => p.NotificationRecipients)
                .HasForeignKey(d => d.RecipientId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NotifRecipient");

            entity.HasOne(d => d.Sender).WithMany(p => p.NotificationSenders)
                .HasForeignKey(d => d.SenderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_NotifSender");
        });

        modelBuilder.Entity<Post>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Posts__3214EC07CB992B89");

            entity.HasIndex(e => e.RootPostId, "IX_Posts_RootPostId");

            entity.HasIndex(e => e.Tid, "IX_Posts_Tid");

            entity.HasIndex(e => e.Tid, "UQ__Posts__C451DB308F8113F0").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.AllowQuotes).HasDefaultValue(true);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.LikesCount).HasDefaultValue(0);
            entity.Property(e => e.QuotesCount).HasDefaultValue(0);
            entity.Property(e => e.RepliesCount).HasDefaultValue(0);
            entity.Property(e => e.ReplyRestriction)
                .HasMaxLength(20)
                .HasDefaultValue("anyone");
            entity.Property(e => e.RepostsCount).HasDefaultValue(0);
            entity.Property(e => e.Tid).HasMaxLength(20);

            entity.HasOne(d => d.Author).WithMany(p => p.Posts)
                .HasForeignKey(d => d.AuthorId)
                .HasConstraintName("FK_PostAuthor");

            entity.HasOne(d => d.ReplyToPost).WithMany(p => p.InverseReplyToPost)
                .HasForeignKey(d => d.ReplyToPostId)
                .HasConstraintName("FK_PostReply");

            entity.HasOne(d => d.RootPost).WithMany(p => p.InverseRootPost)
                .HasForeignKey(d => d.RootPostId)
                .HasConstraintName("FK_PostRoot");

            entity.HasOne(d => d.QuotePost).WithMany(p => p.InverseQuotePost)
                .HasForeignKey(d => d.QuotePostId)
                .OnDelete(DeleteBehavior.NoAction)
                .HasConstraintName("FK_PostQuote");

            entity.HasMany(d => d.Interests).WithMany(p => p.Posts)
                .UsingEntity<Dictionary<string, object>>(
                    "PostInterest",
                    r => r.HasOne<Interest>().WithMany()
                        .HasForeignKey("InterestId")
                        .HasConstraintName("FK_PI_Interest"),
                    l => l.HasOne<Post>().WithMany()
                        .HasForeignKey("PostId")
                        .HasConstraintName("FK_PI_Post"),
                    j =>
                    {
                        j.HasKey("PostId", "InterestId").HasName("PK__PostInte__C81A52DEA5818FC9");
                        j.ToTable("PostInterests");
                    });

            entity.HasMany(d => d.Lists).WithMany(p => p.Posts)
                .UsingEntity<Dictionary<string, object>>(
                    "PostReplyAllowedList",
                    r => r.HasOne<List>().WithMany()
                        .HasForeignKey("ListId")
                        .OnDelete(DeleteBehavior.ClientSetNull)
                        .HasConstraintName("FK_PRAL_List"),
                    l => l.HasOne<Post>().WithMany()
                        .HasForeignKey("PostId")
                        .HasConstraintName("FK_PRAL_Post"),
                    j =>
                    {
                        j.HasKey("PostId", "ListId").HasName("PK__PostRepl__E42A52989C4F35D5");
                        j.ToTable("PostReplyAllowedLists");
                    });
        });

        modelBuilder.Entity<PostMedium>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__PostMedi__3214EC071ED49D5C");

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);

            entity.Property(e => e.Position).HasDefaultValue(0);
            entity.Property(e => e.Type).HasMaxLength(50);

            entity.HasOne(d => d.Post).WithMany(p => p.PostMedia)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_MediaPost");
        });

        modelBuilder.Entity<Repost>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.PostId }).HasName("PK__Reposts__8D29EA4D0BE60F6C");

            entity.HasIndex(e => e.Tid, "UQ__Reposts__C451DB3010751B4E").IsUnique();

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Tid).HasMaxLength(20);

            entity.HasOne(d => d.Post).WithMany(p => p.Reposts)
                .HasForeignKey(d => d.PostId)
                .HasConstraintName("FK_RepostPost");

            entity.HasOne(d => d.User).WithMany(p => p.Reposts)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_RepostUser");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Users__3214EC07B91FF525");

            entity.HasIndex(e => e.Did, "IX_Users_Did");

            entity.HasIndex(e => e.Username, "UQ__Users__536C85E411906A34").IsUnique();

            entity.HasIndex(e => e.Email, "UQ__Users__A9D105340284C248").IsUnique();

            entity.HasIndex(e => e.Did, "UQ__Users__C0312219EBC0F5F8").IsUnique();

            entity.HasIndex(e => e.Handle, "UQ__Users__FE5BB31A92C6FE6D").IsUnique();

            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.Did).HasMaxLength(100);
            entity.Property(e => e.DisplayName).HasMaxLength(256);
            entity.Property(e => e.Email).HasMaxLength(256);
            entity.Property(e => e.FollowersCount).HasDefaultValue(0);
            entity.Property(e => e.FollowingCount).HasDefaultValue(0);
            entity.Property(e => e.Handle).HasMaxLength(256);
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);
            entity.Property(e => e.IsOnline).HasDefaultValue(false);
            entity.Property(e => e.IsPrivate).HasDefaultValue(false);
            entity.Property(e => e.Location).HasMaxLength(256);
            entity.Property(e => e.PostsCount).HasDefaultValue(0);
            entity.Property(e => e.Username).HasMaxLength(256);

            entity.HasMany(d => d.Interests).WithMany(p => p.Users)
                .UsingEntity<Dictionary<string, object>>(
                    "UserInterest",
                    r => r.HasOne<Interest>().WithMany()
                        .HasForeignKey("InterestId")
                        .HasConstraintName("FK_UI_Interest"),
                    l => l.HasOne<User>().WithMany()
                        .HasForeignKey("UserId")
                        .HasConstraintName("FK_UI_User"),
                    j =>
                    {
                        j.HasKey("UserId", "InterestId").HasName("PK__UserInte__7580FE8A5B5B0B2A");
                        j.ToTable("UserInterests");
                    });
        });

        modelBuilder.Entity<UserFeedSubscription>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.FeedId }).HasName("PK__UserFeed__56D0A1B996CA0707");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsPinned).HasDefaultValue(false);
            entity.Property(e => e.PinnedOrder).HasDefaultValue(0);

            entity.HasOne(d => d.Feed).WithMany(p => p.UserFeedSubscriptions)
                .HasForeignKey(d => d.FeedId)
                .HasConstraintName("FK_SubsFeed");

            entity.HasOne(d => d.User).WithMany(p => p.UserFeedSubscriptions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_SubsUser");
        });

        modelBuilder.Entity<UserFollow>(entity =>
        {
            entity.HasKey(e => new { e.FollowerId, e.FollowingId }).HasName("PK__UserFoll__79CB0335AE8EF105");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.Follower).WithMany(p => p.UserFollowFollowers)
                .HasForeignKey(d => d.FollowerId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Follower");

            entity.HasOne(d => d.Following).WithMany(p => p.UserFollowFollowings)
                .HasForeignKey(d => d.FollowingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Following");
        });

        modelBuilder.Entity<UserSetting>(entity =>
        {
            entity.HasKey(e => e.UserId).HasName("PK__UserSett__1788CC4CA56EF176");

            entity.Property(e => e.UserId).ValueGeneratedNever();
            entity.Property(e => e.AdultContentFilter)
                .HasMaxLength(20)
                .HasDefaultValue("hide");
            entity.Property(e => e.AppLanguage)
                .HasMaxLength(10)
                .HasDefaultValue("en");
            entity.Property(e => e.AutoplayVideoGif).HasDefaultValue(true);
            entity.Property(e => e.DefaultAllowQuotes).HasDefaultValue(true);
            entity.Property(e => e.DefaultReplyRestriction)
                .HasMaxLength(20)
                .HasDefaultValue("anyone");
            entity.Property(e => e.EnableAdultContent).HasDefaultValue(false);
            entity.Property(e => e.FontSize).HasDefaultValue(15);
            entity.Property(e => e.NotifyFollowers).HasDefaultValue(true);
            entity.Property(e => e.NotifyLikes).HasDefaultValue(true);
            entity.Property(e => e.NotifyReplies).HasDefaultValue(true);
            entity.Property(e => e.NotifyMentions).HasDefaultValue(true);
            entity.Property(e => e.NotifyQuotes).HasDefaultValue(true);
            entity.Property(e => e.NotifyReposts).HasDefaultValue(true);
            entity.Property(e => e.PushNotifyFollowers).HasDefaultValue(true);
            entity.Property(e => e.PushNotifyLikes).HasDefaultValue(true);
            entity.Property(e => e.PushNotifyReplies).HasDefaultValue(true);
            entity.Property(e => e.PushNotifyMentions).HasDefaultValue(true);
            entity.Property(e => e.PushNotifyQuotes).HasDefaultValue(true);
            entity.Property(e => e.PushNotifyReposts).HasDefaultValue(true);
            entity.Property(e => e.InAppNotifyFollowers).HasDefaultValue(true);
            entity.Property(e => e.InAppNotifyLikes).HasDefaultValue(true);
            entity.Property(e => e.InAppNotifyReplies).HasDefaultValue(true);
            entity.Property(e => e.InAppNotifyMentions).HasDefaultValue(true);
            entity.Property(e => e.InAppNotifyQuotes).HasDefaultValue(true);
            entity.Property(e => e.InAppNotifyReposts).HasDefaultValue(true);
            entity.Property(e => e.RequireAltText).HasDefaultValue(false);
            entity.Property(e => e.SortReplies)
                .HasMaxLength(50)
                .HasDefaultValue("top");
            entity.Property(e => e.ThemeMode)
                .HasMaxLength(20)
                .HasDefaultValue("system");
            entity.Property(e => e.EnableTrending).HasDefaultValue(true);
            entity.Property(e => e.EnableDiscoverVideo).HasDefaultValue(true);
            entity.Property(e => e.EnableTreeView).HasDefaultValue(false);
            entity.Property(e => e.RequireLogoutVisibility).HasDefaultValue(false);
            entity.Property(e => e.LargerAltBadge).HasDefaultValue(false);
            entity.Property(e => e.SelectedInterests).HasColumnType("nvarchar(max)");

            entity.HasOne(d => d.User).WithOne(p => p.UserSetting)
                .HasForeignKey<UserSetting>(d => d.UserId)
                .HasConstraintName("FK_SettingsUser");
        });

        modelBuilder.Entity<UserListSubscription>(entity =>
        {
            entity.HasKey(e => new { e.UserId, e.ListId }).HasName("PK_UserListSubscription");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.PinnedOrder).HasDefaultValue(0);

            entity.HasOne(d => d.User).WithMany()
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_ULS_User");

            entity.HasOne(d => d.List).WithMany()
                .HasForeignKey(d => d.ListId)
                .OnDelete(DeleteBehavior.Cascade) // If list is deleted, unpin it
                .HasConstraintName("FK_ULS_List");
        });

        modelBuilder.Entity<ListPost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.AddedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.List).WithMany(p => p.ListPosts)
                .HasForeignKey(d => d.ListId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Post).WithMany()
                .HasForeignKey(d => d.PostId)
                .OnDelete(DeleteBehavior.NoAction); // Avoid multiple cascade paths

            entity.HasOne(d => d.AddedByUser).WithMany()
                .HasForeignKey(d => d.AddedByUserId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<List>(entity =>
        {
             // Extending existing config if possible, or just add specific property config here?
             // But List is already configured in lines 181-196.
             // I shouldn't duplicate the entity config block.
        });

        modelBuilder.Entity<Hashtag>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK_Hashtags");
            entity.HasIndex(e => e.Slug).IsUnique();
            entity.Property(e => e.Name).HasMaxLength(100);
            entity.Property(e => e.Slug).HasMaxLength(100);
            entity.Property(e => e.PostsCount).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");
            entity.Property(e => e.IsDeleted).HasDefaultValue(false);

            entity.HasMany(d => d.Posts).WithMany(p => p.Hashtags)
                .UsingEntity<Dictionary<string, object>>(
                    "PostHashtag",
                    r => r.HasOne<Post>().WithMany()
                        .HasForeignKey("PostId")
                        .HasConstraintName("FK_PH_Post"),
                    l => l.HasOne<Hashtag>().WithMany()
                        .HasForeignKey("HashtagId")
                        .HasConstraintName("FK_PH_Hashtag"),
                    j =>
                    {
                        j.HasKey("PostId", "HashtagId").HasName("PK_PostHashtags");
                        j.ToTable("PostHashtags");
                    });
        });

        modelBuilder.Entity<LinkPreview>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Url).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("(getutcdate())");

            entity.HasOne(d => d.Post)
                .WithOne(p => p.LinkPreview)
                .HasForeignKey<LinkPreview>(d => d.PostId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Message)
                .WithOne(m => m.LinkPreview)
                .HasForeignKey<LinkPreview>(d => d.MessageId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
