IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
CREATE TABLE [Conversations] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [LastMessageId] uniqueidentifier NULL,
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Conversa__3214EC0776FD5532] PRIMARY KEY ([Id])
);

CREATE TABLE [Hashtags] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [Slug] nvarchar(100) NOT NULL,
    [PostsCount] int NULL DEFAULT 0,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK_Hashtags] PRIMARY KEY ([Id])
);

CREATE TABLE [Interests] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [Slug] nvarchar(100) NOT NULL,
    [Icon] nvarchar(50) NULL,
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Interest__3214EC071202F311] PRIMARY KEY ([Id])
);

CREATE TABLE [Labels] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Src] nvarchar(256) NOT NULL,
    [Uri] nvarchar(256) NOT NULL,
    [Cid] nvarchar(256) NULL,
    [Val] nvarchar(100) NOT NULL,
    [Neg] bit NOT NULL DEFAULT CAST(0 AS bit),
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    [ExpiresAt] datetime2 NULL,
    CONSTRAINT [PK_Labels] PRIMARY KEY ([Id])
);

CREATE TABLE [PageContents] (
    [Slug] nvarchar(450) NOT NULL,
    [Title] nvarchar(max) NOT NULL,
    [HtmlContent] nvarchar(max) NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_PageContents] PRIMARY KEY ([Slug])
);

CREATE TABLE [RepoBlocks] (
    [Cid] nvarchar(100) NOT NULL,
    [Data] varbinary(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    [Did] nvarchar(100) NOT NULL,
    CONSTRAINT [PK_RepoBlocks] PRIMARY KEY ([Cid])
);

CREATE TABLE [Users] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Did] nvarchar(100) NOT NULL,
    [SigningPublicKey] nvarchar(max) NULL,
    [EncryptedSigningPrivateKey] nvarchar(max) NULL,
    [RepoRev] nvarchar(20) NULL,
    [RepoRoot] nvarchar(100) NULL,
    [RepoCommit] nvarchar(100) NULL,
    [RepoCommitSignature] nvarchar(256) NULL,
    [Username] nvarchar(256) NOT NULL,
    [Handle] nvarchar(256) NOT NULL,
    [Role] nvarchar(max) NOT NULL,
    [Email] nvarchar(256) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Salt] nvarchar(max) NOT NULL,
    [Labels] nvarchar(max) NULL,
    [DisplayName] nvarchar(256) NULL,
    [AvatarUrl] nvarchar(max) NULL,
    [CoverImageUrl] nvarchar(max) NULL,
    [Bio] nvarchar(max) NULL,
    [Location] nvarchar(256) NULL,
    [Website] nvarchar(max) NULL,
    [DateOfBirth] datetime2 NULL,
    [FollowersCount] int NULL DEFAULT 0,
    [FollowingCount] int NULL DEFAULT 0,
    [PostsCount] int NULL DEFAULT 0,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [LastLoginAt] datetime2 NULL,
    [IsOnline] bit NULL DEFAULT CAST(0 AS bit),
    [IsPrivate] bit NULL DEFAULT CAST(0 AS bit),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    [PinnedPostUri] nvarchar(max) NULL,
    [IsBanned] bit NOT NULL,
    [IsVerified] bit NOT NULL,
    CONSTRAINT [PK__Users__3214EC07B91FF525] PRIMARY KEY ([Id])
);

CREATE TABLE [BlockedAccounts] (
    [UserId] uniqueidentifier NOT NULL,
    [BlockedUserId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [Tid] nvarchar(max) NULL,
    [Cid] nvarchar(max) NULL,
    [Uri] nvarchar(200) NULL,
    CONSTRAINT [PK__BlockedA__0A8170EB918D5838] PRIMARY KEY ([UserId], [BlockedUserId]),
    CONSTRAINT [FK_BlockedOwner] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]),
    CONSTRAINT [FK_BlockedUser] FOREIGN KEY ([BlockedUserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [ConversationParticipants] (
    [ConversationId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [JoinedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__Conversa__112854B3CF95C0F9] PRIMARY KEY ([ConversationId], [UserId]),
    CONSTRAINT [FK_CP_Conv] FOREIGN KEY ([ConversationId]) REFERENCES [Conversations] ([Id]),
    CONSTRAINT [FK_CP_User] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Feeds] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Tid] nvarchar(20) NOT NULL,
    [Name] nvarchar(256) NOT NULL,
    [Description] nvarchar(max) NULL,
    [Handle] nvarchar(256) NOT NULL,
    [AvatarUrl] nvarchar(max) NULL,
    [CreatorId] uniqueidentifier NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [SubscribersCount] int NULL DEFAULT 0,
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    [IsOfficial] bit NOT NULL,
    CONSTRAINT [PK__Feeds__3214EC0733EF47B5] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_FeedCreator] FOREIGN KEY ([CreatorId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Lists] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [OwnerId] uniqueidentifier NOT NULL,
    [Name] nvarchar(256) NOT NULL,
    [Description] nvarchar(max) NULL,
    [Purpose] nvarchar(50) NULL DEFAULT N'social',
    [AvatarUrl] nvarchar(max) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    [Uri] nvarchar(max) NULL,
    [Cid] nvarchar(max) NULL,
    [IsCurated] bit NOT NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Lists__3214EC07397CB41F] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ListOwner] FOREIGN KEY ([OwnerId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Messages] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Tid] nvarchar(20) NOT NULL,
    [ConversationId] uniqueidentifier NOT NULL,
    [SenderId] uniqueidentifier NOT NULL,
    [Content] nvarchar(max) NULL,
    [ImageUrl] nvarchar(max) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [IsRead] bit NULL DEFAULT CAST(0 AS bit),
    [IsModified] bit NOT NULL DEFAULT CAST(0 AS bit),
    [IsRecalled] bit NOT NULL DEFAULT CAST(0 AS bit),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    [ReplyToId] uniqueidentifier NULL,
    CONSTRAINT [PK__Messages__3214EC0740CF255F] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Messages_Messages_ReplyToId] FOREIGN KEY ([ReplyToId]) REFERENCES [Messages] ([Id]),
    CONSTRAINT [FK_MsgConv] FOREIGN KEY ([ConversationId]) REFERENCES [Conversations] ([Id]),
    CONSTRAINT [FK_MsgSender] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [MutedAccounts] (
    [UserId] uniqueidentifier NOT NULL,
    [MutedUserId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__MutedAcc__2416C501D72C1110] PRIMARY KEY ([UserId], [MutedUserId]),
    CONSTRAINT [FK_MutedOwner] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]),
    CONSTRAINT [FK_MutedUser] FOREIGN KEY ([MutedUserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [MutedWords] (
    [Id] int NOT NULL IDENTITY,
    [UserId] uniqueidentifier NOT NULL,
    [Word] nvarchar(256) NOT NULL,
    [MuteBehavior] nvarchar(20) NOT NULL DEFAULT N'hide',
    [Targets] nvarchar(50) NOT NULL DEFAULT N'content',
    [ExpiresAt] datetime2 NULL,
    [ExcludeFollowing] bit NOT NULL DEFAULT CAST(0 AS bit),
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__MutedWor__3214EC076609311A] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MutedWordUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Posts] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Tid] nvarchar(20) NOT NULL,
    [Cid] nvarchar(100) NULL,
    [Uri] nvarchar(450) NULL,
    [FacetsJson] nvarchar(max) NULL,
    [AuthorId] uniqueidentifier NOT NULL,
    [Content] nvarchar(max) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [ReplyToPostId] uniqueidentifier NULL,
    [RootPostId] uniqueidentifier NULL,
    [QuotePostId] uniqueidentifier NULL,
    [LikesCount] int NULL DEFAULT 0,
    [RepostsCount] int NULL DEFAULT 0,
    [RepliesCount] int NULL DEFAULT 0,
    [QuotesCount] int NULL DEFAULT 0,
    [BookmarksCount] int NULL,
    [ReplyRestriction] nvarchar(20) NULL DEFAULT N'anyone',
    [AllowQuotes] bit NULL DEFAULT CAST(1 AS bit),
    [Language] nvarchar(max) NULL,
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    [Labels] nvarchar(max) NULL,
    CONSTRAINT [PK__Posts__3214EC07CB992B89] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PostAuthor] FOREIGN KEY ([AuthorId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PostQuote] FOREIGN KEY ([QuotePostId]) REFERENCES [Posts] ([Id]),
    CONSTRAINT [FK_PostReply] FOREIGN KEY ([ReplyToPostId]) REFERENCES [Posts] ([Id]),
    CONSTRAINT [FK_PostRoot] FOREIGN KEY ([RootPostId]) REFERENCES [Posts] ([Id])
);

CREATE TABLE [Reports] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [SubjectType] nvarchar(50) NOT NULL,
    [SubjectUri] nvarchar(256) NOT NULL,
    [SubjectCid] nvarchar(256) NULL,
    [ReasonType] nvarchar(50) NOT NULL,
    [ReasonText] nvarchar(max) NULL,
    [ReporterId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    [Status] nvarchar(20) NOT NULL DEFAULT N'open',
    CONSTRAINT [PK_Reports] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Reports_Users_ReporterId] FOREIGN KEY ([ReporterId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [SupportRequests] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Email] nvarchar(256) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [Username] nvarchar(256) NULL,
    [Category] nvarchar(50) NOT NULL,
    [DeviceType] nvarchar(20) NOT NULL,
    [Status] nvarchar(20) NOT NULL DEFAULT N'pending',
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    [UserId] uniqueidentifier NULL,
    CONSTRAINT [PK_SupportRequests] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SupportRequests_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
);

CREATE TABLE [UserFollows] (
    [FollowerId] uniqueidentifier NOT NULL,
    [FollowingId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [Tid] nvarchar(20) NOT NULL,
    [Cid] nvarchar(100) NULL,
    [Uri] nvarchar(200) NULL,
    CONSTRAINT [PK__UserFoll__79CB0335AE8EF105] PRIMARY KEY ([FollowerId], [FollowingId]),
    CONSTRAINT [FK_Follower] FOREIGN KEY ([FollowerId]) REFERENCES [Users] ([Id]),
    CONSTRAINT [FK_Following] FOREIGN KEY ([FollowingId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [UserInterests] (
    [UserId] uniqueidentifier NOT NULL,
    [InterestId] int NOT NULL,
    CONSTRAINT [PK__UserInte__7580FE8A5B5B0B2A] PRIMARY KEY ([UserId], [InterestId]),
    CONSTRAINT [FK_UI_Interest] FOREIGN KEY ([InterestId]) REFERENCES [Interests] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UI_User] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [UserSettings] (
    [UserId] uniqueidentifier NOT NULL,
    [AdultContentFilter] nvarchar(20) NULL DEFAULT N'hide',
    [EnableAdultContent] bit NULL DEFAULT CAST(0 AS bit),
    [SexuallyExplicitFilter] nvarchar(max) NULL,
    [GraphicMediaFilter] nvarchar(max) NULL,
    [NonSexualNudityFilter] nvarchar(max) NULL,
    [SortReplies] nvarchar(50) NULL DEFAULT N'top',
    [RequireAltText] bit NULL DEFAULT CAST(0 AS bit),
    [AutoplayVideoGif] bit NULL DEFAULT CAST(1 AS bit),
    [AppLanguage] nvarchar(10) NULL DEFAULT N'en',
    [ThemeMode] nvarchar(20) NULL DEFAULT N'system',
    [NotifyLikes] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyFollowers] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyReplies] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyMentions] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyQuotes] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyReposts] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyLikes] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyFollowers] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyReplies] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyMentions] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyQuotes] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyReposts] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyLikes] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyFollowers] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyReplies] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyMentions] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyQuotes] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyReposts] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyActivity] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyActivity] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyActivity] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyLikesOfReposts] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyLikesOfReposts] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyLikesOfReposts] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyRepostsOfReposts] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyRepostsOfReposts] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyRepostsOfReposts] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyOthers] bit NULL DEFAULT CAST(1 AS bit),
    [PushNotifyOthers] bit NULL DEFAULT CAST(1 AS bit),
    [InAppNotifyOthers] bit NULL DEFAULT CAST(1 AS bit),
    [DefaultReplyRestriction] nvarchar(20) NULL DEFAULT N'anyone',
    [DefaultAllowQuotes] bit NULL DEFAULT CAST(1 AS bit),
    [FontSize] int NULL DEFAULT 15,
    [EnableTrending] bit NULL DEFAULT CAST(1 AS bit),
    [EnableDiscoverVideo] bit NULL DEFAULT CAST(1 AS bit),
    [EnableTreeView] bit NULL DEFAULT CAST(0 AS bit),
    [RequireLogoutVisibility] bit NULL DEFAULT CAST(0 AS bit),
    [LargerAltBadge] bit NULL DEFAULT CAST(0 AS bit),
    [SelectedInterests] nvarchar(max) NULL,
    [ShowReplies] bit NULL DEFAULT CAST(1 AS bit),
    [ShowReposts] bit NULL DEFAULT CAST(1 AS bit),
    [ShowQuotePosts] bit NULL DEFAULT CAST(1 AS bit),
    [ShowSampleSavedFeeds] bit NULL DEFAULT CAST(0 AS bit),
    [EnabledMediaProviders] nvarchar(max) NULL,
    CONSTRAINT [PK__UserSett__1788CC4CA56EF176] PRIMARY KEY ([UserId]),
    CONSTRAINT [FK_SettingsUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [UserFeedSubscriptions] (
    [UserId] uniqueidentifier NOT NULL,
    [FeedId] uniqueidentifier NOT NULL,
    [IsPinned] bit NULL DEFAULT CAST(0 AS bit),
    [PinnedOrder] int NULL DEFAULT 0,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__UserFeed__56D0A1B996CA0707] PRIMARY KEY ([UserId], [FeedId]),
    CONSTRAINT [FK_SubsFeed] FOREIGN KEY ([FeedId]) REFERENCES [Feeds] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_SubsUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [ListMembers] (
    [ListId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [JoinedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [Status] int NOT NULL,
    [Uri] nvarchar(max) NULL,
    [Cid] nvarchar(max) NULL,
    CONSTRAINT [PK__ListMemb__32FBA4C18A09448F] PRIMARY KEY ([ListId], [UserId]),
    CONSTRAINT [FK_LM_List] FOREIGN KEY ([ListId]) REFERENCES [Lists] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_LM_User] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [UserListSubscriptions] (
    [UserId] uniqueidentifier NOT NULL,
    [ListId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    [PinnedOrder] int NOT NULL DEFAULT 0,
    CONSTRAINT [PK_UserListSubscription] PRIMARY KEY ([UserId], [ListId]),
    CONSTRAINT [FK_ULS_List] FOREIGN KEY ([ListId]) REFERENCES [Lists] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ULS_User] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [MessageReactions] (
    [Id] uniqueidentifier NOT NULL,
    [MessageId] uniqueidentifier NOT NULL,
    [UserId] uniqueidentifier NOT NULL,
    [Emoji] nvarchar(50) NOT NULL,
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK_MessageReactions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MessageReactions_Messages_MessageId] FOREIGN KEY ([MessageId]) REFERENCES [Messages] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_MessageReactions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Bookmarks] (
    [UserId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [Tid] nvarchar(20) NOT NULL,
    [Cid] nvarchar(100) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__Bookmark__8D29EA4D4F993AF5] PRIMARY KEY ([UserId], [PostId]),
    CONSTRAINT [FK_BookmarkPost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_BookmarkUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Likes] (
    [UserId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [Tid] nvarchar(20) NOT NULL,
    [Cid] nvarchar(100) NULL,
    [Uri] nvarchar(200) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__Likes__8D29EA4DA4FAA6F6] PRIMARY KEY ([UserId], [PostId]),
    CONSTRAINT [FK_LikePost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_LikeUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [LinkPreviews] (
    [Id] uniqueidentifier NOT NULL,
    [Url] nvarchar(max) NOT NULL,
    [Title] nvarchar(max) NULL,
    [Description] nvarchar(max) NULL,
    [Image] nvarchar(max) NULL,
    [Domain] nvarchar(max) NULL,
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    [PostId] uniqueidentifier NULL,
    [MessageId] uniqueidentifier NULL,
    CONSTRAINT [PK_LinkPreviews] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_LinkPreviews_Messages_MessageId] FOREIGN KEY ([MessageId]) REFERENCES [Messages] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_LinkPreviews_Posts_PostId] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [ListPosts] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [ListId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [AddedByUserId] uniqueidentifier NOT NULL,
    [AddedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    [Caption] nvarchar(max) NULL,
    CONSTRAINT [PK_ListPosts] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ListPosts_Lists_ListId] FOREIGN KEY ([ListId]) REFERENCES [Lists] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ListPosts_Posts_PostId] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]),
    CONSTRAINT [FK_ListPosts_Users_AddedByUserId] FOREIGN KEY ([AddedByUserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Notifications] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Tid] nvarchar(20) NOT NULL,
    [Type] nvarchar(50) NULL,
    [RecipientId] uniqueidentifier NOT NULL,
    [SenderId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NULL,
    [ListId] uniqueidentifier NULL,
    [IsRead] bit NULL DEFAULT CAST(0 AS bit),
    [Content] nvarchar(max) NULL,
    [Title] nvarchar(max) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Notifica__3214EC07E46938FE] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_NotifRecipient] FOREIGN KEY ([RecipientId]) REFERENCES [Users] ([Id]),
    CONSTRAINT [FK_NotifSender] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id]),
    CONSTRAINT [FK_NotificationPost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE SET NULL
);

CREATE TABLE [PostHashtags] (
    [PostId] uniqueidentifier NOT NULL,
    [HashtagId] int NOT NULL,
    CONSTRAINT [PK_PostHashtags] PRIMARY KEY ([PostId], [HashtagId]),
    CONSTRAINT [FK_PH_Hashtag] FOREIGN KEY ([HashtagId]) REFERENCES [Hashtags] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PH_Post] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [PostInterests] (
    [PostId] uniqueidentifier NOT NULL,
    [InterestId] int NOT NULL,
    CONSTRAINT [PK__PostInte__C81A52DEA5818FC9] PRIMARY KEY ([PostId], [InterestId]),
    CONSTRAINT [FK_PI_Interest] FOREIGN KEY ([InterestId]) REFERENCES [Interests] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PI_Post] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [PostMedia] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [PostId] uniqueidentifier NOT NULL,
    [Type] nvarchar(50) NULL,
    [Url] nvarchar(max) NOT NULL,
    [Cid] nvarchar(100) NULL,
    [AltText] nvarchar(max) NULL,
    [ThumbnailUrl] nvarchar(max) NULL,
    [Position] int NULL DEFAULT 0,
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__PostMedi__3214EC071ED49D5C] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MediaPost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [PostReplyAllowedLists] (
    [PostId] uniqueidentifier NOT NULL,
    [ListId] uniqueidentifier NOT NULL,
    CONSTRAINT [PK__PostRepl__E42A52989C4F35D5] PRIMARY KEY ([PostId], [ListId]),
    CONSTRAINT [FK_PRAL_List] FOREIGN KEY ([ListId]) REFERENCES [Lists] ([Id]),
    CONSTRAINT [FK_PRAL_Post] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Reposts] (
    [UserId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [Tid] nvarchar(20) NOT NULL,
    [Cid] nvarchar(100) NULL,
    [Uri] nvarchar(200) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__Reposts__8D29EA4D0BE60F6C] PRIMARY KEY ([UserId], [PostId]),
    CONSTRAINT [FK_RepostPost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RepostUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE INDEX [IX_BlockedAccounts_BlockedUserId] ON [BlockedAccounts] ([BlockedUserId]);

CREATE INDEX [IX_BlockedAccounts_Uri] ON [BlockedAccounts] ([Uri]);

CREATE INDEX [IX_Bookmarks_PostId] ON [Bookmarks] ([PostId]);

CREATE UNIQUE INDEX [UQ__Bookmark__C451DB30DF335A92] ON [Bookmarks] ([Tid]);

CREATE INDEX [IX_ConversationParticipants_UserId] ON [ConversationParticipants] ([UserId]);

CREATE INDEX [IX_Feeds_CreatorId] ON [Feeds] ([CreatorId]);

CREATE UNIQUE INDEX [UQ__Feeds__C451DB30DDF6B147] ON [Feeds] ([Tid]);

CREATE UNIQUE INDEX [IX_Hashtags_Slug] ON [Hashtags] ([Slug]);

CREATE UNIQUE INDEX [UQ__Interest__BC7B5FB60749EE1D] ON [Interests] ([Slug]);

CREATE INDEX [IX_Labels_Uri] ON [Labels] ([Uri]);

CREATE INDEX [IX_Likes_PostId] ON [Likes] ([PostId]);

CREATE INDEX [IX_Likes_Uri] ON [Likes] ([Uri]);

CREATE UNIQUE INDEX [UQ__Likes__C451DB30B024EDAB] ON [Likes] ([Tid]);

CREATE UNIQUE INDEX [IX_LinkPreviews_MessageId] ON [LinkPreviews] ([MessageId]) WHERE [MessageId] IS NOT NULL;

CREATE UNIQUE INDEX [IX_LinkPreviews_PostId] ON [LinkPreviews] ([PostId]) WHERE [PostId] IS NOT NULL;

CREATE INDEX [IX_ListMembers_UserId] ON [ListMembers] ([UserId]);

CREATE INDEX [IX_ListPosts_AddedByUserId] ON [ListPosts] ([AddedByUserId]);

CREATE INDEX [IX_ListPosts_ListId] ON [ListPosts] ([ListId]);

CREATE INDEX [IX_ListPosts_PostId] ON [ListPosts] ([PostId]);

CREATE INDEX [IX_Lists_OwnerId] ON [Lists] ([OwnerId]);

CREATE INDEX [IX_MessageReactions_MessageId] ON [MessageReactions] ([MessageId]);

CREATE INDEX [IX_MessageReactions_UserId] ON [MessageReactions] ([UserId]);

CREATE INDEX [IX_Messages_ConversationId] ON [Messages] ([ConversationId]);

CREATE INDEX [IX_Messages_ReplyToId] ON [Messages] ([ReplyToId]);

CREATE INDEX [IX_Messages_SenderId] ON [Messages] ([SenderId]);

CREATE UNIQUE INDEX [UQ__Messages__C451DB300D86D8F0] ON [Messages] ([Tid]);

CREATE INDEX [IX_MutedAccounts_MutedUserId] ON [MutedAccounts] ([MutedUserId]);

CREATE INDEX [IX_MutedWords_UserId] ON [MutedWords] ([UserId]);

CREATE INDEX [IX_Notifications_PostId] ON [Notifications] ([PostId]);

CREATE INDEX [IX_Notifications_RecipientId] ON [Notifications] ([RecipientId]);

CREATE INDEX [IX_Notifications_RecipientId_IsRead_CreatedAt] ON [Notifications] ([RecipientId], [IsRead], [CreatedAt]);

CREATE INDEX [IX_Notifications_SenderId] ON [Notifications] ([SenderId]);

CREATE UNIQUE INDEX [UQ__Notifica__C451DB3001D0607B] ON [Notifications] ([Tid]);

CREATE INDEX [IX_PostHashtags_HashtagId] ON [PostHashtags] ([HashtagId]);

CREATE INDEX [IX_PostInterests_InterestId] ON [PostInterests] ([InterestId]);

CREATE INDEX [IX_PostMedia_PostId] ON [PostMedia] ([PostId]);

CREATE INDEX [IX_PostReplyAllowedLists_ListId] ON [PostReplyAllowedLists] ([ListId]);

CREATE INDEX [IX_Posts_AuthorId_Active_CreatedAt] ON [Posts] ([AuthorId], [IsDeleted], [CreatedAt]);

CREATE INDEX [IX_Posts_AuthorId_CreatedAt] ON [Posts] ([AuthorId], [CreatedAt]);

CREATE INDEX [IX_Posts_CreatedAt] ON [Posts] ([CreatedAt]);

CREATE INDEX [IX_Posts_LikesCount] ON [Posts] ([LikesCount]);

CREATE INDEX [IX_Posts_LikesCount_CreatedAt] ON [Posts] ([LikesCount], [CreatedAt]);

CREATE INDEX [IX_Posts_QuotePostId] ON [Posts] ([QuotePostId]);

CREATE INDEX [IX_Posts_ReplyToPostId_CreatedAt] ON [Posts] ([ReplyToPostId], [CreatedAt]);

CREATE INDEX [IX_Posts_RootPostId] ON [Posts] ([RootPostId]);

CREATE INDEX [IX_Posts_Tid] ON [Posts] ([Tid]);

CREATE INDEX [IX_Posts_Uri] ON [Posts] ([Uri]);

CREATE UNIQUE INDEX [UQ__Posts__C451DB308F8113F0] ON [Posts] ([Tid]);

CREATE INDEX [IX_RepoBlocks_Did] ON [RepoBlocks] ([Did]);

CREATE INDEX [IX_Reports_ReporterId] ON [Reports] ([ReporterId]);

CREATE INDEX [IX_Reposts_PostId] ON [Reposts] ([PostId]);

CREATE INDEX [IX_Reposts_Uri] ON [Reposts] ([Uri]);

CREATE UNIQUE INDEX [UQ__Reposts__C451DB3010751B4E] ON [Reposts] ([Tid]);

CREATE INDEX [IX_SupportRequests_UserId] ON [SupportRequests] ([UserId]);

CREATE INDEX [IX_UserFeedSubscriptions_FeedId] ON [UserFeedSubscriptions] ([FeedId]);

CREATE INDEX [IX_UserFollows_FollowingId] ON [UserFollows] ([FollowingId]);

CREATE INDEX [IX_UserFollows_Uri] ON [UserFollows] ([Uri]);

CREATE INDEX [IX_UserInterests_InterestId] ON [UserInterests] ([InterestId]);

CREATE INDEX [IX_UserListSubscriptions_ListId] ON [UserListSubscriptions] ([ListId]);

CREATE INDEX [IX_Users_Active_CreatedAt] ON [Users] ([IsDeleted], [CreatedAt]);

CREATE INDEX [IX_Users_Did] ON [Users] ([Did]);

CREATE INDEX [IX_Users_FollowersCount_CreatedAt] ON [Users] ([FollowersCount], [CreatedAt]);

CREATE UNIQUE INDEX [UQ__Users__536C85E411906A34] ON [Users] ([Username]);

CREATE UNIQUE INDEX [UQ__Users__A9D105340284C248] ON [Users] ([Email]);

CREATE UNIQUE INDEX [UQ__Users__C0312219EBC0F5F8] ON [Users] ([Did]);

CREATE UNIQUE INDEX [UQ__Users__FE5BB31A92C6FE6D] ON [Users] ([Handle]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260509210213_InitialCreate', N'9.0.0');

ALTER TABLE [Users] ADD [BlueskyAccessToken] nvarchar(max) NULL;

ALTER TABLE [Users] ADD [BlueskyRefreshToken] nvarchar(max) NULL;

ALTER TABLE [Users] ADD [EmailConfirmed] bit NOT NULL DEFAULT CAST(0 AS bit);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260515145922_AddEmailConfirmedToUser', N'9.0.0');

COMMIT;
GO

