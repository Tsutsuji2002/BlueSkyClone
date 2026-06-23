SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

RAISERROR ('=== BlueSkyClone Batch Cleanup Starting ===', 0, 1) WITH NOWAIT;

-- Safety: drop temp tables from any previous failed run in this session
IF OBJECT_ID('tempdb..#RemoteUsers') IS NOT NULL DROP TABLE #RemoteUsers;
IF OBJECT_ID('tempdb..#BatchIds') IS NOT NULL DROP TABLE #BatchIds;

RAISERROR ('STEP 1: Caching remote user IDs...', 0, 1) WITH NOWAIT;

CREATE TABLE #RemoteUsers (Id UNIQUEIDENTIFIER PRIMARY KEY);
INSERT INTO #RemoteUsers (Id)
    SELECT Id FROM [Users] WHERE CAST(PasswordHash AS NVARCHAR(255)) = 'remote';

DECLARE @RemoteUserCount INT = @@ROWCOUNT;
RAISERROR ('Found %d remote stub users. Starting batch deletion...', 0, 1, @RemoteUserCount) WITH NOWAIT;

DECLARE @CutoffDate DATETIME = DATEADD(day, -1, GETUTCDATE());
DECLARE @DeletedRows INT = 1;
DECLARE @TotalDeleted INT = 0;

WHILE @DeletedRows > 0
BEGIN
    IF OBJECT_ID('tempdb..#BatchIds') IS NOT NULL DROP TABLE #BatchIds;

    BEGIN TRY
        SELECT TOP (50000) p.Id INTO #BatchIds
        FROM [Posts] p
        WHERE p.AuthorId IN (SELECT Id FROM #RemoteUsers)
          AND p.CreatedAt < @CutoffDate;

        SET @DeletedRows = @@ROWCOUNT;
        IF @DeletedRows = 0 BREAK;

        DELETE pm FROM [PostMedia]   pm INNER JOIN #BatchIds b ON pm.PostId = b.Id;
        DELETE lp FROM [LinkPreviews] lp INNER JOIN #BatchIds b ON lp.PostId = b.Id;
        DELETE n  FROM [Notifications] n INNER JOIN #BatchIds b ON n.PostId  = b.Id;
        DELETE l  FROM [Likes]    l  INNER JOIN #BatchIds b ON l.PostId  = b.Id;
        DELETE r  FROM [Reposts]  r  INNER JOIN #BatchIds b ON r.PostId  = b.Id;
        DELETE bm FROM [Bookmarks] bm INNER JOIN #BatchIds b ON bm.PostId = b.Id;

        UPDATE p SET ReplyToPostId = NULL, QuotePostId = NULL, RootPostId = NULL
        FROM [Posts] p INNER JOIN #BatchIds b ON p.Id = b.Id;

        DELETE p FROM [Posts] p INNER JOIN #BatchIds b ON p.Id = b.Id;
        DROP TABLE #BatchIds;

        SET @TotalDeleted = @TotalDeleted + @DeletedRows;
        RAISERROR ('Deleted %d posts so far...', 0, 1, @TotalDeleted) WITH NOWAIT;
    END TRY
    BEGIN CATCH
        IF OBJECT_ID('tempdb..#BatchIds') IS NOT NULL DROP TABLE #BatchIds;
        IF ERROR_NUMBER() = 1205
        BEGIN
            RAISERROR ('Deadlock! Retrying in 3 sec...', 0, 1) WITH NOWAIT;
            WAITFOR DELAY '00:00:03';
        END
        ELSE THROW;
    END CATCH
END

IF OBJECT_ID('tempdb..#RemoteUsers') IS NOT NULL DROP TABLE #RemoteUsers;

RAISERROR ('STEP 2: Shrinking database files...', 0, 1) WITH NOWAIT;
DBCC SHRINKDATABASE ([BlueSkyClone]);

RAISERROR ('=== DONE! VPS space reclaimed. ===', 0, 1) WITH NOWAIT;
