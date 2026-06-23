/*
============================================================
BlueSky Database Setup Script - FINAL COMPREHENSIVE EDITION
Description: Full schema covering all UI features:
             - Hybrid IDs (Sequential GUID + Bluesky TIDs)
             - Unified Interests/Tags system
             - Social: Likes, Reposts, Bookmarks (Saved)
             - Moderation: Block, Mute, Word filtering
             - Comprehensive User Profiles & Settings
============================================================
*/

-- 1. TABLES

-- Users: Core identity and profile
CREATE TABLE Users (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Did NVARCHAR(100) NOT NULL UNIQUE,         -- Decentralized ID (e.g., did:plc:...)
    Username NVARCHAR(256) NOT NULL UNIQUE,
    Handle NVARCHAR(256) NOT NULL UNIQUE,
    Email NVARCHAR(256) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(MAX) NOT NULL,
    Salt NVARCHAR(MAX) NOT NULL,
    
    -- Profile Info
    DisplayName NVARCHAR(256),
    AvatarUrl NVARCHAR(MAX),
    CoverImageUrl NVARCHAR(MAX) NULL,
    Bio NVARCHAR(MAX) NULL,
    Location NVARCHAR(256) NULL,
    Website NVARCHAR(MAX) NULL,
    DateOfBirth DATETIME2 NULL,
    
    -- Stats
    FollowersCount INT DEFAULT 0,
    FollowingCount INT DEFAULT 0,
    PostsCount INT DEFAULT 0,
    
    -- Metadata
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    LastLoginAt DATETIME2 NULL,
    IsOnline BIT DEFAULT 0,
    IsPrivate BIT DEFAULT 0,
    IsDeleted BIT DEFAULT 0
);

-- Interests: Master list of categories/tags
CREATE TABLE Interests (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL, -- e.g. "Technology"
    Slug NVARCHAR(100) NOT NULL UNIQUE, -- e.g. "technology" (used in code/URL)
    Icon NVARCHAR(50) NULL, -- icon name or emoji
    IsDeleted BIT DEFAULT 0
);

-- UserInterests: Mapping users to their selected interests
CREATE TABLE UserInterests (
    UserId UNIQUEIDENTIFIER,
    InterestId INT,
    PRIMARY KEY (UserId, InterestId),
    CONSTRAINT FK_UI_User FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_UI_Interest FOREIGN KEY (InterestId) REFERENCES Interests(Id) ON DELETE CASCADE
);

-- UserFollows: Social graph
CREATE TABLE UserFollows (
    FollowerId UNIQUEIDENTIFIER,
    FollowingId UNIQUEIDENTIFIER,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (FollowerId, FollowingId),
    CONSTRAINT FK_Follower FOREIGN KEY (FollowerId) REFERENCES Users(Id),
    CONSTRAINT FK_Following FOREIGN KEY (FollowingId) REFERENCES Users(Id)
);

-- Posts: Main content engine
CREATE TABLE Posts (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Tid NVARCHAR(20) NOT NULL UNIQUE,          -- Bluesky Timestamp ID
    AuthorId UNIQUEIDENTIFIER NOT NULL,
    Content NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    
    -- Threading logic
    ReplyToPostId UNIQUEIDENTIFIER NULL,      -- Immediate parent
    RootPostId UNIQUEIDENTIFIER NULL,         -- Top of the thread (for fast fetching)
    
    -- Performance counters
    LikesCount INT DEFAULT 0,
    RepostsCount INT DEFAULT 0,
    RepliesCount INT DEFAULT 0,
    QuotesCount INT DEFAULT 0,
    
    -- Interaction control
    ReplyRestriction NVARCHAR(20) DEFAULT 'anyone', -- 'anyone', 'none', 'followers', 'following', 'mentioned', 'list'
    AllowQuotes BIT DEFAULT 1,
    
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_PostAuthor FOREIGN KEY (AuthorId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PostReply  FOREIGN KEY (ReplyToPostId) REFERENCES Posts(Id),
    CONSTRAINT FK_PostRoot   FOREIGN KEY (RootPostId) REFERENCES Posts(Id)
);

-- PostReplyAllowedLists: Mapping posts to specific lists allowed to reply
CREATE TABLE PostReplyAllowedLists (
    PostId UNIQUEIDENTIFIER,
    ListId UNIQUEIDENTIFIER,
    PRIMARY KEY (PostId, ListId),
    CONSTRAINT FK_PRAL_Post FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
    -- ListId FK will be added after Lists table
);

-- PostInterests: Linking posts to interests/tags
CREATE TABLE PostInterests (
    PostId UNIQUEIDENTIFIER,
    InterestId INT,
    PRIMARY KEY (PostId, InterestId),
    CONSTRAINT FK_PI_Post FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE,
    CONSTRAINT FK_PI_Interest FOREIGN KEY (InterestId) REFERENCES Interests(Id) ON DELETE CASCADE
);

-- PostMedia: Images and videos
CREATE TABLE PostMedia (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    PostId UNIQUEIDENTIFIER NOT NULL,
    Type NVARCHAR(50), -- 'image', 'video'
    Url NVARCHAR(MAX) NOT NULL,
    AltText NVARCHAR(MAX) NULL,
    Position INT DEFAULT 0,
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_MediaPost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
);

-- Likes Table
CREATE TABLE Likes (
    UserId UNIQUEIDENTIFIER,
    PostId UNIQUEIDENTIFIER,
    Tid NVARCHAR(20) NOT NULL UNIQUE,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (UserId, PostId),
    CONSTRAINT FK_LikeUser FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_LikePost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
);

-- Reposts Table
CREATE TABLE Reposts (
    UserId UNIQUEIDENTIFIER,
    PostId UNIQUEIDENTIFIER,
    Tid NVARCHAR(20) NOT NULL UNIQUE,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (UserId, PostId),
    CONSTRAINT FK_RepostUser FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_RepostPost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
);

-- Bookmarks (Saved Posts)
CREATE TABLE Bookmarks (
    UserId UNIQUEIDENTIFIER,
    PostId UNIQUEIDENTIFIER,
    Tid NVARCHAR(20) NOT NULL UNIQUE,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (UserId, PostId),
    CONSTRAINT FK_BookmarkUser FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_BookmarkPost FOREIGN KEY (PostId) REFERENCES Posts(Id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE Notifications (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Tid NVARCHAR(20) NOT NULL UNIQUE,
    Type NVARCHAR(50), -- 'like', 'repost', 'follow', 'mention', 'reply'
    RecipientId UNIQUEIDENTIFIER NOT NULL,
    SenderId UNIQUEIDENTIFIER NOT NULL,
    PostId UNIQUEIDENTIFIER NULL,
    IsRead BIT DEFAULT 0,
    IsDeleted BIT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    CONSTRAINT FK_NotifRecipient FOREIGN KEY (RecipientId) REFERENCES Users(Id),
    CONSTRAINT FK_NotifSender FOREIGN KEY (SenderId) REFERENCES Users(Id)
);

-- Feeds: Custom/Algorithmic feeds
CREATE TABLE Feeds (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Tid NVARCHAR(20) NOT NULL UNIQUE,
    Name NVARCHAR(256) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Handle NVARCHAR(256) NOT NULL,
    AvatarUrl NVARCHAR(MAX) NULL,
    CreatorId UNIQUEIDENTIFIER NULL, -- NULL for system feeds
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    SubscribersCount INT DEFAULT 0,
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_FeedCreator FOREIGN KEY (CreatorId) REFERENCES Users(Id)
);

-- UserFeedSubscriptions: Subscriptions and pinning
CREATE TABLE UserFeedSubscriptions (
    UserId UNIQUEIDENTIFIER,
    FeedId UNIQUEIDENTIFIER,
    IsPinned BIT DEFAULT 0,
    PinnedOrder INT DEFAULT 0,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (UserId, FeedId),
    CONSTRAINT FK_SubsUser FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SubsFeed FOREIGN KEY (FeedId) REFERENCES Feeds(Id) ON DELETE CASCADE
);

-- UserSettings: Preferences and Accessibility
CREATE TABLE UserSettings (
    UserId UNIQUEIDENTIFIER PRIMARY KEY,
    
    -- Content Control
    AdultContentFilter NVARCHAR(20) DEFAULT 'hide', -- 'show', 'warn', 'hide'
    EnableAdultContent BIT DEFAULT 0,
    SortReplies NVARCHAR(50) DEFAULT 'top',
    
    -- Accessibility
    RequireAltText BIT DEFAULT 0,
    AutoplayVideoGif BIT DEFAULT 1,
    
    -- Branding/UI
    AppLanguage NVARCHAR(10) DEFAULT 'en',
    ThemeMode NVARCHAR(20) DEFAULT 'system', -- 'light', 'dark', 'system'
    
    -- Notification Toggles
    NotifyLikes BIT DEFAULT 1,
    NotifyFollowers BIT DEFAULT 1,
    NotifyReplies BIT DEFAULT 1,
    
    -- Interaction Defaults (from image)
    DefaultReplyRestriction NVARCHAR(20) DEFAULT 'anyone',
    DefaultAllowQuotes BIT DEFAULT 1,
    
    -- UI Preferences
    FontSize INT DEFAULT 15,
    
    CONSTRAINT FK_SettingsUser FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Moderation: Mute and Block
CREATE TABLE MutedAccounts (
    UserId UNIQUEIDENTIFIER,
    MutedUserId UNIQUEIDENTIFIER,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (UserId, MutedUserId),
    CONSTRAINT FK_MutedOwner FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_MutedUser FOREIGN KEY (MutedUserId) REFERENCES Users(Id)
);

CREATE TABLE BlockedAccounts (
    UserId UNIQUEIDENTIFIER,
    BlockedUserId UNIQUEIDENTIFIER,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (UserId, BlockedUserId),
    CONSTRAINT FK_BlockedOwner FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_BlockedUser FOREIGN KEY (BlockedUserId) REFERENCES Users(Id)
);

CREATE TABLE MutedWords (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserId UNIQUEIDENTIFIER NOT NULL,
    Word NVARCHAR(256) NOT NULL,
    CONSTRAINT FK_MutedWordUser FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- Messages & Conversations
CREATE TABLE Conversations (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    LastMessageId UNIQUEIDENTIFIER NULL,
    IsDeleted BIT DEFAULT 0
);

CREATE TABLE ConversationParticipants (
    ConversationId UNIQUEIDENTIFIER,
    UserId UNIQUEIDENTIFIER,
    JoinedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (ConversationId, UserId),
    CONSTRAINT FK_CP_Conv FOREIGN KEY (ConversationId) REFERENCES Conversations(Id),
    CONSTRAINT FK_CP_User FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE TABLE Messages (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    Tid NVARCHAR(20) NOT NULL UNIQUE,
    ConversationId UNIQUEIDENTIFIER NOT NULL,
    SenderId UNIQUEIDENTIFIER NOT NULL,
    Content NVARCHAR(MAX),
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    IsRead BIT DEFAULT 0,
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_MsgConv FOREIGN KEY (ConversationId) REFERENCES Conversations(Id),
    CONSTRAINT FK_MsgSender FOREIGN KEY (SenderId) REFERENCES Users(Id)
);

-- Lists: User-created collections of accounts
CREATE TABLE Lists (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    OwnerId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(256) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Purpose NVARCHAR(50) DEFAULT 'social', -- 'social', 'curation', 'moderation'
    AvatarUrl NVARCHAR(MAX) NULL,
    CreatedAt DATETIME2 DEFAULT GETUTCDATE(),
    IsDeleted BIT DEFAULT 0,
    CONSTRAINT FK_ListOwner FOREIGN KEY (OwnerId) REFERENCES Users(Id) ON DELETE CASCADE
);

-- ListMembers: Accounts explicitly added to a list
CREATE TABLE ListMembers (
    ListId UNIQUEIDENTIFIER,
    UserId UNIQUEIDENTIFIER,
    JoinedAt DATETIME2 DEFAULT GETUTCDATE(),
    PRIMARY KEY (ListId, UserId),
    CONSTRAINT FK_LM_List FOREIGN KEY (ListId) REFERENCES Lists(Id) ON DELETE CASCADE,
    CONSTRAINT FK_LM_User FOREIGN KEY (UserId) REFERENCES Users(Id)
);

-- Add missing FK constraint to PostReplyAllowedLists
ALTER TABLE PostReplyAllowedLists 
ADD CONSTRAINT FK_PRAL_List FOREIGN KEY (ListId) REFERENCES Lists(Id) ON DELETE NO ACTION;

-- 2. INDEXES
CREATE INDEX IX_Posts_Tid ON Posts(Tid);
CREATE INDEX IX_Posts_RootPostId ON Posts(RootPostId);
CREATE INDEX IX_Users_Did ON Users(Did);
CREATE INDEX IX_Notifications_RecipientId ON Notifications(RecipientId);

-- 3. INTEREStS SEED DATA (Unifying BE and FE)
INSERT INTO Interests (Name, Slug, Icon) VALUES 
('Art', 'art', '🎨'),
('Books', 'books', '📚'),
('Developers', 'developers', '💻'),
('Technology', 'technology', '🚀'),
('Travel', 'travel', '✈️'),
('Fashion', 'fashion', '👗'),
('Environment', 'environment', '🌿'),
('Health', 'health', '🏥'),
('Fitness', 'fitness', '🏃');

-- 4. BASIC SAMPLE DATA
DECLARE @AdminId UNIQUEIDENTIFIER = NEWID();
INSERT INTO Users (Id, Did, Username, DisplayName, Handle, Email, PasswordHash, Salt, Bio)
VALUES (@AdminId, 'did:plc:admin', 'admin', 'System Admin', 'admin.bsky.social', 'admin@example.com', 'h', 's', 'The architect.');

INSERT INTO Feeds (Id, Tid, Name, Description, Handle)
VALUES (NEWID(), '3k7r4o5v2z001', 'Discover', 'Trending content.', 'discover.bsky.social');

INSERT INTO Feeds (Id, Tid, Name, Description, Handle)
VALUES (NEWID(), '3k7r4o5v2z002', 'Following', 'Posts from accounts you follow.', 'following.bsky.social');
