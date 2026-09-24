IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260509210213_InitialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260509210213_InitialCreate', N'9.0.0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260515145922_AddEmailConfirmedToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [BlueskyAccessToken] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260515145922_AddEmailConfirmedToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [BlueskyRefreshToken] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260515145922_AddEmailConfirmedToUser'
)
BEGIN
    ALTER TABLE [Users] ADD [EmailConfirmed] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260515145922_AddEmailConfirmedToUser'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260515145922_AddEmailConfirmedToUser', N'9.0.0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260609184356_SyncModelWithDatabase'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260609184356_SyncModelWithDatabase', N'9.0.0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720080607_AddIsCuratedToLists'
)
BEGIN
    DECLARE @var0 sysname;
    SELECT @var0 = [d].[name]
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[Posts]') AND [c].[name] = N'BookmarksCount');
    IF @var0 IS NOT NULL EXEC(N'ALTER TABLE [Posts] DROP CONSTRAINT [' + @var0 + '];');
    EXEC(N'UPDATE [Posts] SET [BookmarksCount] = 0 WHERE [BookmarksCount] IS NULL');
    ALTER TABLE [Posts] ALTER COLUMN [BookmarksCount] int NOT NULL;
    ALTER TABLE [Posts] ADD DEFAULT 0 FOR [BookmarksCount];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720080607_AddIsCuratedToLists'
)
BEGIN
    ALTER TABLE [Messages] ADD [Type] nvarchar(max) NOT NULL DEFAULT N'';
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720080607_AddIsCuratedToLists'
)
BEGIN
    ALTER TABLE [Conversations] ADD [BlueskyConvoId] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720080607_AddIsCuratedToLists'
)
BEGIN
    ALTER TABLE [Conversations] ADD [GroupName] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720080607_AddIsCuratedToLists'
)
BEGIN
    ALTER TABLE [Conversations] ADD [IsAccepted] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720080607_AddIsCuratedToLists'
)
BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Lists') AND name = 'IsCurated')
                      BEGIN
                          ALTER TABLE Lists ADD IsCurated BIT NOT NULL DEFAULT 0;
                      END
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260720080607_AddIsCuratedToLists'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260720080607_AddIsCuratedToLists', N'9.0.0');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924160506_AddHideFromDiscoverToUserSetting'
)
BEGIN
    ALTER TABLE [UserSettings] ADD [HideFromDiscover] bit NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924160506_AddHideFromDiscoverToUserSetting'
)
BEGIN
    CREATE TABLE [AccessLogs] (
        [Id] uniqueidentifier NOT NULL DEFAULT ((newsequentialid())),
        [UserId] uniqueidentifier NULL,
        [Handle] nvarchar(256) NOT NULL,
        [IpAddress] nvarchar(64) NOT NULL,
        [UserAgent] nvarchar(512) NULL,
        [Action] nvarchar(50) NOT NULL DEFAULT N'login',
        [CreatedAt] datetime2 NOT NULL DEFAULT ((getutcdate())),
        CONSTRAINT [PK_AccessLogs] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AccessLogUser] FOREIGN KEY ([UserId]) REFERENCES [Users] ([Id]) ON DELETE SET NULL
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924160506_AddHideFromDiscoverToUserSetting'
)
BEGIN
    CREATE INDEX [IX_AccessLogs_CreatedAt] ON [AccessLogs] ([CreatedAt]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924160506_AddHideFromDiscoverToUserSetting'
)
BEGIN
    CREATE INDEX [IX_AccessLogs_Handle] ON [AccessLogs] ([Handle]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924160506_AddHideFromDiscoverToUserSetting'
)
BEGIN
    CREATE INDEX [IX_AccessLogs_UserId] ON [AccessLogs] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260924160506_AddHideFromDiscoverToUserSetting'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260924160506_AddHideFromDiscoverToUserSetting', N'9.0.0');
END;

COMMIT;
GO

