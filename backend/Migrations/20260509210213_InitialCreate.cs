using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BSkyClone.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Conversations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    LastMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Conversa__3214EC0776FD5532", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Hashtags",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PostsCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Hashtags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Interests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Interest__3214EC071202F311", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Labels",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Src = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Uri = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Val = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Neg = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Labels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PageContents",
                columns: table => new
                {
                    Slug = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    HtmlContent = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PageContents", x => x.Slug);
                });

            migrationBuilder.CreateTable(
                name: "RepoBlocks",
                columns: table => new
                {
                    Cid = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Data = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    Did = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RepoBlocks", x => x.Cid);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Did = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SigningPublicKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EncryptedSigningPrivateKey = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RepoRev = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    RepoRoot = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RepoCommit = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RepoCommitSignature = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Username = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Handle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Salt = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Labels = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CoverImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Bio = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Location = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Website = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DateOfBirth = table.Column<DateTime>(type: "datetime2", nullable: true),
                    FollowersCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    FollowingCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    PostsCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    LastLoginAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsOnline = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    IsPrivate = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    PinnedPostUri = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsBanned = table.Column<bool>(type: "bit", nullable: false),
                    IsVerified = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Users__3214EC07B91FF525", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BlockedAccounts",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BlockedUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    Tid = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Cid = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Uri = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__BlockedA__0A8170EB918D5838", x => new { x.UserId, x.BlockedUserId });
                    table.ForeignKey(
                        name: "FK_BlockedOwner",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_BlockedUser",
                        column: x => x.BlockedUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "ConversationParticipants",
                columns: table => new
                {
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Conversa__112854B3CF95C0F9", x => new { x.ConversationId, x.UserId });
                    table.ForeignKey(
                        name: "FK_CP_Conv",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_CP_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Feeds",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Handle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatorId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    SubscribersCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    IsOfficial = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Feeds__3214EC0733EF47B5", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FeedCreator",
                        column: x => x.CreatorId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Lists",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    OwnerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Purpose = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "social"),
                    AvatarUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    Uri = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Cid = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCurated = table.Column<bool>(type: "bit", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Lists__3214EC07397CB41F", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListOwner",
                        column: x => x.OwnerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Messages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ConversationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImageUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    IsRead = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    IsModified = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsRecalled = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    ReplyToId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Messages__3214EC0740CF255F", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Messages_Messages_ReplyToId",
                        column: x => x.ReplyToId,
                        principalTable: "Messages",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MsgConv",
                        column: x => x.ConversationId,
                        principalTable: "Conversations",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MsgSender",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MutedAccounts",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MutedUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__MutedAcc__2416C501D72C1110", x => new { x.UserId, x.MutedUserId });
                    table.ForeignKey(
                        name: "FK_MutedOwner",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_MutedUser",
                        column: x => x.MutedUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MutedWords",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Word = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    MuteBehavior = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "hide"),
                    Targets = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false, defaultValue: "content"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ExcludeFollowing = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__MutedWor__3214EC076609311A", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MutedWordUser",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Posts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Uri = table.Column<string>(type: "nvarchar(450)", nullable: true),
                    FacetsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    AuthorId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    ReplyToPostId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RootPostId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    QuotePostId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LikesCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    RepostsCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    RepliesCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    QuotesCount = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    BookmarksCount = table.Column<int>(type: "int", nullable: true),
                    ReplyRestriction = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "anyone"),
                    AllowQuotes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    Language = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    Labels = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Posts__3214EC07CB992B89", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PostAuthor",
                        column: x => x.AuthorId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PostQuote",
                        column: x => x.QuotePostId,
                        principalTable: "Posts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PostReply",
                        column: x => x.ReplyToPostId,
                        principalTable: "Posts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PostRoot",
                        column: x => x.RootPostId,
                        principalTable: "Posts",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Reports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    SubjectType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SubjectUri = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    SubjectCid = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ReasonType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ReasonText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ReporterId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "open")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Reports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Reports_Users_ReporterId",
                        column: x => x.ReporterId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "SupportRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    DeviceType = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "pending"),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SupportRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SupportRequests_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "UserFollows",
                columns: table => new
                {
                    FollowerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FollowingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Uri = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__UserFoll__79CB0335AE8EF105", x => new { x.FollowerId, x.FollowingId });
                    table.ForeignKey(
                        name: "FK_Follower",
                        column: x => x.FollowerId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Following",
                        column: x => x.FollowingId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserInterests",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InterestId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__UserInte__7580FE8A5B5B0B2A", x => new { x.UserId, x.InterestId });
                    table.ForeignKey(
                        name: "FK_UI_Interest",
                        column: x => x.InterestId,
                        principalTable: "Interests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UI_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserSettings",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdultContentFilter = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "hide"),
                    EnableAdultContent = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    SexuallyExplicitFilter = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GraphicMediaFilter = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NonSexualNudityFilter = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SortReplies = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true, defaultValue: "top"),
                    RequireAltText = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    AutoplayVideoGif = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    AppLanguage = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true, defaultValue: "en"),
                    ThemeMode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "system"),
                    NotifyLikes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyFollowers = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyReplies = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyMentions = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyQuotes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyLikes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyFollowers = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyReplies = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyMentions = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyQuotes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyLikes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyFollowers = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyReplies = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyMentions = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyQuotes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyActivity = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyActivity = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyActivity = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyLikesOfReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyLikesOfReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyLikesOfReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyRepostsOfReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyRepostsOfReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyRepostsOfReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    NotifyOthers = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    PushNotifyOthers = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    InAppNotifyOthers = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    DefaultReplyRestriction = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true, defaultValue: "anyone"),
                    DefaultAllowQuotes = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    FontSize = table.Column<int>(type: "int", nullable: true, defaultValue: 15),
                    EnableTrending = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    EnableDiscoverVideo = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    EnableTreeView = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    RequireLogoutVisibility = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    LargerAltBadge = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    SelectedInterests = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ShowReplies = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    ShowReposts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    ShowQuotePosts = table.Column<bool>(type: "bit", nullable: true, defaultValue: true),
                    ShowSampleSavedFeeds = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    EnabledMediaProviders = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__UserSett__1788CC4CA56EF176", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_SettingsUser",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UserFeedSubscriptions",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FeedId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IsPinned = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    PinnedOrder = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__UserFeed__56D0A1B996CA0707", x => new { x.UserId, x.FeedId });
                    table.ForeignKey(
                        name: "FK_SubsFeed",
                        column: x => x.FeedId,
                        principalTable: "Feeds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SubsUser",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ListMembers",
                columns: table => new
                {
                    ListId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Uri = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Cid = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__ListMemb__32FBA4C18A09448F", x => new { x.ListId, x.UserId });
                    table.ForeignKey(
                        name: "FK_LM_List",
                        column: x => x.ListId,
                        principalTable: "Lists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LM_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "UserListSubscriptions",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    PinnedOrder = table.Column<int>(type: "int", nullable: false, defaultValue: 0)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserListSubscription", x => new { x.UserId, x.ListId });
                    table.ForeignKey(
                        name: "FK_ULS_List",
                        column: x => x.ListId,
                        principalTable: "Lists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ULS_User",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "MessageReactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Emoji = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageReactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageReactions_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessageReactions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Bookmarks",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Bookmark__8D29EA4D4F993AF5", x => new { x.UserId, x.PostId });
                    table.ForeignKey(
                        name: "FK_BookmarkPost",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BookmarkUser",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Likes",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Uri = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Likes__8D29EA4DA4FAA6F6", x => new { x.UserId, x.PostId });
                    table.ForeignKey(
                        name: "FK_LikePost",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LikeUser",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "LinkPreviews",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Image = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Domain = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LinkPreviews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LinkPreviews_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_LinkPreviews_Posts_PostId",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ListPosts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    ListId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AddedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())"),
                    Caption = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ListPosts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ListPosts_Lists_ListId",
                        column: x => x.ListId,
                        principalTable: "Lists",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ListPosts_Posts_PostId",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_ListPosts_Users_AddedByUserId",
                        column: x => x.AddedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "Notifications",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    RecipientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SenderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ListId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Title = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())"),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Notifica__3214EC07E46938FE", x => x.Id);
                    table.ForeignKey(
                        name: "FK_NotifRecipient",
                        column: x => x.RecipientId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NotifSender",
                        column: x => x.SenderId,
                        principalTable: "Users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_NotificationPost",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "PostHashtags",
                columns: table => new
                {
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    HashtagId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PostHashtags", x => new { x.PostId, x.HashtagId });
                    table.ForeignKey(
                        name: "FK_PH_Hashtag",
                        column: x => x.HashtagId,
                        principalTable: "Hashtags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PH_Post",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PostInterests",
                columns: table => new
                {
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    InterestId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__PostInte__C81A52DEA5818FC9", x => new { x.PostId, x.InterestId });
                    table.ForeignKey(
                        name: "FK_PI_Interest",
                        column: x => x.InterestId,
                        principalTable: "Interests",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PI_Post",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PostMedia",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Url = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AltText = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ThumbnailUrl = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Position = table.Column<int>(type: "int", nullable: true, defaultValue: 0),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: true, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__PostMedi__3214EC071ED49D5C", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaPost",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PostReplyAllowedLists",
                columns: table => new
                {
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__PostRepl__E42A52989C4F35D5", x => new { x.PostId, x.ListId });
                    table.ForeignKey(
                        name: "FK_PRAL_List",
                        column: x => x.ListId,
                        principalTable: "Lists",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_PRAL_Post",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Reposts",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PostId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Tid = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Cid = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Uri = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: true, defaultValueSql: "(getutcdate())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK__Reposts__8D29EA4D0BE60F6C", x => new { x.UserId, x.PostId });
                    table.ForeignKey(
                        name: "FK_RepostPost",
                        column: x => x.PostId,
                        principalTable: "Posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_RepostUser",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_BlockedAccounts_BlockedUserId",
                table: "BlockedAccounts",
                column: "BlockedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_BlockedAccounts_Uri",
                table: "BlockedAccounts",
                column: "Uri");

            migrationBuilder.CreateIndex(
                name: "IX_Bookmarks_PostId",
                table: "Bookmarks",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "UQ__Bookmark__C451DB30DF335A92",
                table: "Bookmarks",
                column: "Tid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConversationParticipants_UserId",
                table: "ConversationParticipants",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Feeds_CreatorId",
                table: "Feeds",
                column: "CreatorId");

            migrationBuilder.CreateIndex(
                name: "UQ__Feeds__C451DB30DDF6B147",
                table: "Feeds",
                column: "Tid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Hashtags_Slug",
                table: "Hashtags",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Interest__BC7B5FB60749EE1D",
                table: "Interests",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Labels_Uri",
                table: "Labels",
                column: "Uri");

            migrationBuilder.CreateIndex(
                name: "IX_Likes_PostId",
                table: "Likes",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_Likes_Uri",
                table: "Likes",
                column: "Uri");

            migrationBuilder.CreateIndex(
                name: "UQ__Likes__C451DB30B024EDAB",
                table: "Likes",
                column: "Tid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_LinkPreviews_MessageId",
                table: "LinkPreviews",
                column: "MessageId",
                unique: true,
                filter: "[MessageId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_LinkPreviews_PostId",
                table: "LinkPreviews",
                column: "PostId",
                unique: true,
                filter: "[PostId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_ListMembers_UserId",
                table: "ListMembers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_ListPosts_AddedByUserId",
                table: "ListPosts",
                column: "AddedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ListPosts_ListId",
                table: "ListPosts",
                column: "ListId");

            migrationBuilder.CreateIndex(
                name: "IX_ListPosts_PostId",
                table: "ListPosts",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_Lists_OwnerId",
                table: "Lists",
                column: "OwnerId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_MessageId",
                table: "MessageReactions",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_UserId",
                table: "MessageReactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId",
                table: "Messages",
                column: "ConversationId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ReplyToId",
                table: "Messages",
                column: "ReplyToId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderId",
                table: "Messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "UQ__Messages__C451DB300D86D8F0",
                table: "Messages",
                column: "Tid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MutedAccounts_MutedUserId",
                table: "MutedAccounts",
                column: "MutedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MutedWords_UserId",
                table: "MutedWords",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_PostId",
                table: "Notifications",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RecipientId",
                table: "Notifications",
                column: "RecipientId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_RecipientId_IsRead_CreatedAt",
                table: "Notifications",
                columns: new[] { "RecipientId", "IsRead", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_SenderId",
                table: "Notifications",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "UQ__Notifica__C451DB3001D0607B",
                table: "Notifications",
                column: "Tid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PostHashtags_HashtagId",
                table: "PostHashtags",
                column: "HashtagId");

            migrationBuilder.CreateIndex(
                name: "IX_PostInterests_InterestId",
                table: "PostInterests",
                column: "InterestId");

            migrationBuilder.CreateIndex(
                name: "IX_PostMedia_PostId",
                table: "PostMedia",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_PostReplyAllowedLists_ListId",
                table: "PostReplyAllowedLists",
                column: "ListId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_AuthorId_Active_CreatedAt",
                table: "Posts",
                columns: new[] { "AuthorId", "IsDeleted", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_AuthorId_CreatedAt",
                table: "Posts",
                columns: new[] { "AuthorId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_CreatedAt",
                table: "Posts",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_LikesCount",
                table: "Posts",
                column: "LikesCount");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_LikesCount_CreatedAt",
                table: "Posts",
                columns: new[] { "LikesCount", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_QuotePostId",
                table: "Posts",
                column: "QuotePostId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_ReplyToPostId_CreatedAt",
                table: "Posts",
                columns: new[] { "ReplyToPostId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Posts_RootPostId",
                table: "Posts",
                column: "RootPostId");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_Tid",
                table: "Posts",
                column: "Tid");

            migrationBuilder.CreateIndex(
                name: "IX_Posts_Uri",
                table: "Posts",
                column: "Uri");

            migrationBuilder.CreateIndex(
                name: "UQ__Posts__C451DB308F8113F0",
                table: "Posts",
                column: "Tid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RepoBlocks_Did",
                table: "RepoBlocks",
                column: "Did");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_ReporterId",
                table: "Reports",
                column: "ReporterId");

            migrationBuilder.CreateIndex(
                name: "IX_Reposts_PostId",
                table: "Reposts",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_Reposts_Uri",
                table: "Reposts",
                column: "Uri");

            migrationBuilder.CreateIndex(
                name: "UQ__Reposts__C451DB3010751B4E",
                table: "Reposts",
                column: "Tid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_SupportRequests_UserId",
                table: "SupportRequests",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFeedSubscriptions_FeedId",
                table: "UserFeedSubscriptions",
                column: "FeedId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFollows_FollowingId",
                table: "UserFollows",
                column: "FollowingId");

            migrationBuilder.CreateIndex(
                name: "IX_UserFollows_Uri",
                table: "UserFollows",
                column: "Uri");

            migrationBuilder.CreateIndex(
                name: "IX_UserInterests_InterestId",
                table: "UserInterests",
                column: "InterestId");

            migrationBuilder.CreateIndex(
                name: "IX_UserListSubscriptions_ListId",
                table: "UserListSubscriptions",
                column: "ListId");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Active_CreatedAt",
                table: "Users",
                columns: new[] { "IsDeleted", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Did",
                table: "Users",
                column: "Did");

            migrationBuilder.CreateIndex(
                name: "IX_Users_FollowersCount_CreatedAt",
                table: "Users",
                columns: new[] { "FollowersCount", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "UQ__Users__536C85E411906A34",
                table: "Users",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Users__A9D105340284C248",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Users__C0312219EBC0F5F8",
                table: "Users",
                column: "Did",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ__Users__FE5BB31A92C6FE6D",
                table: "Users",
                column: "Handle",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BlockedAccounts");

            migrationBuilder.DropTable(
                name: "Bookmarks");

            migrationBuilder.DropTable(
                name: "ConversationParticipants");

            migrationBuilder.DropTable(
                name: "Labels");

            migrationBuilder.DropTable(
                name: "Likes");

            migrationBuilder.DropTable(
                name: "LinkPreviews");

            migrationBuilder.DropTable(
                name: "ListMembers");

            migrationBuilder.DropTable(
                name: "ListPosts");

            migrationBuilder.DropTable(
                name: "MessageReactions");

            migrationBuilder.DropTable(
                name: "MutedAccounts");

            migrationBuilder.DropTable(
                name: "MutedWords");

            migrationBuilder.DropTable(
                name: "Notifications");

            migrationBuilder.DropTable(
                name: "PageContents");

            migrationBuilder.DropTable(
                name: "PostHashtags");

            migrationBuilder.DropTable(
                name: "PostInterests");

            migrationBuilder.DropTable(
                name: "PostMedia");

            migrationBuilder.DropTable(
                name: "PostReplyAllowedLists");

            migrationBuilder.DropTable(
                name: "RepoBlocks");

            migrationBuilder.DropTable(
                name: "Reports");

            migrationBuilder.DropTable(
                name: "Reposts");

            migrationBuilder.DropTable(
                name: "SupportRequests");

            migrationBuilder.DropTable(
                name: "UserFeedSubscriptions");

            migrationBuilder.DropTable(
                name: "UserFollows");

            migrationBuilder.DropTable(
                name: "UserInterests");

            migrationBuilder.DropTable(
                name: "UserListSubscriptions");

            migrationBuilder.DropTable(
                name: "UserSettings");

            migrationBuilder.DropTable(
                name: "Messages");

            migrationBuilder.DropTable(
                name: "Hashtags");

            migrationBuilder.DropTable(
                name: "Posts");

            migrationBuilder.DropTable(
                name: "Feeds");

            migrationBuilder.DropTable(
                name: "Interests");

            migrationBuilder.DropTable(
                name: "Lists");

            migrationBuilder.DropTable(
                name: "Conversations");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
