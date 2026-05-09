SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;

-- 1. Switch to SIMPLE recovery mode to prevent log file bloat
ALTER DATABASE [BlueSkyClone] SET RECOVERY SIMPLE;
GO

-- 2. Delete old remote posts from 'stub' users (older than 1 days)
PRINT 'Deleting old remote posts...';
DECLARE @CutoffDate DATETIME = DATEADD(day, -1, GETUTCDATE());

-- Identify stub users (remote users created by FirehoseService)
-- Based on the C# code, they have PasswordHash = 'remote'
WITH StubUserIds AS (
    SELECT Id FROM [Users] WHERE PasswordHash = 'remote'
)
DELETE p
FROM [Posts] p
INNER JOIN StubUserIds s ON p.AuthorId = s.Id
WHERE p.CreatedAt < @CutoffDate;
GO

-- 3. Delete orphaned PostMedia
PRINT 'Deleting orphaned media...';
DELETE pm
FROM [PostMedia] pm
LEFT JOIN [Posts] p ON pm.PostId = p.Id
WHERE p.Id IS NULL;
GO

-- 4. Delete orphaned LinkPreviews
PRINT 'Deleting orphaned link previews...';
DELETE lp
FROM [LinkPreviews] lp
LEFT JOIN [Posts] p ON lp.PostId = p.Id
WHERE lp.PostId IS NOT NULL AND p.Id IS NULL;
GO

-- 5. Delete orphaned Notifications
PRINT 'Deleting orphaned notifications...';
DELETE n
FROM [Notifications] n
LEFT JOIN [Posts] p ON n.PostId = p.Id
WHERE n.PostId IS NOT NULL AND p.Id IS NULL;
GO

-- 6. Shrink the database to reclaim space on OS level
PRINT 'Shrinking database files...';
DBCC SHRINKDATABASE ([BlueSkyClone]);
GO

PRINT 'Cleanup complete.';
