-- ============================================================
-- Complete Database Reset and Setup Script for BlueSkyClone
-- This script ensures ALL tables exist with proper schema
-- Run this if you're setting up a fresh database or after dropping
-- ============================================================

USE BlueSkyClone;
GO

PRINT 'Starting complete database setup...';
GO

-- ============================================================
-- Create missing tables that aren't in EF migrations
-- ============================================================

-- LinkPreviews table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'LinkPreviews')
BEGIN
    PRINT 'Creating LinkPreviews table...';
    CREATE TABLE [LinkPreviews] (
        [Id] uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID(),
        [Url] nvarchar(max) NOT NULL,
        [Title] nvarchar(max) NULL,
        [Description] nvarchar(max) NULL,
        [Image] nvarchar(max) NULL,
        [Domain] nvarchar(max) NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        [PostId] uniqueidentifier NULL,
        [MessageId] uniqueidentifier NULL,
        CONSTRAINT [PK_LinkPreviews] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_LinkPreviews_Messages_MessageId] FOREIGN KEY ([MessageId]) REFERENCES [Messages] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_LinkPreviews_Posts_PostId] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
    );

    CREATE UNIQUE INDEX [IX_LinkPreviews_MessageId] ON [LinkPreviews] ([MessageId]) WHERE [MessageId] IS NOT NULL;
    CREATE UNIQUE INDEX [IX_LinkPreviews_PostId] ON [LinkPreviews] ([PostId]) WHERE [PostId] IS NOT NULL;
    PRINT '  LinkPreviews table created!';
END
ELSE
BEGIN
    PRINT '  LinkPreviews table already exists';
END
GO

-- MessageReactions table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'MessageReactions')
BEGIN
    PRINT 'Creating MessageReactions table...';
    CREATE TABLE [MessageReactions] (
        [Id] uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID(),
        [MessageId] uniqueidentifier NOT NULL,
        [UserId] uniqueidentifier NOT NULL,
        [Emoji] nvarchar(50) NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_MessageReactions] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_MessageReactions_Messages_MessageId] FOREIGN KEY ([MessageId]) REFERENCES [Messages] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_MessageReactions_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id])
    );

    CREATE INDEX [IX_MessageReactions_MessageId] ON [MessageReactions] ([MessageId]);
    CREATE INDEX [IX_MessageReactions_UserId] ON [MessageReactions] ([UserId]);
    PRINT '  MessageReactions table created!';
END
ELSE
BEGIN
    PRINT '  MessageReactions table already exists';
END
GO

-- Hashtags table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Hashtags')
BEGIN
    PRINT 'Creating Hashtags table...';
    CREATE TABLE [Hashtags] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Slug] nvarchar(100) NOT NULL,
        [PostsCount] int NULL DEFAULT 0,
        [CreatedAt] datetime2 NULL DEFAULT GETUTCDATE(),
        [IsDeleted] bit NULL DEFAULT 0,
        CONSTRAINT [PK_Hashtags] PRIMARY KEY ([Id])
    );

    CREATE UNIQUE INDEX [IX_Hashtags_Slug] ON [Hashtags] ([Slug]);
    PRINT '  Hashtags table created!';
END
ELSE
BEGIN
    PRINT '  Hashtags table already exists';
END
GO

-- PostHashtags junction table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PostHashtags')
BEGIN
    PRINT 'Creating PostHashtags table...';
    CREATE TABLE [PostHashtags] (
        [PostId] uniqueidentifier NOT NULL,
        [HashtagId] int NOT NULL,
        CONSTRAINT [PK_PostHashtags] PRIMARY KEY ([PostId], [HashtagId]),
        CONSTRAINT [FK_PH_Hashtag] FOREIGN KEY ([HashtagId]) REFERENCES [Hashtags] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_PH_Post] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]) ON DELETE CASCADE
    );

    CREATE INDEX [IX_PostHashtags_HashtagId] ON [PostHashtags] ([HashtagId]);
    PRINT '  PostHashtags table created!';
END
ELSE
BEGIN
    PRINT '  PostHashtags table already exists';
END
GO

-- Labels table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Labels')
BEGIN
    PRINT 'Creating Labels table...';
    CREATE TABLE [Labels] (
        [Id] uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID(),
        [Src] nvarchar(256) NOT NULL,
        [Uri] nvarchar(256) NOT NULL,
        [Cid] nvarchar(256) NULL,
        [Val] nvarchar(100) NOT NULL,
        [Neg] bit NOT NULL DEFAULT 0,
        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        [ExpiresAt] datetime2 NULL,
        CONSTRAINT [PK_Labels] PRIMARY KEY ([Id])
    );

    CREATE INDEX [IX_Labels_Uri] ON [Labels] ([Uri]);
    PRINT '  Labels table created!';
END
ELSE
BEGIN
    PRINT '  Labels table already exists';
END
GO

-- PageContents table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'PageContents')
BEGIN
    PRINT 'Creating PageContents table...';
    CREATE TABLE [PageContents] (
        [Slug] nvarchar(450) NOT NULL,
        [Title] nvarchar(max) NOT NULL,
        [HtmlContent] nvarchar(max) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_PageContents] PRIMARY KEY ([Slug])
    );
    PRINT '  PageContents table created!';
END
ELSE
BEGIN
    PRINT '  PageContents table already exists';
END
GO

-- RepoBlocks table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'RepoBlocks')
BEGIN
    PRINT 'Creating RepoBlocks table...';
    CREATE TABLE [RepoBlocks] (
        [Cid] nvarchar(100) NOT NULL,
        [Data] varbinary(max) NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        [Did] nvarchar(100) NOT NULL,
        CONSTRAINT [PK_RepoBlocks] PRIMARY KEY ([Cid])
    );

    CREATE INDEX [IX_RepoBlocks_Did] ON [RepoBlocks] ([Did]);
    PRINT '  RepoBlocks table created!';
END
ELSE
BEGIN
    PRINT '  RepoBlocks table already exists';
END
GO

-- Reports table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Reports')
BEGIN
    PRINT 'Creating Reports table...';
    CREATE TABLE [Reports] (
        [Id] uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID(),
        [SubjectType] nvarchar(50) NOT NULL,
        [SubjectUri] nvarchar(256) NOT NULL,
        [SubjectCid] nvarchar(256) NULL,
        [ReasonType] nvarchar(50) NOT NULL,
        [ReasonText] nvarchar(max) NULL,
        [ReporterId] uniqueidentifier NOT NULL,
        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        [Status] nvarchar(20) NOT NULL DEFAULT N'open',
        CONSTRAINT [PK_Reports] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_Reports_Users_ReporterId] FOREIGN KEY ([ReporterId]) REFERENCES [Users] ([Id])
    );

    CREATE INDEX [IX_Reports_ReporterId] ON [Reports] ([ReporterId]);
    PRINT '  Reports table created!';
END
ELSE
BEGIN
    PRINT '  Reports table already exists';
END
GO

-- SupportRequests table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SupportRequests')
BEGIN
    PRINT 'Creating SupportRequests table...';
    CREATE TABLE [SupportRequests] (
        [Id] uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID(),
        [Email] nvarchar(256) NOT NULL,
        [Description] nvarchar(max) NOT NULL,
        [Username] nvarchar(256) NULL,
        [Category] nvarchar(50) NOT NULL,
        [DeviceType] nvarchar(20) NOT NULL,
        [Status] nvarchar(20) NOT NULL DEFAULT N'pending',
        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        [UserId] uniqueidentifier NULL,
        CONSTRAINT [PK_SupportRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_SupportRequests_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
    );

    CREATE INDEX [IX_SupportRequests_UserId] ON [SupportRequests] ([UserId]);
    PRINT '  SupportRequests table created!';
END
ELSE
BEGIN
    PRINT '  SupportRequests table already exists';
END
GO

-- ListPosts table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ListPosts')
BEGIN
    PRINT 'Creating ListPosts table...';
    CREATE TABLE [ListPosts] (
        [Id] uniqueidentifier NOT NULL DEFAULT NEWSEQUENTIALID(),
        [ListId] uniqueidentifier NOT NULL,
        [PostId] uniqueidentifier NOT NULL,
        [AddedByUserId] uniqueidentifier NOT NULL,
        [AddedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        [Caption] nvarchar(max) NULL,
        CONSTRAINT [PK_ListPosts] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_ListPosts_Lists_ListId] FOREIGN KEY ([ListId]) REFERENCES [Lists] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_ListPosts_Posts_PostId] FOREIGN KEY ([PostId]) REFERENCES [Posts] ([Id]),
        CONSTRAINT [FK_ListPosts_Users_AddedByUserId] FOREIGN KEY ([AddedByUserId]) REFERENCES [Users] ([Id])
    );

    CREATE INDEX [IX_ListPosts_AddedByUserId] ON [ListPosts] ([AddedByUserId]);
    CREATE INDEX [IX_ListPosts_ListId] ON [ListPosts] ([ListId]);
    CREATE INDEX [IX_ListPosts_PostId] ON [ListPosts] ([PostId]);
    PRINT '  ListPosts table created!';
END
ELSE
BEGIN
    PRINT '  ListPosts table already exists';
END
GO

-- ============================================================
-- Ensure Posts.BookmarksCount is correct
-- ============================================================
PRINT 'Fixing Posts.BookmarksCount...';

IF COL_LENGTH('Posts', 'BookmarksCount') IS NULL
BEGIN
    ALTER TABLE Posts ADD BookmarksCount int NOT NULL DEFAULT 0;
    PRINT '  Added BookmarksCount column';
END
ELSE
BEGIN
    -- Update any NULL values
    UPDATE Posts SET BookmarksCount = 0 WHERE BookmarksCount IS NULL;
    
    -- Ensure default constraint exists
    IF NOT EXISTS (SELECT * FROM sys.default_constraints WHERE name = 'DF_Posts_BookmarksCount' AND parent_object_id = OBJECT_ID('Posts'))
    BEGIN
        ALTER TABLE Posts ADD CONSTRAINT DF_Posts_BookmarksCount DEFAULT 0 FOR BookmarksCount;
        PRINT '  Added BookmarksCount default constraint';
    END
    
    -- Make sure column is NOT NULL
    IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = 'Posts' 
               AND COLUMN_NAME = 'BookmarksCount' 
               AND IS_NULLABLE = 'YES')
    BEGIN
        ALTER TABLE Posts ALTER COLUMN BookmarksCount int NOT NULL;
        PRINT '  Made BookmarksCount NOT NULL';
    END
END

-- Ensure other Posts columns exist
IF COL_LENGTH('Posts', 'Uri') IS NULL
BEGIN
    ALTER TABLE Posts ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column to Posts';
END

IF COL_LENGTH('Posts', 'Cid') IS NULL
BEGIN
    ALTER TABLE Posts ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column to Posts';
END

IF COL_LENGTH('Posts', 'Labels') IS NULL
BEGIN
    ALTER TABLE Posts ADD [Labels] nvarchar(max) NULL;
    PRINT '  Added Labels column to Posts';
END

IF COL_LENGTH('Posts', 'FacetsJson') IS NULL
BEGIN
    ALTER TABLE Posts ADD [FacetsJson] nvarchar(max) NULL;
    PRINT '  Added FacetsJson column to Posts';
END

IF COL_LENGTH('Posts', 'QuotePostId') IS NULL
BEGIN
    ALTER TABLE Posts ADD [QuotePostId] uniqueidentifier NULL;
    PRINT '  Added QuotePostId column to Posts';
END

IF COL_LENGTH('Posts', 'QuotesCount') IS NULL
BEGIN
    ALTER TABLE Posts ADD [QuotesCount] int NULL DEFAULT 0;
    PRINT '  Added QuotesCount column to Posts';
END

IF COL_LENGTH('Posts', 'ReplyRestriction') IS NULL
BEGIN
    ALTER TABLE Posts ADD [ReplyRestriction] nvarchar(50) NULL;
    PRINT '  Added ReplyRestriction column to Posts';
END

IF COL_LENGTH('Posts', 'AllowQuotes') IS NULL
BEGIN
    ALTER TABLE Posts ADD [AllowQuotes] bit NULL DEFAULT 1;
    PRINT '  Added AllowQuotes column to Posts';
END

IF COL_LENGTH('Posts', 'Language') IS NULL
BEGIN
    ALTER TABLE Posts ADD [Language] nvarchar(10) NULL;
    PRINT '  Added Language column to Posts';
END
GO

-- ============================================================
-- Ensure missing columns exist in Users
-- ============================================================
IF COL_LENGTH('Users', 'PdsHost') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [PdsHost] nvarchar(max) NULL;
    PRINT 'Added PdsHost column to Users';
END

IF COL_LENGTH('Users', 'PasswordHash') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [PasswordHash] nvarchar(max) NOT NULL DEFAULT '';
    PRINT 'Added PasswordHash column to Users';
END

IF COL_LENGTH('Users', 'Salt') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [Salt] nvarchar(max) NOT NULL DEFAULT '';
    PRINT 'Added Salt column to Users';
END

IF COL_LENGTH('Users', 'Role') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [Role] nvarchar(50) NOT NULL DEFAULT 'user';
    PRINT 'Added Role column to Users';
END

IF COL_LENGTH('Users', 'Labels') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [Labels] nvarchar(max) NULL;
    PRINT 'Added Labels column to Users';
END

IF COL_LENGTH('Users', 'PinnedPostUri') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [PinnedPostUri] nvarchar(max) NULL;
    PRINT 'Added PinnedPostUri column to Users';
END

IF COL_LENGTH('Users', 'SigningPublicKey') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [SigningPublicKey] nvarchar(max) NULL;
    PRINT 'Added SigningPublicKey column to Users';
END

IF COL_LENGTH('Users', 'EncryptedSigningPrivateKey') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [EncryptedSigningPrivateKey] nvarchar(max) NULL;
    PRINT 'Added EncryptedSigningPrivateKey column to Users';
END

IF COL_LENGTH('Users', 'RepoRev') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoRev] nvarchar(max) NULL;
    PRINT 'Added RepoRev column to Users';
END

IF COL_LENGTH('Users', 'RepoRoot') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoRoot] nvarchar(max) NULL;
    PRINT 'Added RepoRoot column to Users';
END

IF COL_LENGTH('Users', 'RepoCommit') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoCommit] nvarchar(max) NULL;
    PRINT 'Added RepoCommit column to Users';
END

IF COL_LENGTH('Users', 'RepoCommitSignature') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoCommitSignature] nvarchar(max) NULL;
    PRINT 'Added RepoCommitSignature column to Users';
END
GO

-- ============================================================
-- Ensure missing columns exist in UserSettings
-- ============================================================
IF EXISTS (SELECT * FROM sys.tables WHERE name = 'UserSettings')
BEGIN
    IF COL_LENGTH('UserSettings', 'NotifyOnFollow') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [NotifyOnFollow] bit NULL DEFAULT 1;
        PRINT 'Added NotifyOnFollow column to UserSettings';
    END

    IF COL_LENGTH('UserSettings', 'NotifyOnLike') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [NotifyOnLike] bit NULL DEFAULT 1;
        PRINT 'Added NotifyOnLike column to UserSettings';
    END

    IF COL_LENGTH('UserSettings', 'NotifyOnRepost') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [NotifyOnRepost] bit NULL DEFAULT 1;
        PRINT 'Added NotifyOnRepost column to UserSettings';
    END

    IF COL_LENGTH('UserSettings', 'NotifyOnReply') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [NotifyOnReply] bit NULL DEFAULT 1;
        PRINT 'Added NotifyOnReply column to UserSettings';
    END

    IF COL_LENGTH('UserSettings', 'NotifyOnMention') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [NotifyOnMention] bit NULL DEFAULT 1;
        PRINT 'Added NotifyOnMention column to UserSettings';
    END

    IF COL_LENGTH('UserSettings', 'NotifyOnQuote') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [NotifyOnQuote] bit NULL DEFAULT 1;
        PRINT 'Added NotifyOnQuote column to UserSettings';
    END

    IF COL_LENGTH('UserSettings', 'EmailNotifications') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [EmailNotifications] bit NULL DEFAULT 0;
        PRINT 'Added EmailNotifications column to UserSettings';
    END

    IF COL_LENGTH('UserSettings', 'ShowAdultContent') IS NULL
    BEGIN
        ALTER TABLE [UserSettings] ADD [ShowAdultContent] bit NULL DEFAULT 0;
        PRINT 'Added ShowAdultContent column to UserSettings';
    END
END
GO

PRINT '';
PRINT '====================================';
PRINT 'Database setup completed successfully!';
PRINT '====================================';
PRINT '';
PRINT 'Summary of tables:';
SELECT 
    TABLE_NAME,
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = t.TABLE_NAME) AS ColumnCount
FROM INFORMATION_SCHEMA.TABLES t
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;
GO
