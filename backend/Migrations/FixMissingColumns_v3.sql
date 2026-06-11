USE [BlueSkyClone];
GO

/*
  Comprehensive Database Schema Alignment Fix (v3)
  Final pass to ensure Tid, Cid, Uri, and CreatedAt exist across all interaction tables.
*/

-- 1. [Bookmarks]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Bookmarks]') AND name = 'Tid')
    ALTER TABLE [Bookmarks] ADD [Tid] nvarchar(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Bookmarks]') AND name = 'Cid')
    ALTER TABLE [Bookmarks] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Bookmarks]') AND name = 'CreatedAt')
    ALTER TABLE [Bookmarks] ADD [CreatedAt] datetime2 NULL;

-- 2. [Likes]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Likes]') AND name = 'Tid')
    ALTER TABLE [Likes] ADD [Tid] nvarchar(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Likes]') AND name = 'Cid')
    ALTER TABLE [Likes] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Likes]') AND name = 'Uri')
    ALTER TABLE [Likes] ADD [Uri] nvarchar(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Likes]') AND name = 'CreatedAt')
    ALTER TABLE [Likes] ADD [CreatedAt] datetime2 NULL;

-- 3. [Reposts]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Reposts]') AND name = 'Tid')
    ALTER TABLE [Reposts] ADD [Tid] nvarchar(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Reposts]') AND name = 'Cid')
    ALTER TABLE [Reposts] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Reposts]') AND name = 'Uri')
    ALTER TABLE [Reposts] ADD [Uri] nvarchar(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Reposts]') AND name = 'CreatedAt')
    ALTER TABLE [Reposts] ADD [CreatedAt] datetime2 NULL;

-- 4. [UserFollows]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[UserFollows]') AND name = 'Tid')
    ALTER TABLE [UserFollows] ADD [Tid] nvarchar(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[UserFollows]') AND name = 'Cid')
    ALTER TABLE [UserFollows] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[UserFollows]') AND name = 'Uri')
    ALTER TABLE [UserFollows] ADD [Uri] nvarchar(200) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[UserFollows]') AND name = 'CreatedAt')
    ALTER TABLE [UserFollows] ADD [CreatedAt] datetime2 NULL;

-- 5. [Posts]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Posts]') AND name = 'Tid')
    ALTER TABLE [Posts] ADD [Tid] nvarchar(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Posts]') AND name = 'Cid')
    ALTER TABLE [Posts] ADD [Cid] nvarchar(100) NULL;

-- 6. [Notifications]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Notifications]') AND name = 'Tid')
    ALTER TABLE [Notifications] ADD [Tid] nvarchar(20) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Notifications]') AND name = 'CreatedAt')
    ALTER TABLE [Notifications] ADD [CreatedAt] datetime2 NULL;

-- 7. [UserListSubscriptions]
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID('[UserListSubscriptions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [UserListSubscriptions] (
        [UserId] uniqueidentifier NOT NULL,
        [ListId] uniqueidentifier NOT NULL,
        [PinnedOrder] int NOT NULL DEFAULT 0,
        [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE(),
        CONSTRAINT [PK_UserListSubscription] PRIMARY KEY ([UserId], [ListId])
    );
END
