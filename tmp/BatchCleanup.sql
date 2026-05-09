SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

ALTER DATABASE [BlueSkyClone] SET RECOVERY SIMPLE;
GO

PRINT 'Creating temporary performance index...';
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Users_PasswordHash')
BEGIN
    CREATE NONCLUSTERED INDEX IX_Users_PasswordHash ON [Users](PasswordHash);
END
GO

PRINT 'Starting batch deletion of old remote posts...';
DECLARE @CutoffDate DATETIME = DATEADD(day, -1, GETUTCDATE());
DECLARE @DeletedRows INT = 1;
DECLARE @TotalDeleted INT = 0;

WHILE @DeletedRows > 0
BEGIN
    DELETE TOP (50000) p
    FROM [Posts] p
    INNER JOIN [Users] u ON p.AuthorId = u.Id
    WHERE u.PasswordHash = 'remote' AND p.CreatedAt < @CutoffDate;

    SET @DeletedRows = @@ROWCOUNT;
    SET @TotalDeleted = @TotalDeleted + @DeletedRows;

    PRINT 'Deleted ' + CAST(@TotalDeleted AS VARCHAR) + ' posts so far...';
    CHECKPOINT;
END
GO

PRINT 'Dropping temporary performance index...';
DROP INDEX IX_Users_PasswordHash ON [Users];
GO

PRINT 'Starting dependent table cleanup...';

PRINT 'Deleting orphaned media...';
DELETE pm
FROM [PostMedia] pm
LEFT JOIN [Posts] p ON pm.PostId = p.Id
WHERE p.Id IS NULL;
GO

PRINT 'Deleting orphaned link previews...';
DELETE lp
FROM [LinkPreviews] lp
LEFT JOIN [Posts] p ON lp.PostId = p.Id
WHERE lp.PostId IS NOT NULL AND p.Id IS NULL;
GO

PRINT 'Deleting orphaned notifications...';
DELETE n
FROM [Notifications] n
LEFT JOIN [Posts] p ON n.PostId = p.Id
WHERE n.PostId IS NOT NULL AND p.Id IS NULL;
GO

PRINT 'Shrinking database files to return space to Linux...';
DBCC SHRINKDATABASE ([BlueSkyClone]);
GO

PRINT 'Cleanup complete! VPS space has been restored.';
