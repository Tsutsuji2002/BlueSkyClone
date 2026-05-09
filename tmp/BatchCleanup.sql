SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

ALTER DATABASE [BlueSkyClone] SET RECOVERY SIMPLE;
GO

PRINT 'Starting batch deletion of old remote posts...';

-- Disable self-referencing integrity checks on Posts (e.g. FK_PostReply)
ALTER TABLE [Posts] NOCHECK CONSTRAINT ALL;
GO

DECLARE @CutoffDate DATETIME = DATEADD(day, -1, GETUTCDATE());
DECLARE @DeletedRows INT = 1;
DECLARE @TotalDeleted INT = 0;

WHILE @DeletedRows > 0
BEGIN
    SELECT TOP (50000) p.Id INTO #BatchIds
    FROM [Posts] p
    INNER JOIN [Users] u ON p.AuthorId = u.Id
    WHERE (CAST(u.PasswordHash AS NVARCHAR(255)) = 'remote') AND p.CreatedAt < @CutoffDate;

    SET @DeletedRows = @@ROWCOUNT;

    IF @DeletedRows = 0 
    BEGIN
        DROP TABLE #BatchIds;
        BREAK;
    END

    -- 1. Wipe out dependencies first
    DELETE pm FROM [PostMedia] pm INNER JOIN #BatchIds b ON pm.PostId = b.Id;
    DELETE lp FROM [LinkPreviews] lp INNER JOIN #BatchIds b ON lp.PostId = b.Id;
    DELETE n FROM [Notifications] n INNER JOIN #BatchIds b ON n.PostId = b.Id;

    -- 2. Wipe the posts
    DELETE p FROM [Posts] p INNER JOIN #BatchIds b ON p.Id = b.Id;

    DROP TABLE #BatchIds;

    SET @TotalDeleted = @TotalDeleted + @DeletedRows;
    PRINT 'Deleted ' + CAST(@TotalDeleted AS VARCHAR) + ' posts so far...';
    
    -- Free up log file space
    CHECKPOINT;
END
GO

PRINT 'Re-enabling constraints...';
ALTER TABLE [Posts] CHECK CONSTRAINT ALL;
GO

PRINT 'Shrinking database files to return space to Linux...';
DBCC SHRINKDATABASE ([BlueSkyClone]);
GO

PRINT 'Cleanup complete! VPS space has been restored.';
