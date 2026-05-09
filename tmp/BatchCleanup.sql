SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;



RAISERROR ('Starting batch deletion of old remote posts...', 0, 1) WITH NOWAIT;

-- We bypass Schema Modification locks to avoid blocking on background SQL processes!

RAISERROR ('Caching remote users in memory for instant lookups...', 0, 1) WITH NOWAIT;
CREATE TABLE #RemoteUsers (Id UNIQUEIDENTIFIER PRIMARY KEY);
INSERT INTO #RemoteUsers (Id)
SELECT Id FROM [Users] WHERE CAST(PasswordHash AS NVARCHAR(255)) = 'remote';

DECLARE @RemoteUserCount INT = @@ROWCOUNT;
RAISERROR ('Found %d remote users.', 0, 1, @RemoteUserCount) WITH NOWAIT;
RAISERROR ('Starting batch deletion of old remote posts via indexed scan...', 0, 1) WITH NOWAIT;

DECLARE @CutoffDate DATETIME = DATEADD(day, -1, GETUTCDATE());
DECLARE @DeletedRows INT = 1;
DECLARE @TotalDeleted INT = 0;

WHILE @DeletedRows > 0
BEGIN
    BEGIN TRY
        SELECT TOP (50000) p.Id INTO #BatchIds
    FROM [Posts] p
    WHERE EXISTS (SELECT 1 FROM #RemoteUsers u WHERE u.Id = p.AuthorId) 
      AND p.CreatedAt < @CutoffDate;

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
    
    -- Wipe out interaction dependencies (Likes, Reposts, Bookmarks)
    DELETE l FROM [Likes] l INNER JOIN #BatchIds b ON l.PostId = b.Id;
    DELETE r FROM [Reposts] r INNER JOIN #BatchIds b ON r.PostId = b.Id;
    DELETE bm FROM [Bookmarks] bm INNER JOIN #BatchIds b ON bm.PostId = b.Id;

    -- 2. Nullify self-references to satisfy FK constraints without needing Schema Locks
    UPDATE p SET ReplyToPostId = NULL, QuotePostId = NULL, RootPostId = NULL
    FROM [Posts] p INNER JOIN #BatchIds b ON p.Id = b.Id;

    -- 2. Wipe the posts
    DELETE p FROM [Posts] p INNER JOIN #BatchIds b ON p.Id = b.Id;

    DROP TABLE #BatchIds;

        SET @TotalDeleted = @TotalDeleted + @DeletedRows;
        RAISERROR ('Deleted %d posts so far...', 0, 1, @TotalDeleted) WITH NOWAIT;
        
        -- Free up log file space
        CHECKPOINT;
    END TRY
    BEGIN CATCH
        -- Check if error is a deadlock (Error 1205)
        IF ERROR_NUMBER() = 1205
        BEGIN
            RAISERROR ('Deadlock detected! Waiting 2 seconds and retrying...', 0, 1) WITH NOWAIT;
            
            -- Clean up the temporary table if it was created before the deadlock
            IF OBJECT_ID('tempdb..#BatchIds') IS NOT NULL DROP TABLE #BatchIds;
            
            WAITFOR DELAY '00:00:02';
            -- We don't break, the loop just continues automatically!
        END
        ELSE
        BEGIN
            -- If it's not a deadlock, it's a real syntax error, so throw it
            THROW;
        END
    END CATCH
END
GO

-- No constraints to re-enable since we never altered the schema!

RAISERROR ('Shrinking database files to return space to Linux...', 0, 1) WITH NOWAIT;
DBCC SHRINKDATABASE ([BlueSkyClone]);
GO

RAISERROR ('Cleanup complete! VPS space has been restored.', 0, 1) WITH NOWAIT;
