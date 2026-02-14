using BSkyClone.Models;
using BSkyClone.Repositories;

namespace BSkyClone.UnitOfWork;

public class UnitOfWork : IUnitOfWork
{
    private readonly BSkyDbContext _context;
    private IUserRepository? _users;
    private IPostRepository? _posts;
    private IFeedRepository? _feeds;
    private IFollowRepository? _follows;
    private IUserFeedSubscriptionRepository? _userFeedSubscriptions;

    public UnitOfWork(BSkyDbContext context)
    {
        _context = context;
    }

    public IUserRepository Users => _users ??= new UserRepository(_context);
    public IPostRepository Posts => _posts ??= new PostRepository(_context);
    public IFeedRepository Feeds => _feeds ??= new FeedRepository(_context);
    public IFollowRepository Follows => _follows ??= new FollowRepository(_context);
    public IUserFeedSubscriptionRepository UserFeedSubscriptions => _userFeedSubscriptions ??= new UserFeedSubscriptionRepository(_context);
    public IBlockRepository Blocks => _blocks ??= new BlockRepository(_context);
    public IMuteRepository Mutes => _mutes ??= new MuteRepository(_context);
    public IConversationRepository Conversations => _conversations ??= new ConversationRepository(_context);
    public IMessageRepository Messages => _messages ??= new MessageRepository(_context);
    public INotificationRepository Notifications => _notifications ??= new NotificationRepository(_context);
    public IRepository<Like> Likes => _likes ??= new Repository<Like>(_context);
    public IRepository<Bookmark> Bookmarks => _bookmarks ??= new Repository<Bookmark>(_context);
    public IRepository<Repost> Reposts => _reposts ??= new Repository<Repost>(_context);
    public IRepository<List> Lists => _lists ??= new Repository<List>(_context);
    public IRepository<ListMember> ListMembers => _listMembers ??= new Repository<ListMember>(_context);
    public IRepository<UserListSubscription> UserListSubscriptions => _userListSubscriptions ??= new Repository<UserListSubscription>(_context);
    public IRepository<LinkPreview> LinkPreviews => _linkPreviews ??= new Repository<LinkPreview>(_context);
    public IRepository<MessageReaction> MessageReactions => _messageReactions ??= new Repository<MessageReaction>(_context);

    public IRepository<ListPost> ListPosts => _listPosts ??= new Repository<ListPost>(_context);
    public IRepository<Interest> Interests => _interests ??= new Repository<Interest>(_context);
    public IRepository<Hashtag> Hashtags => _hashtags ??= new Repository<Hashtag>(_context);
    public IRepository<MutedWord> MutedWords => _mutedWords ??= new Repository<MutedWord>(_context);
    public IRepository<UserSetting> UserSettings => _userSettings ??= new Repository<UserSetting>(_context);

    private IBlockRepository? _blocks;
    private IMuteRepository? _mutes;
    private IConversationRepository? _conversations;
    private IMessageRepository? _messages;
    private INotificationRepository? _notifications;
    private IRepository<Like>? _likes;
    private IRepository<Bookmark>? _bookmarks;
    private IRepository<Repost>? _reposts;
    private IRepository<List>? _lists;
    private IRepository<ListMember>? _listMembers;
    private IRepository<UserListSubscription>? _userListSubscriptions;
    private IRepository<LinkPreview>? _linkPreviews;
    private IRepository<MessageReaction>? _messageReactions;
    private IRepository<ListPost>? _listPosts;
    private IRepository<Interest>? _interests;
    private IRepository<Hashtag>? _hashtags;
    private IRepository<MutedWord>? _mutedWords;
    private IRepository<UserSetting>? _userSettings;

    public async Task<int> CompleteAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
        GC.SuppressFinalize(this);
    }
}
