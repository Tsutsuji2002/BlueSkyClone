USE [BlueSkyClone];
GO

/*
  Comprehensive Database Schema Alignment Fix (v2)
  This script adds missing columns to several tables to match the Entity Framework models.
   identified in backend logs: PostMedia, Notifications, Bookmarks, Likes, Reposts.
*/

-- 1. [Bookmarks]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Bookmarks]') AND name = 'Cid')
    ALTER TABLE [Bookmarks] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Bookmarks]') AND name = 'CreatedAt')
    ALTER TABLE [Bookmarks] ADD [CreatedAt] datetime2 NULL;

-- 2. [Likes]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Likes]') AND name = 'Cid')
    ALTER TABLE [Likes] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Likes]') AND name = 'CreatedAt')
    ALTER TABLE [Likes] ADD [CreatedAt] datetime2 NULL;

-- 3. [Reposts]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Reposts]') AND name = 'Cid')
    ALTER TABLE [Reposts] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Reposts]') AND name = 'CreatedAt')
    ALTER TABLE [Reposts] ADD [CreatedAt] datetime2 NULL;

-- 4. [UserFollows]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[UserFollows]') AND name = 'Cid')
    ALTER TABLE [UserFollows] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[UserFollows]') AND name = 'CreatedAt')
    ALTER TABLE [UserFollows] ADD [CreatedAt] datetime2 NULL;

-- 5. [Posts]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Posts]') AND name = 'Cid')
    ALTER TABLE [Posts] ADD [Cid] nvarchar(100) NULL;

-- 6. [PostMedia]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[PostMedia]') AND name = 'Cid')
    ALTER TABLE [PostMedia] ADD [Cid] nvarchar(100) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[PostMedia]') AND name = 'CreatedAt')
    ALTER TABLE [PostMedia] ADD [CreatedAt] datetime2 NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[PostMedia]') AND name = 'ThumbnailUrl')
    ALTER TABLE [PostMedia] ADD [ThumbnailUrl] nvarchar(4000) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[PostMedia]') AND name = 'Position')
    ALTER TABLE [PostMedia] ADD [Position] int NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[PostMedia]') AND name = 'IsDeleted')
    ALTER TABLE [PostMedia] ADD [IsDeleted] bit NULL DEFAULT 0;

-- 7. [Notifications]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Notifications]') AND name = 'Content')
    ALTER TABLE [Notifications] ADD [Content] nvarchar(max) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Notifications]') AND name = 'ListId')
    ALTER TABLE [Notifications] ADD [ListId] uniqueidentifier NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Notifications]') AND name = 'Title')
    ALTER TABLE [Notifications] ADD [Title] nvarchar(256) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Notifications]') AND name = 'CreatedAt')
    ALTER TABLE [Notifications] ADD [CreatedAt] datetime2 NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Notifications]') AND name = 'IsDeleted')
    ALTER TABLE [Notifications] ADD [IsDeleted] bit NULL DEFAULT 0;

-- 8. [Labels]
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Labels]') AND name = 'Cid')
    ALTER TABLE [Labels] ADD [Cid] nvarchar(256) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Labels]') AND name = 'CreatedAt')
    ALTER TABLE [Labels] ADD [CreatedAt] datetime2 NULL DEFAULT GETUTCDATE();
