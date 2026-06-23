BEGIN TRANSACTION;

-- Add IsAccepted and GroupName to Conversations table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Conversations]') AND name = 'IsAccepted')
BEGIN
    ALTER TABLE [Conversations] ADD [IsAccepted] bit NOT NULL DEFAULT CAST(1 AS bit);
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Conversations]') AND name = 'GroupName')
BEGIN
    ALTER TABLE [Conversations] ADD [GroupName] nvarchar(max) NULL;
END

-- Update existing conversations to be accepted by default
UPDATE [Conversations] SET [IsAccepted] = 1 WHERE IsAccepted = 0;

COMMIT;
GO
