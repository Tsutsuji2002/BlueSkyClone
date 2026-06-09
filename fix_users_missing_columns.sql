-- Add missing columns to Users table
USE BlueSkyClone;
GO

PRINT 'Adding missing columns to Users table...';

IF COL_LENGTH('Users', 'SigningPublicKey') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [SigningPublicKey] nvarchar(max) NULL;
    PRINT '  Added SigningPublicKey';
END

IF COL_LENGTH('Users', 'EncryptedSigningPrivateKey') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [EncryptedSigningPrivateKey] nvarchar(max) NULL;
    PRINT '  Added EncryptedSigningPrivateKey';
END

IF COL_LENGTH('Users', 'RepoRev') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoRev] nvarchar(20) NULL;
    PRINT '  Added RepoRev';
END

IF COL_LENGTH('Users', 'RepoRoot') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoRoot] nvarchar(100) NULL;
    PRINT '  Added RepoRoot';
END

IF COL_LENGTH('Users', 'RepoCommit') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoCommit] nvarchar(100) NULL;
    PRINT '  Added RepoCommit';
END

IF COL_LENGTH('Users', 'RepoCommitSignature') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [RepoCommitSignature] nvarchar(256) NULL;
    PRINT '  Added RepoCommitSignature';
END

IF COL_LENGTH('Users', 'Role') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [Role] nvarchar(max) NOT NULL DEFAULT N'user';
    PRINT '  Added Role';
END

IF COL_LENGTH('Users', 'Labels') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [Labels] nvarchar(max) NULL;
    PRINT '  Added Labels';
END

IF COL_LENGTH('Users', 'PinnedPostUri') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [PinnedPostUri] nvarchar(max) NULL;
    PRINT '  Added PinnedPostUri';
END

IF COL_LENGTH('Users', 'PdsHost') IS NULL
BEGIN
    ALTER TABLE [Users] ADD [PdsHost] nvarchar(max) NULL;
    PRINT '  Added PdsHost';
END

PRINT 'Users table fix completed!';
GO
