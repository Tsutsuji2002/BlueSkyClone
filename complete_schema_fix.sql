-- Complete Schema Fix for BlueSkyClone Database
-- Adds all missing columns that the code expects but migrations didn't create
USE BlueSkyClone;
GO

PRINT 'Starting comprehensive schema fix...';
GO

-- ============================================
-- FIX POSTS TABLE
-- ============================================
PRINT 'Fixing Posts table...';

IF COL_LENGTH('Posts', 'Uri') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column';
END

IF COL_LENGTH('Posts', 'Cid') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column';
END

IF COL_LENGTH('Posts', 'BookmarksCount') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [BookmarksCount] int NOT NULL DEFAULT 0;
    PRINT '  Added BookmarksCount column';
END

IF COL_LENGTH('Posts', 'FacetsJson') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [FacetsJson] nvarchar(max) NULL;
    PRINT '  Added FacetsJson column';
END

IF COL_LENGTH('Posts', 'Labels') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [Labels] nvarchar(max) NULL;
    PRINT '  Added Labels column';
END

IF COL_LENGTH('Posts', 'Language') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [Language] nvarchar(20) NULL;
    PRINT '  Added Language column';
END

IF COL_LENGTH('Posts', 'QuotePostId') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [QuotePostId] uniqueidentifier NULL;
    PRINT '  Added QuotePostId column';
END

IF COL_LENGTH('Posts', 'EmbedJson') IS NULL
BEGIN
    ALTER TABLE [Posts] ADD [EmbedJson] nvarchar(max) NULL;
    PRINT '  Added EmbedJson column';
END

-- ============================================
-- FIX USERS TABLE
-- ============================================
PRINT 'Fixing Users table...';

IF COL_LENGTH('Users', 'IsBanned') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [IsBanned] bit NOT NULL DEFAULT 0;
    PRINT '  Added IsBanned column';
END

IF COL_LENGTH('Users', 'IsVerified') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [IsVerified] bit NOT NULL DEFAULT 0;
    PRINT '  Added IsVerified column';
END

IF COL_LENGTH('Users', 'BlueskyAccessToken') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [BlueskyAccessToken] nvarchar(max) NULL;
    PRINT '  Added BlueskyAccessToken column';
END

IF COL_LENGTH('Users', 'BlueskyRefreshToken') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [BlueskyRefreshToken] nvarchar(max) NULL;
    PRINT '  Added BlueskyRefreshToken column';
END

IF COL_LENGTH('Users', 'EmailConfirmed') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [EmailConfirmed] bit NOT NULL DEFAULT 1;
    PRINT '  Added EmailConfirmed column';
END

IF COL_LENGTH('Users', 'PdsHost') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [PdsHost] nvarchar(max) NULL;
    PRINT '  Added PdsHost column';
END

-- ============================================
-- FIX LIKES TABLE
-- ============================================
PRINT 'Fixing Likes table...';

IF COL_LENGTH('Likes', 'Uri') IS NULL
BEGIN
    ALTER TABLE [Likes] ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column';
END

IF COL_LENGTH('Likes', 'Cid') IS NULL
BEGIN
    ALTER TABLE [Likes] ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column';
END

-- ============================================
-- FIX REPOSTS TABLE
-- ============================================
PRINT 'Fixing Reposts table...';

IF COL_LENGTH('Reposts', 'Uri') IS NULL
BEGIN
    ALTER TABLE [Reposts] ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column';
END

IF COL_LENGTH('Reposts', 'Cid') IS NULL
BEGIN
    ALTER TABLE [Reposts] ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column';
END

-- ============================================
-- FIX USERFOLLOWS TABLE
-- ============================================
PRINT 'Fixing UserFollows table...';

IF COL_LENGTH('UserFollows', 'Uri') IS NULL
BEGIN
    ALTER TABLE [UserFollows] ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column';
END

IF COL_LENGTH('UserFollows', 'Cid') IS NULL
BEGIN
    ALTER TABLE [UserFollows] ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column';
END

-- ============================================
-- FIX BLOCKEDACCOUNTS TABLE
-- ============================================
PRINT 'Fixing BlockedAccounts table...';

IF COL_LENGTH('BlockedAccounts', 'Uri') IS NULL
BEGIN
    ALTER TABLE [BlockedAccounts] ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column';
END

IF COL_LENGTH('BlockedAccounts', 'Cid') IS NULL
BEGIN
    ALTER TABLE [BlockedAccounts] ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column';
END

IF COL_LENGTH('BlockedAccounts', 'Tid') IS NULL
BEGIN
    ALTER TABLE [BlockedAccounts] ADD [Tid] nvarchar(max) NULL;
    PRINT '  Added Tid column';
END

-- ============================================
-- FIX LISTS TABLE
-- ============================================
PRINT 'Fixing Lists table...';

IF COL_LENGTH('Lists', 'Uri') IS NULL
BEGIN
    ALTER TABLE [Lists] ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column';
END

IF COL_LENGTH('Lists', 'Cid') IS NULL
BEGIN
    ALTER TABLE [Lists] ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column';
END

-- ============================================
-- FIX LISTMEMBERS TABLE
-- ============================================
PRINT 'Fixing ListMembers table...';

IF COL_LENGTH('ListMembers', 'Uri') IS NULL
BEGIN
    ALTER TABLE [ListMembers] ADD [Uri] nvarchar(max) NULL;
    PRINT '  Added Uri column';
END

IF COL_LENGTH('ListMembers', 'Cid') IS NULL
BEGIN
    ALTER TABLE [ListMembers] ADD [Cid] nvarchar(max) NULL;
    PRINT '  Added Cid column';
END

-- ============================================
-- FIX MUTEDWORDS TABLE
-- ============================================
PRINT 'Fixing MutedWords table...';

IF COL_LENGTH('MutedWords', 'CreatedAt') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [CreatedAt] datetime2 NOT NULL DEFAULT GETUTCDATE();
    PRINT '  Added CreatedAt column';
END

IF COL_LENGTH('MutedWords', 'MuteBehavior') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [MuteBehavior] nvarchar(20) NOT NULL DEFAULT N'hide';
    PRINT '  Added MuteBehavior column';
END

IF COL_LENGTH('MutedWords', 'Targets') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [Targets] nvarchar(50) NOT NULL DEFAULT N'content';
    PRINT '  Added Targets column';
END

IF COL_LENGTH('MutedWords', 'ExpiresAt') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [ExpiresAt] datetime2 NULL;
    PRINT '  Added ExpiresAt column';
END

IF COL_LENGTH('MutedWords', 'ExcludeFollowing') IS NULL
BEGIN
    ALTER TABLE [MutedWords] ADD [ExcludeFollowing] bit NOT NULL DEFAULT 0;
    PRINT '  Added ExcludeFollowing column';
END

-- ============================================
-- FIX USERSETTINGS TABLE
-- ============================================
PRINT 'Fixing UserSettings table...';

-- Content filters
IF COL_LENGTH('UserSettings', 'SexuallyExplicitFilter') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [SexuallyExplicitFilter] nvarchar(20) NULL;
    PRINT '  Added SexuallyExplicitFilter column';
END

IF COL_LENGTH('UserSettings', 'GraphicMediaFilter') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [GraphicMediaFilter] nvarchar(20) NULL;
    PRINT '  Added GraphicMediaFilter column';
END

IF COL_LENGTH('UserSettings', 'NonSexualNudityFilter') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NonSexualNudityFilter] nvarchar(20) NULL;
    PRINT '  Added NonSexualNudityFilter column';
END

-- Notification settings
IF COL_LENGTH('UserSettings', 'NotifyMentions') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyMentions] bit NULL;
    PRINT '  Added NotifyMentions column';
END

IF COL_LENGTH('UserSettings', 'NotifyQuotes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyQuotes] bit NULL;
    PRINT '  Added NotifyQuotes column';
END

IF COL_LENGTH('UserSettings', 'NotifyReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyReposts] bit NULL;
    PRINT '  Added NotifyReposts column';
END

-- Push notifications
IF COL_LENGTH('UserSettings', 'PushNotifyLikes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyLikes] bit NULL;
    PRINT '  Added PushNotifyLikes column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyFollowers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyFollowers] bit NULL;
    PRINT '  Added PushNotifyFollowers column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyReplies') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyReplies] bit NULL;
    PRINT '  Added PushNotifyReplies column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyMentions') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyMentions] bit NULL;
    PRINT '  Added PushNotifyMentions column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyQuotes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyQuotes] bit NULL;
    PRINT '  Added PushNotifyQuotes column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyReposts] bit NULL;
    PRINT '  Added PushNotifyReposts column';
END

-- In-app notifications
IF COL_LENGTH('UserSettings', 'InAppNotifyLikes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyLikes] bit NULL;
    PRINT '  Added InAppNotifyLikes column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyFollowers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyFollowers] bit NULL;
    PRINT '  Added InAppNotifyFollowers column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyReplies') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyReplies] bit NULL;
    PRINT '  Added InAppNotifyReplies column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyMentions') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyMentions] bit NULL;
    PRINT '  Added InAppNotifyMentions column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyQuotes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyQuotes] bit NULL;
    PRINT '  Added InAppNotifyQuotes column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyReposts] bit NULL;
    PRINT '  Added InAppNotifyReposts column';
END

-- Extended notifications
IF COL_LENGTH('UserSettings', 'NotifyActivity') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyActivity] bit NULL;
    PRINT '  Added NotifyActivity column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyActivity') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyActivity] bit NULL;
    PRINT '  Added PushNotifyActivity column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyActivity') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyActivity] bit NULL;
    PRINT '  Added InAppNotifyActivity column';
END

IF COL_LENGTH('UserSettings', 'NotifyLikesOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyLikesOfReposts] bit NULL;
    PRINT '  Added NotifyLikesOfReposts column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyLikesOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyLikesOfReposts] bit NULL;
    PRINT '  Added PushNotifyLikesOfReposts column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyLikesOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyLikesOfReposts] bit NULL;
    PRINT '  Added InAppNotifyLikesOfReposts column';
END

IF COL_LENGTH('UserSettings', 'NotifyRepostsOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyRepostsOfReposts] bit NULL;
    PRINT '  Added NotifyRepostsOfReposts column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyRepostsOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyRepostsOfReposts] bit NULL;
    PRINT '  Added PushNotifyRepostsOfReposts column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyRepostsOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyRepostsOfReposts] bit NULL;
    PRINT '  Added InAppNotifyRepostsOfReposts column';
END

IF COL_LENGTH('UserSettings', 'NotifyOthers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyOthers] bit NULL;
    PRINT '  Added NotifyOthers column';
END

IF COL_LENGTH('UserSettings', 'PushNotifyOthers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyOthers] bit NULL;
    PRINT '  Added PushNotifyOthers column';
END

IF COL_LENGTH('UserSettings', 'InAppNotifyOthers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyOthers] bit NULL;
    PRINT '  Added InAppNotifyOthers column';
END

-- UI preferences
IF COL_LENGTH('UserSettings', 'EnableTrending') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnableTrending] bit NULL;
    PRINT '  Added EnableTrending column';
END

IF COL_LENGTH('UserSettings', 'EnableDiscoverVideo') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnableDiscoverVideo] bit NULL;
    PRINT '  Added EnableDiscoverVideo column';
END

IF COL_LENGTH('UserSettings', 'EnableTreeView') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnableTreeView] bit NULL;
    PRINT '  Added EnableTreeView column';
END

IF COL_LENGTH('UserSettings', 'RequireLogoutVisibility') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [RequireLogoutVisibility] bit NULL;
    PRINT '  Added RequireLogoutVisibility column';
END

IF COL_LENGTH('UserSettings', 'LargerAltBadge') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [LargerAltBadge] bit NULL;
    PRINT '  Added LargerAltBadge column';
END

IF COL_LENGTH('UserSettings', 'SelectedInterests') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [SelectedInterests] nvarchar(max) NULL;
    PRINT '  Added SelectedInterests column';
END

IF COL_LENGTH('UserSettings', 'ShowReplies') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowReplies] bit NULL;
    PRINT '  Added ShowReplies column';
END

IF COL_LENGTH('UserSettings', 'ShowReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowReposts] bit NULL;
    PRINT '  Added ShowReposts column';
END

IF COL_LENGTH('UserSettings', 'ShowQuotePosts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowQuotePosts] bit NULL;
    PRINT '  Added ShowQuotePosts column';
END

IF COL_LENGTH('UserSettings', 'ShowSampleSavedFeeds') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowSampleSavedFeeds] bit NULL;
    PRINT '  Added ShowSampleSavedFeeds column';
END

IF COL_LENGTH('UserSettings', 'EnabledMediaProviders') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnabledMediaProviders] nvarchar(max) NULL;
    PRINT '  Added EnabledMediaProviders column';
END

-- ============================================
-- CREATE PERFORMANCE INDEXES
-- ============================================
PRINT 'Creating performance indexes...';
PRINT '  Note: Skipping Uri indexes (nvarchar(max) cannot be indexed)';
-- Uri columns are nvarchar(max) which cannot be indexed directly
-- If performance is needed, consider changing to nvarchar(450) or using computed columns

PRINT '';
PRINT '====================================';
PRINT 'Schema fix completed successfully!';
PRINT '====================================';
GO
