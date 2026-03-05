using BSkyClone.Models;
using BSkyClone.Repositories;

namespace BSkyClone.UnitOfWork;

public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    IPostRepository Posts { get; }
    IFeedRepository Feeds { get; }
    IFollowRepository Follows { get; }
    IUserFeedSubscriptionRepository UserFeedSubscriptions { get; }
    IBlockRepository Blocks { get; }
    IMuteRepository Mutes { get; }
    IConversationRepository Conversations { get; }
    IMessageRepository Messages { get; }
    INotificationRepository Notifications { get; }
    IRepository<Like> Likes { get; }
    IRepository<Bookmark> Bookmarks { get; }
    IRepository<Repost> Reposts { get; }
    IRepository<List> Lists { get; }
    IRepository<ListMember> ListMembers { get; }
    IRepository<UserListSubscription> UserListSubscriptions { get; }
    IRepository<LinkPreview> LinkPreviews { get; }
    IRepository<MessageReaction> MessageReactions { get; }
    IRepository<ListPost> ListPosts { get; }
    IRepository<Interest> Interests { get; }
    IRepository<Hashtag> Hashtags { get; }
    IRepository<MutedWord> MutedWords { get; }
    IRepository<UserSetting> UserSettings { get; }
    Task<int> CompleteAsync();
}
