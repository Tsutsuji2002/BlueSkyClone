-- Global Schema Repair for BlueSkyClone
USE BlueSkyClone;
GO

-- 1. Posts table fixes
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'QuotePostId')
BEGIN
    ALTER TABLE dbo.Posts ADD QuotePostId UNIQUEIDENTIFIER NULL;
    PRINT 'Added QuotePostId to Posts';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'QuotesCount')
BEGIN
    ALTER TABLE dbo.Posts ADD QuotesCount INT NULL DEFAULT 0;
    PRINT 'Added QuotesCount to Posts';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'ReplyRestriction')
BEGIN
    ALTER TABLE dbo.Posts ADD ReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';
    PRINT 'Added ReplyRestriction to Posts';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'AllowQuotes')
BEGIN
    ALTER TABLE dbo.Posts ADD AllowQuotes BIT NULL DEFAULT 1;
    PRINT 'Added AllowQuotes to Posts';
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'Language')
BEGIN
    ALTER TABLE dbo.Posts ADD Language NVARCHAR(MAX) NULL;
    PRINT 'Added Language to Posts';
END
GO

-- 2. UserSettings table fixes
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowReplies')
    ALTER TABLE dbo.UserSettings ADD ShowReplies BIT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowReposts')
    ALTER TABLE dbo.UserSettings ADD ShowReposts BIT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowQuotePosts')
    ALTER TABLE dbo.UserSettings ADD ShowQuotePosts BIT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowSampleSavedFeeds')
    ALTER TABLE dbo.UserSettings ADD ShowSampleSavedFeeds BIT NULL DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'DefaultReplyRestriction')
    ALTER TABLE dbo.UserSettings ADD DefaultReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'DefaultAllowQuotes')
    ALTER TABLE dbo.UserSettings ADD DefaultAllowQuotes BIT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnableTrending')
    ALTER TABLE dbo.UserSettings ADD EnableTrending BIT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnableDiscoverVideo')
    ALTER TABLE dbo.UserSettings ADD EnableDiscoverVideo BIT NULL DEFAULT 1;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnabledMediaProviders')
    ALTER TABLE dbo.UserSettings ADD EnabledMediaProviders NVARCHAR(MAX) NULL;
PRINT 'Updated UserSettings columns';
GO

-- 3. Notifications table fixes
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'Title')
    ALTER TABLE dbo.Notifications ADD Title NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'Content')
    ALTER TABLE dbo.Notifications ADD Content NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'ListId')
    ALTER TABLE dbo.Notifications ADD ListId UNIQUEIDENTIFIER NULL;
PRINT 'Updated Notifications columns';
GO

-- 4. Users table fixes
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IsBanned')
    ALTER TABLE dbo.Users ADD IsBanned BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IsVerified')
    ALTER TABLE dbo.Users ADD IsVerified BIT NOT NULL DEFAULT 0;
PRINT 'Updated Users columns';
GO

-- Foreign Key Constraints
IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PostQuote')
BEGIN
    ALTER TABLE dbo.Posts ADD CONSTRAINT FK_PostQuote FOREIGN KEY (QuotePostId) REFERENCES dbo.Posts(Id);
    PRINT 'Added FK_PostQuote';
END
GO
