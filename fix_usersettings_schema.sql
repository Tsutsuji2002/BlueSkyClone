-- Fix UserSettings table to match the current model
USE BlueSkyClone;
GO

-- Add missing content filter columns
IF COL_LENGTH('UserSettings', 'SexuallyExplicitFilter') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [SexuallyExplicitFilter] nvarchar(20) NULL;
END

IF COL_LENGTH('UserSettings', 'GraphicMediaFilter') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [GraphicMediaFilter] nvarchar(20) NULL;
END

IF COL_LENGTH('UserSettings', 'NonSexualNudityFilter') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NonSexualNudityFilter] nvarchar(20) NULL;
END

-- Add missing notification columns
IF COL_LENGTH('UserSettings', 'NotifyMentions') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyMentions] bit NULL;
END

IF COL_LENGTH('UserSettings', 'NotifyQuotes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyQuotes] bit NULL;
END

IF COL_LENGTH('UserSettings', 'NotifyReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyReposts] bit NULL;
END

-- Add push notification columns
IF COL_LENGTH('UserSettings', 'PushNotifyLikes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyLikes] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyFollowers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyFollowers] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyReplies') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyReplies] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyMentions') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyMentions] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyQuotes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyQuotes] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyReposts] bit NULL;
END

-- Add in-app notification columns
IF COL_LENGTH('UserSettings', 'InAppNotifyLikes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyLikes] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyFollowers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyFollowers] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyReplies') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyReplies] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyMentions') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyMentions] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyQuotes') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyQuotes] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyReposts] bit NULL;
END

-- Add extended notification settings
IF COL_LENGTH('UserSettings', 'NotifyActivity') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyActivity] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyActivity') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyActivity] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyActivity') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyActivity] bit NULL;
END

IF COL_LENGTH('UserSettings', 'NotifyLikesOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyLikesOfReposts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyLikesOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyLikesOfReposts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyLikesOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyLikesOfReposts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'NotifyRepostsOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyRepostsOfReposts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyRepostsOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyRepostsOfReposts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyRepostsOfReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyRepostsOfReposts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'NotifyOthers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [NotifyOthers] bit NULL;
END

IF COL_LENGTH('UserSettings', 'PushNotifyOthers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [PushNotifyOthers] bit NULL;
END

IF COL_LENGTH('UserSettings', 'InAppNotifyOthers') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [InAppNotifyOthers] bit NULL;
END

-- Add UI preference columns
IF COL_LENGTH('UserSettings', 'EnableTrending') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnableTrending] bit NULL;
END

IF COL_LENGTH('UserSettings', 'EnableDiscoverVideo') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnableDiscoverVideo] bit NULL;
END

IF COL_LENGTH('UserSettings', 'EnableTreeView') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnableTreeView] bit NULL;
END

IF COL_LENGTH('UserSettings', 'RequireLogoutVisibility') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [RequireLogoutVisibility] bit NULL;
END

IF COL_LENGTH('UserSettings', 'LargerAltBadge') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [LargerAltBadge] bit NULL;
END

-- Add interests and feed display columns
IF COL_LENGTH('UserSettings', 'SelectedInterests') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [SelectedInterests] nvarchar(max) NULL;
END

IF COL_LENGTH('UserSettings', 'ShowReplies') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowReplies] bit NULL;
END

IF COL_LENGTH('UserSettings', 'ShowReposts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowReposts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'ShowQuotePosts') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowQuotePosts] bit NULL;
END

IF COL_LENGTH('UserSettings', 'ShowSampleSavedFeeds') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [ShowSampleSavedFeeds] bit NULL;
END

IF COL_LENGTH('UserSettings', 'EnabledMediaProviders') IS NULL
BEGIN
    ALTER TABLE [UserSettings] ADD [EnabledMediaProviders] nvarchar(max) NULL;
END

PRINT 'UserSettings schema updated successfully!';
GO
