-- Migration: Add SelectedInterests to UserSettings
-- Description: Adds a column to store user-selected interests as a JSON array string.

IF NOT EXISTS (SELECT * FROM sys.columns 
               WHERE object_id = OBJECT_ID(N'[UserSettings]') 
               AND name = 'SelectedInterests')
BEGIN
    ALTER TABLE [UserSettings] ADD [SelectedInterests] NVARCHAR(MAX) NULL;
END
GO

-- If there's a migration history table, we should update it too.
-- Based on migration.sql, the next migration ID could be something like:
-- N'20260221235000_AddSelectedInterests'

IF EXISTS (SELECT * FROM sys.tables WHERE name = '__EFMigrationsHistory')
BEGIN
    IF NOT EXISTS (SELECT * FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260221235000_AddSelectedInterests')
    BEGIN
        INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
        VALUES (N'20260221235000_AddSelectedInterests', N'9.0.0');
    END
END
GO
