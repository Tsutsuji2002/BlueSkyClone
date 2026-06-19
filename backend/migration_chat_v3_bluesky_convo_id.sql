-- Migration: Add BlueskyConvoId to Conversations table for storing custom group names
BEGIN TRANSACTION;

-- Add BlueskyConvoId column to store the Bluesky conversation ID
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Conversations]') AND name = 'BlueskyConvoId')
BEGIN
    ALTER TABLE [Conversations] ADD [BlueskyConvoId] nvarchar(100) NULL;
END
GO

-- Create index for faster lookups by BlueskyConvoId
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Conversations_BlueskyConvoId' AND object_id = OBJECT_ID(N'[Conversations]'))
BEGIN
    CREATE INDEX IX_Conversations_BlueskyConvoId ON [Conversations]([BlueskyConvoId]);
END
GO

COMMIT;
