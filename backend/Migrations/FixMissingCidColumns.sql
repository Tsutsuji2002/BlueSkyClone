IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Bookmarks]') AND name = 'Cid')
BEGIN
    ALTER TABLE [Bookmarks] ADD [Cid] nvarchar(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Likes]') AND name = 'Cid')
BEGIN
    ALTER TABLE [Likes] ADD [Cid] nvarchar(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Reposts]') AND name = 'Cid')
BEGIN
    ALTER TABLE [Reposts] ADD [Cid] nvarchar(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[UserFollows]') AND name = 'Cid')
BEGIN
    ALTER TABLE [UserFollows] ADD [Cid] nvarchar(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Posts]') AND name = 'Cid')
BEGIN
    ALTER TABLE [Posts] ADD [Cid] nvarchar(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[PostMedia]') AND name = 'Cid')
BEGIN
    ALTER TABLE [PostMedia] ADD [Cid] nvarchar(100) NULL;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('[Labels]') AND name = 'Cid')
BEGIN
    ALTER TABLE [Labels] ADD [Cid] nvarchar(256) NULL;
END
