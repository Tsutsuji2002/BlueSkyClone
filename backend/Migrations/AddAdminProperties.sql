-- Add admin properties to Users and Feeds tables
-- Run this SQL script directly on your database

-- Add IsBanned column to Users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'IsBanned')
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD [IsBanned] bit NOT NULL DEFAULT 0;
END

-- Add IsVerified column to Users table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'IsVerified')
BEGIN
    ALTER TABLE [dbo].[Users]
    ADD [IsVerified] bit NOT NULL DEFAULT 0;
END

-- Add IsOfficial column to Feeds table
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Feeds]') AND name = 'IsOfficial')
BEGIN
    ALTER TABLE [dbo].[Feeds]
    ADD [IsOfficial] bit NOT NULL DEFAULT 0;
END

PRINT 'Admin properties added successfully!';
