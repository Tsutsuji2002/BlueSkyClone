Build started...
Build succeeded.
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

CREATE TABLE [Interests] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [Slug] nvarchar(100) NOT NULL,
    [Icon] nvarchar(50) NULL,
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Interest__3214EC071202F311] PRIMARY KEY ([Id])
);

CREATE TABLE [Users] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Did] nvarchar(100) NOT NULL,
    [Username] nvarchar(256) NOT NULL,
    [Handle] nvarchar(256) NOT NULL,
    [Email] nvarchar(256) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Salt] nvarchar(max) NOT NULL,
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
    CONSTRAINT [PK__Users__3214EC07B91FF525] PRIMARY KEY ([Id])
);

CREATE TABLE [BlockedAccounts] (
    [UserId] uniqueidentifier NOT NULL,
    [BlockedUserId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
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
    CONSTRAINT [PK__Lists__3214EC07397CB41F] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ListOwner] FOREIGN KEY ([OwnerId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Messages] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Tid] nvarchar(20) NOT NULL,
    [ConversationId] uniqueidentifier NOT NULL,
    [SenderId] uniqueidentifier NOT NULL,
    [Content] nvarchar(max) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [IsRead] bit NULL DEFAULT CAST(0 AS bit),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Messages__3214EC0740CF255F] PRIMARY KEY ([Id]),
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
    CONSTRAINT [PK__MutedWor__3214EC076609311A] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MutedWordUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE
);

CREATE TABLE [Notifications] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Tid] nvarchar(20) NOT NULL,
    [Type] nvarchar(50) NULL,
    [RecipientId] uniqueidentifier NOT NULL,
    [SenderId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NULL,
    [IsRead] bit NULL DEFAULT CAST(0 AS bit),
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Notifica__3214EC07E46938FE] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_NotifRecipient] FOREIGN KEY ([RecipientId]) REFERENCES [Users] ([Id]),
    CONSTRAINT [FK_NotifSender] FOREIGN KEY ([SenderId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Posts] (
    [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
    [Tid] nvarchar(20) NOT NULL,
    [AuthorId] uniqueidentifier NOT NULL,
    [Content] nvarchar(max) NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [ReplyToPostId] uniqueidentifier NULL,
    [RootPostId] uniqueidentifier NULL,
    [LikesCount] int NULL DEFAULT 0,
    [RepostsCount] int NULL DEFAULT 0,
    [RepliesCount] int NULL DEFAULT 0,
    [QuotesCount] int NULL DEFAULT 0,
    [ReplyRestriction] nvarchar(20) NULL DEFAULT N'anyone',
    [AllowQuotes] bit NULL DEFAULT CAST(1 AS bit),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK__Posts__3214EC07CB992B89] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_PostAuthor] FOREIGN KEY ([AuthorId]) REFERENCES [Users] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PostReply] FOREIGN KEY ([ReplyToPostId]) REFERENCES [Posts] ([Id]),
    CONSTRAINT [FK_PostRoot] FOREIGN KEY ([RootPostId]) REFERENCES [Posts] ([Id])
);

CREATE TABLE [UserFollows] (
    [FollowerId] uniqueidentifier NOT NULL,
    [FollowingId] uniqueidentifier NOT NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
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
    [SortReplies] nvarchar(50) NULL DEFAULT N'top',
    [RequireAltText] bit NULL DEFAULT CAST(0 AS bit),
    [AutoplayVideoGif] bit NULL DEFAULT CAST(1 AS bit),
    [AppLanguage] nvarchar(10) NULL DEFAULT N'en',
    [ThemeMode] nvarchar(20) NULL DEFAULT N'system',
    [NotifyLikes] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyFollowers] bit NULL DEFAULT CAST(1 AS bit),
    [NotifyReplies] bit NULL DEFAULT CAST(1 AS bit),
    [DefaultReplyRestriction] nvarchar(20) NULL DEFAULT N'anyone',
    [DefaultAllowQuotes] bit NULL DEFAULT CAST(1 AS bit),
    [FontSize] int NULL DEFAULT 15,
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
    CONSTRAINT [PK__ListMemb__32FBA4C18A09448F] PRIMARY KEY ([ListId], [UserId]),
    CONSTRAINT [FK_LM_List] FOREIGN KEY ([ListId]) REFERENCES [Lists] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_LM_User] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Bookmarks] (
    [UserId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [Tid] nvarchar(20) NOT NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__Bookmark__8D29EA4D4F993AF5] PRIMARY KEY ([UserId], [PostId]),
    CONSTRAINT [FK_BookmarkPost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_BookmarkUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE TABLE [Likes] (
    [UserId] uniqueidentifier NOT NULL,
    [PostId] uniqueidentifier NOT NULL,
    [Tid] nvarchar(20) NOT NULL,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__Likes__8D29EA4DA4FAA6F6] PRIMARY KEY ([UserId], [PostId]),
    CONSTRAINT [FK_LikePost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_LikeUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
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
    [AltText] nvarchar(max) NULL,
    [Position] int NULL DEFAULT 0,
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
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
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    CONSTRAINT [PK__Reposts__8D29EA4D0BE60F6C] PRIMARY KEY ([UserId], [PostId]),
    CONSTRAINT [FK_RepostPost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RepostUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
);

CREATE INDEX [IX_BlockedAccounts_BlockedUserId] ON [BlockedAccounts] ([BlockedUserId]);

CREATE INDEX [IX_Bookmarks_PostId] ON [Bookmarks] ([PostId]);

CREATE UNIQUE INDEX [UQ__Bookmark__C451DB30DF335A92] ON [Bookmarks] ([Tid]);

CREATE INDEX [IX_ConversationParticipants_UserId] ON [ConversationParticipants] ([UserId]);

CREATE INDEX [IX_Feeds_CreatorId] ON [Feeds] ([CreatorId]);

CREATE UNIQUE INDEX [UQ__Feeds__C451DB30DDF6B147] ON [Feeds] ([Tid]);

CREATE UNIQUE INDEX [UQ__Interest__BC7B5FB60749EE1D] ON [Interests] ([Slug]);

CREATE INDEX [IX_Likes_PostId] ON [Likes] ([PostId]);

CREATE UNIQUE INDEX [UQ__Likes__C451DB30B024EDAB] ON [Likes] ([Tid]);

CREATE INDEX [IX_ListMembers_UserId] ON [ListMembers] ([UserId]);

CREATE INDEX [IX_Lists_OwnerId] ON [Lists] ([OwnerId]);

CREATE INDEX [IX_Messages_ConversationId] ON [Messages] ([ConversationId]);

CREATE INDEX [IX_Messages_SenderId] ON [Messages] ([SenderId]);

CREATE UNIQUE INDEX [UQ__Messages__C451DB300D86D8F0] ON [Messages] ([Tid]);

CREATE INDEX [IX_MutedAccounts_MutedUserId] ON [MutedAccounts] ([MutedUserId]);

CREATE INDEX [IX_MutedWords_UserId] ON [MutedWords] ([UserId]);

CREATE INDEX [IX_Notifications_RecipientId] ON [Notifications] ([RecipientId]);

CREATE INDEX [IX_Notifications_SenderId] ON [Notifications] ([SenderId]);

CREATE UNIQUE INDEX [UQ__Notifica__C451DB3001D0607B] ON [Notifications] ([Tid]);

CREATE INDEX [IX_PostInterests_InterestId] ON [PostInterests] ([InterestId]);

CREATE INDEX [IX_PostMedia_PostId] ON [PostMedia] ([PostId]);

CREATE INDEX [IX_PostReplyAllowedLists_ListId] ON [PostReplyAllowedLists] ([ListId]);

CREATE INDEX [IX_Posts_AuthorId] ON [Posts] ([AuthorId]);

CREATE INDEX [IX_Posts_ReplyToPostId] ON [Posts] ([ReplyToPostId]);

CREATE INDEX [IX_Posts_RootPostId] ON [Posts] ([RootPostId]);

CREATE INDEX [IX_Posts_Tid] ON [Posts] ([Tid]);

CREATE UNIQUE INDEX [UQ__Posts__C451DB308F8113F0] ON [Posts] ([Tid]);

CREATE INDEX [IX_Reposts_PostId] ON [Reposts] ([PostId]);

CREATE UNIQUE INDEX [UQ__Reposts__C451DB3010751B4E] ON [Reposts] ([Tid]);

CREATE INDEX [IX_UserFeedSubscriptions_FeedId] ON [UserFeedSubscriptions] ([FeedId]);

CREATE INDEX [IX_UserFollows_FollowingId] ON [UserFollows] ([FollowingId]);

CREATE INDEX [IX_UserInterests_InterestId] ON [UserInterests] ([InterestId]);

CREATE INDEX [IX_Users_Did] ON [Users] ([Did]);

CREATE UNIQUE INDEX [UQ__Users__536C85E411906A34] ON [Users] ([Username]);

CREATE UNIQUE INDEX [UQ__Users__A9D105340284C248] ON [Users] ([Email]);

CREATE UNIQUE INDEX [UQ__Users__C0312219EBC0F5F8] ON [Users] ([Did]);

CREATE UNIQUE INDEX [UQ__Users__FE5BB31A92C6FE6D] ON [Users] ([Handle]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260107045033_InitialCreate', N'9.0.0');

ALTER TABLE [PostMedia] ADD [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate()));

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260107155033_FixMissingColumns', N'9.0.0');

ALTER TABLE [Messages] ADD [ImageUrl] nvarchar(max) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260109053759_AddImageUrlToMessages', N'9.0.0');

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

CREATE UNIQUE INDEX [IX_LinkPreviews_MessageId] ON [LinkPreviews] ([MessageId]) WHERE [MessageId] IS NOT NULL;

CREATE UNIQUE INDEX [IX_LinkPreviews_PostId] ON [LinkPreviews] ([PostId]) WHERE [PostId] IS NOT NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260110045353_AddLinkPreviews', N'9.0.0');

ALTER TABLE [Users] ADD [Role] nvarchar(max) NOT NULL DEFAULT N'';

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260110101900_AddUserRole', N'9.0.0');

ALTER TABLE [Messages] ADD [IsModified] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [Messages] ADD [IsRecalled] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [Messages] ADD [ReplyToId] uniqueidentifier NULL;

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

CREATE INDEX [IX_Messages_ReplyToId] ON [Messages] ([ReplyToId]);

CREATE INDEX [IX_MessageReactions_MessageId] ON [MessageReactions] ([MessageId]);

CREATE INDEX [IX_MessageReactions_UserId] ON [MessageReactions] ([UserId]);

ALTER TABLE [Messages] ADD CONSTRAINT [FK_Messages_Messages_ReplyToId] FOREIGN KEY ([ReplyToId]) REFERENCES [Messages] ([Id]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260113165902_AddMissingMessageColumns', N'9.0.0');

ALTER TABLE [Posts] ADD [BookmarksCount] int NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260122052505_AddBookmarksCountToPost', N'9.0.0');

ALTER TABLE [Lists] ADD [IsCurated] bit NOT NULL DEFAULT CAST(0 AS bit);

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

CREATE INDEX [IX_ListPosts_AddedByUserId] ON [ListPosts] ([AddedByUserId]);

CREATE INDEX [IX_ListPosts_ListId] ON [ListPosts] ([ListId]);

CREATE INDEX [IX_ListPosts_PostId] ON [ListPosts] ([PostId]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260131110704_AddListPostsIsCurated', N'9.0.0');

ALTER TABLE [UserSettings] ADD [InAppNotifyFollowers] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [InAppNotifyLikes] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [InAppNotifyMentions] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [InAppNotifyQuotes] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [InAppNotifyReplies] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [InAppNotifyReposts] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [NotifyMentions] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [NotifyQuotes] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [NotifyReposts] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [PushNotifyFollowers] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [PushNotifyLikes] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [PushNotifyMentions] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [PushNotifyQuotes] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [PushNotifyReplies] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [PushNotifyReposts] bit NULL DEFAULT CAST(1 AS bit);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260202143227_AddNotificationSettings', N'9.0.0');

ALTER TABLE [Posts] ADD [QuotePostId] uniqueidentifier NULL;

ALTER TABLE [Notifications] ADD [Content] nvarchar(max) NULL;

ALTER TABLE [Notifications] ADD [ListId] uniqueidentifier NULL;

ALTER TABLE [Notifications] ADD [Title] nvarchar(max) NULL;

ALTER TABLE [MutedWords] ADD [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate()));

ALTER TABLE [MutedWords] ADD [MuteBehavior] nvarchar(20) NOT NULL DEFAULT N'hide';

ALTER TABLE [ListMembers] ADD [Status] int NOT NULL DEFAULT 0;

CREATE TABLE [Hashtags] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [Slug] nvarchar(100) NOT NULL,
    [PostsCount] int NULL DEFAULT 0,
    [CreatedAt] datetime2 NULL DEFAULT ((getutcdate())),
    [IsDeleted] bit NULL DEFAULT CAST(0 AS bit),
    CONSTRAINT [PK_Hashtags] PRIMARY KEY ([Id])
);

CREATE TABLE [PostHashtags] (
    [PostId] uniqueidentifier NOT NULL,
    [HashtagId] int NOT NULL,
    CONSTRAINT [PK_PostHashtags] PRIMARY KEY ([PostId], [HashtagId]),
    CONSTRAINT [FK_PH_Hashtag] FOREIGN KEY ([HashtagId]) REFERENCES [Hashtags] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PH_Post] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
);

CREATE INDEX [IX_Posts_QuotePostId] ON [Posts] ([QuotePostId]);

CREATE UNIQUE INDEX [IX_Hashtags_Slug] ON [Hashtags] ([Slug]);

CREATE INDEX [IX_PostHashtags_HashtagId] ON [PostHashtags] ([HashtagId]);

ALTER TABLE [Posts] ADD CONSTRAINT [FK_PostQuote] FOREIGN KEY ([QuotePostId]) REFERENCES [Posts] ([Id]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260217151527_AddQuotePostFeature', N'9.0.0');

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260217152032_FixQuotesCount', N'9.0.0');

ALTER TABLE [UserSettings] ADD [EnableDiscoverVideo] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [EnableTreeView] bit NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [UserSettings] ADD [EnableTrending] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [LargerAltBadge] bit NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [UserSettings] ADD [RequireLogoutVisibility] bit NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [UserSettings] ADD [SelectedInterests] nvarchar(max) NULL;

ALTER TABLE [UserSettings] ADD [ShowQuotePosts] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [ShowReplies] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [ShowReposts] bit NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [UserSettings] ADD [ShowSampleSavedFeeds] bit NULL DEFAULT CAST(0 AS bit);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260224205308_InitialFollowingFeedSettings', N'9.0.0');

ALTER TABLE [UserSettings] ADD [EnabledMediaProviders] nvarchar(max) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260225174757_EnabledMediaProviders', N'9.0.0');

ALTER TABLE [UserSettings] ADD [InAppNotifyActivity] bit NULL;

ALTER TABLE [UserSettings] ADD [InAppNotifyLikesOfReposts] bit NULL;

ALTER TABLE [UserSettings] ADD [InAppNotifyOthers] bit NULL;

ALTER TABLE [UserSettings] ADD [InAppNotifyRepostsOfReposts] bit NULL;

ALTER TABLE [UserSettings] ADD [NotifyActivity] bit NULL;

ALTER TABLE [UserSettings] ADD [NotifyLikesOfReposts] bit NULL;

ALTER TABLE [UserSettings] ADD [NotifyOthers] bit NULL;

ALTER TABLE [UserSettings] ADD [NotifyRepostsOfReposts] bit NULL;

ALTER TABLE [UserSettings] ADD [PushNotifyActivity] bit NULL;

ALTER TABLE [UserSettings] ADD [PushNotifyLikesOfReposts] bit NULL;

ALTER TABLE [UserSettings] ADD [PushNotifyOthers] bit NULL;

ALTER TABLE [UserSettings] ADD [PushNotifyRepostsOfReposts] bit NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260303192104_AddExtendedNotificationSettings', N'9.0.0');

DECLARE @var0 sysname;
SELECT @var0 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'PushNotifyRepostsOfReposts');
IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var0 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [PushNotifyRepostsOfReposts];

DECLARE @var1 sysname;
SELECT @var1 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'PushNotifyOthers');
IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var1 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [PushNotifyOthers];

DECLARE @var2 sysname;
SELECT @var2 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'PushNotifyLikesOfReposts');
IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var2 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [PushNotifyLikesOfReposts];

DECLARE @var3 sysname;
SELECT @var3 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'PushNotifyActivity');
IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var3 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [PushNotifyActivity];

DECLARE @var4 sysname;
SELECT @var4 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'NotifyRepostsOfReposts');
IF @var4 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var4 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [NotifyRepostsOfReposts];

DECLARE @var5 sysname;
SELECT @var5 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'NotifyOthers');
IF @var5 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var5 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [NotifyOthers];

DECLARE @var6 sysname;
SELECT @var6 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'NotifyLikesOfReposts');
IF @var6 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var6 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [NotifyLikesOfReposts];

DECLARE @var7 sysname;
SELECT @var7 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'NotifyActivity');
IF @var7 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var7 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [NotifyActivity];

DECLARE @var8 sysname;
SELECT @var8 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'InAppNotifyRepostsOfReposts');
IF @var8 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var8 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [InAppNotifyRepostsOfReposts];

DECLARE @var9 sysname;
SELECT @var9 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'InAppNotifyOthers');
IF @var9 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var9 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [InAppNotifyOthers];

DECLARE @var10 sysname;
SELECT @var10 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'InAppNotifyLikesOfReposts');
IF @var10 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var10 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [InAppNotifyLikesOfReposts];

DECLARE @var11 sysname;
SELECT @var11 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[UserSettings]') AND [c].[name] = N'InAppNotifyActivity');
IF @var11 IS NOT NULL EXEC(N'ALTER TABLE [UserSettings] DROP CONSTRAINT [' + @var11 + '];');
ALTER TABLE [UserSettings] ADD DEFAULT CAST(1 AS bit) FOR [InAppNotifyActivity];

ALTER TABLE [UserFollows] ADD [Tid] nvarchar(20) NOT NULL DEFAULT N'';

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

CREATE INDEX [IX_Notifications_PostId] ON [Notifications] ([PostId]);

CREATE INDEX [IX_RepoBlocks_Did] ON [RepoBlocks] ([Did]);

CREATE INDEX [IX_SupportRequests_UserId] ON [SupportRequests] ([UserId]);

ALTER TABLE [Notifications] ADD CONSTRAINT [FK_NotificationPost] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE SET NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260313142741_AddTidToUserFollows', N'9.0.0');

ALTER TABLE [Users] ADD [SigningPublicKey] nvarchar(max) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260313161411_AddSigningPublicKeyToUsers', N'9.0.0');

ALTER TABLE [Users] ADD [EncryptedSigningPrivateKey] nvarchar(max) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260313163847_AddEncryptedPrivateKeyToUsers', N'9.0.0');

ALTER TABLE [Users] ADD [RepoCommitSignature] nvarchar(max) NULL;

ALTER TABLE [Users] ADD [RepoRev] nvarchar(max) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260313164941_AddRepoSigningToUsers', N'9.0.0');

ALTER TABLE [UserFollows] ADD [Cid] nvarchar(100) NULL;

ALTER TABLE [UserFollows] ADD [Uri] nvarchar(200) NULL;

ALTER TABLE [Reposts] ADD [Cid] nvarchar(100) NULL;

ALTER TABLE [Reposts] ADD [Uri] nvarchar(200) NULL;

ALTER TABLE [Posts] ADD [Cid] nvarchar(100) NULL;

ALTER TABLE [PostMedia] ADD [Cid] nvarchar(100) NULL;

ALTER TABLE [Likes] ADD [Cid] nvarchar(100) NULL;

ALTER TABLE [Likes] ADD [Uri] nvarchar(200) NULL;

ALTER TABLE [Bookmarks] ADD [Cid] nvarchar(100) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260314181439_AddMissingCidAndUriColumns', N'9.0.0');

DECLARE @var12 sysname;
SELECT @var12 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'RepoRev');
IF @var12 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT [' + @var12 + '];');
ALTER TABLE [Users] ALTER COLUMN [RepoRev] nvarchar(20) NULL;

DECLARE @var13 sysname;
SELECT @var13 = [d].[name]
FROM [sys].[default_constraints] [d]
INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Users]') AND [c].[name] = N'RepoCommitSignature');
IF @var13 IS NOT NULL EXEC(N'ALTER TABLE [Users] DROP CONSTRAINT [' + @var13 + '];');
ALTER TABLE [Users] ALTER COLUMN [RepoCommitSignature] nvarchar(256) NULL;

ALTER TABLE [Users] ADD [RepoCommit] nvarchar(100) NULL;

ALTER TABLE [Users] ADD [RepoRoot] nvarchar(100) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260315060923_AddMstPropertiesToUser', N'9.0.0');

ALTER TABLE [Posts] ADD [FacetsJson] nvarchar(max) NULL;

ALTER TABLE [Posts] ADD [Uri] nvarchar(max) NULL;

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

CREATE INDEX [IX_Labels_Uri] ON [Labels] ([Uri]);

CREATE INDEX [IX_Reports_ReporterId] ON [Reports] ([ReporterId]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260315120917_AddFacetsJsonToPost', N'9.0.0');

COMMIT;
GO


