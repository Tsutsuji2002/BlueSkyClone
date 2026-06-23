BEGIN TRANSACTION;
ALTER TABLE [Users] ADD [BlueskyAccessToken] nvarchar(max) NULL;

ALTER TABLE [Users] ADD [BlueskyRefreshToken] nvarchar(max) NULL;

ALTER TABLE [Users] ADD [EmailConfirmed] bit NOT NULL DEFAULT CAST(0 AS bit);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20260515145922_AddEmailConfirmedToUser', N'9.0.0');

COMMIT;
GO

