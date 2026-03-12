using Microsoft.Data.SqlClient;
using System;

class GlobalSchemaRepair {
    static void Main() {
        string connStr = "Server=LAPTOP-S340\\SQLEXPRESS;Database=BlueSkyClone;Trusted_Connection=True;TrustServerCertificate=True;";
        using var conn = new SqlConnection(connStr);
        conn.Open();
        Console.WriteLine("Repairing Schema...");

        string[] sqlCommands = new string[] {
            // 1. Posts table
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'QuotePostId') ALTER TABLE dbo.Posts ADD QuotePostId UNIQUEIDENTIFIER NULL;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'QuotesCount') ALTER TABLE dbo.Posts ADD QuotesCount INT NULL DEFAULT 0;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'ReplyRestriction') ALTER TABLE dbo.Posts ADD ReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'AllowQuotes') ALTER TABLE dbo.Posts ADD AllowQuotes BIT NULL DEFAULT 1;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'Language') ALTER TABLE dbo.Posts ADD Language NVARCHAR(MAX) NULL;",

            // 2. UserSettings table
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowReplies') ALTER TABLE dbo.UserSettings ADD ShowReplies BIT NULL DEFAULT 1;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowReposts') ALTER TABLE dbo.UserSettings ADD ShowReposts BIT NULL DEFAULT 1;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowQuotePosts') ALTER TABLE dbo.UserSettings ADD ShowQuotePosts BIT NULL DEFAULT 1;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'ShowSampleSavedFeeds') ALTER TABLE dbo.UserSettings ADD ShowSampleSavedFeeds BIT NULL DEFAULT 0;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'DefaultReplyRestriction') ALTER TABLE dbo.UserSettings ADD DefaultReplyRestriction NVARCHAR(20) NULL DEFAULT 'anyone';",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'DefaultAllowQuotes') ALTER TABLE dbo.UserSettings ADD DefaultAllowQuotes BIT NULL DEFAULT 1;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnableTrending') ALTER TABLE dbo.UserSettings ADD EnableTrending BIT NULL DEFAULT 1;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnableDiscoverVideo') ALTER TABLE dbo.UserSettings ADD EnableDiscoverVideo BIT NULL DEFAULT 1;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.UserSettings') AND name = 'EnabledMediaProviders') ALTER TABLE dbo.UserSettings ADD EnabledMediaProviders NVARCHAR(MAX) NULL;",

            // 3. Notifications table
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'Title') ALTER TABLE dbo.Notifications ADD Title NVARCHAR(MAX) NULL;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'Content') ALTER TABLE dbo.Notifications ADD Content NVARCHAR(MAX) NULL;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Notifications') AND name = 'ListId') ALTER TABLE dbo.Notifications ADD ListId UNIQUEIDENTIFIER NULL;",

            // 4. Users table
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IsBanned') ALTER TABLE dbo.Users ADD IsBanned BIT NOT NULL DEFAULT 0;",
            "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Users') AND name = 'IsVerified') ALTER TABLE dbo.Users ADD IsVerified BIT NOT NULL DEFAULT 0;",

            // Foreign Key for QuotePostId
            "IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_PostQuote') AND EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Posts') AND name = 'QuotePostId') ALTER TABLE dbo.Posts ADD CONSTRAINT FK_PostQuote FOREIGN KEY (QuotePostId) REFERENCES dbo.Posts(Id);"
        };

        foreach (var sql in sqlCommands) {
            try {
                using var cmd = new SqlCommand(sql, conn);
                cmd.ExecuteNonQuery();
                Console.WriteLine("Success: " + sql.Substring(0, Math.Min(sql.Length, 50)) + "...");
            } catch (Exception ex) {
                Console.WriteLine("Error executing: " + sql);
                Console.WriteLine("Exception: " + ex.Message);
            }
        }
        Console.WriteLine("Schema repair finished.");
    }
}
