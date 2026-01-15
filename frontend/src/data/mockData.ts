import { Post, User, Notification, TrendingTopic, Message, Conversation, Feed, TrendingAccount, UserSettings } from '../types';

// ==========================================
// 1. SAMPLE USERS
// ==========================================
export const sampleUsers: User[] = [
    {
        id: '00000000-0000-0000-0000-000000000000',
        username: 'nguyen.dev',
        displayName: 'Nguyen Developer',
        handle: 'nguyen.dev.bsky.social',
        email: 'nguyen@example.com',
        avatar: 'https://ui-avatars.com/api/?name=Nguyen+Dev&background=0D8ABC&color=fff&size=200',
        coverImage: 'https://images.unsplash.com/photo-1469131423693-c2f8c11a3c92?w=1200&h=400&fit=crop',
        bio: 'Building awesome agentic AI tools. 🚀 #Coding #AI',
        location: 'Hanoi, Vietnam',
        website: 'https://github.com/nguyen',
        emailVerified: true,
        twoFactorEnabled: true,
        isPrivate: false,
        createdAt: '2023-01-01T00:00:00Z',
        followersCount: 1540,
        followingCount: 230,
        postsCount: 45,
        isOnline: true,
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'alice.wonder',
        displayName: 'Alice Wonderland',
        handle: 'alice.wonder.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=Alice+W&background=6366F1&color=fff&size=200',
        coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&h=400&fit=crop',
        bio: 'Exploring the rabbit hole of technology and art. ✨',
        emailVerified: true,
        followersCount: 5678,
        followingCount: 567,
        postsCount: 156,
        isFollowing: true,
    },
    {
        id: '00000000-0000-0000-0000-000000000003',
        username: 'bob.builder',
        displayName: 'Bob The Builder',
        handle: 'bob.builder.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=Bob+B&background=F59E0B&color=fff&size=200',
        bio: 'Can we fix it? Yes we can! 🛠️',
        followersCount: 890,
        followingCount: 1230,
        postsCount: 450,
        isFollowing: false,
    }
];

// ==========================================
// 2. USER SETTINGS
// ==========================================
export const sampleUserSettings: Record<string, UserSettings> = {
    'user-0': {
        userId: 'user-0',
        requireAltText: false,
        largerAltBadge: false,
        autoplayVideoGif: true,
        openTrendingTopics: true,
        enableVideoDiscover: true,
        sortReplies: 'top',
        treeView: true,
        showReplies: true,
        showReposts: true,
        showQuotePosts: true,
        showSampleSavedFeeds: true,
        enabledMediaProviders: ['YouTube', 'Spotify', 'Twitch'],
        selectedInterests: ['technology', 'art', 'science', 'nature'],
        logoutVisibility: false,
        enableAdultContent: true,
        adultContentFilter: 'warn',
        sexuallyExplicitFilter: 'hide',
        graphicMediaFilter: 'warn',
        nonSexualNudityFilter: 'show',
        notifyLikes: true,
        notifyFollowers: true,
        notifyReplies: true,
        notifyMentions: true,
        notifyQuotes: true,
        notifyReposts: true,
        appLanguage: 'en',
        primaryLanguage: 'en',
        themeMode: 'system'
    }
};

// ==========================================
// 3. POSTS
// ==========================================
export const samplePosts: Post[] = [
    {
        id: 'post-1',
        author: sampleUsers[0],
        content: 'I just designed the complete SQL Server database schema for this app! 🏗️ Looking forward to the backend implementation. #Fullstack #DatabaseDesign',
        createdAt: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
        likesCount: 25,
        repostsCount: 5,
        repliesCount: 2,
        quotesCount: 1,
        isLiked: false,
        isReposted: false,
        isBookmarked: true,
    },
    {
        id: 'post-2',
        author: sampleUsers[1],
        content: 'Thinking about the difference between DATETIME and DATETIME2 in SQL Server... Precision matters! ⏱️',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        likesCount: 156,
        repostsCount: 28,
        repliesCount: 12,
        quotesCount: 3,
        isLiked: true,
        isReposted: true,
        isBookmarked: false,
    },
    {
        id: 'post-3',
        author: sampleUsers[2],
        content: 'Check out this new building I constructed! 🏗️🏢',
        images: [
            { url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&h=600&fit=crop', alt: 'Modern Skyscraper' }
        ],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        likesCount: 89,
        repostsCount: 12,
        repliesCount: 5,
        quotesCount: 0,
        isLiked: false,
        isReposted: false,
    }
];

// ==========================================
// 4. FOLLOWS / LIKES / ETC (RELATIONS)
// ==========================================
export const sampleFollows = [
    { followerId: 'user-0', followingId: 'user-1' },
    { followerId: 'user-1', followingId: 'user-0' },
];

export const sampleLikes = [
    { userId: 'user-0', postId: 'post-2' },
    { userId: 'user-1', postId: 'post-2' },
];

// ==========================================
// 5. MODERATION DATA
// ==========================================
export const sampleMutedWords = ['spam', 'ad', 'crypto-scam'];
export const sampleMutedUsers = ['user-fake-1'];
export const sampleBlockedUsers = ['user-bad-1'];

// ==========================================
// 6. NOTIFICATIONS (Removed - Using real API)
// ==========================================

// ==========================================
// 7. FEEDS
// ==========================================
export const sampleFeeds: Feed[] = [
    {
        id: 'following',
        name: 'Following',
        description: 'Posts from accounts you follow.',
        handle: 'following.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=F&background=1d4ed8&color=fff',
        followersCount: 0,
        isSubscribed: true,
        isPinned: true,
        pinnedOrder: 0
    },
    {
        id: 'discover',
        name: 'Discover',
        description: 'New and trending posts from across the network.',
        handle: 'discover.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=D&background=3b82f6&color=fff',
        followersCount: 1000000,
        isSubscribed: true,
        isPinned: true,
        pinnedOrder: 1
    },
    {
        id: 'science',
        name: 'Science Today',
        description: 'The latest in physics, biology, and technology.',
        handle: 'science.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=S&background=6366f1&color=fff',
        followersCount: 45000,
        isSubscribed: true,
        isPinned: true,
        pinnedOrder: 2
    },
    {
        id: 'tech-news',
        name: 'Tech News',
        description: 'Stay updated with the latest in the tech world.',
        handle: 'technews.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=T&background=0ea5e9&color=fff',
        followersCount: 89000,
        isSubscribed: true,
        isPinned: false
    },
    {
        id: 'art-gallery',
        name: 'Art Gallery',
        description: 'Beautiful artworks from creators around the globe.',
        handle: 'artgallery.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=A&background=ec4899&color=fff',
        followersCount: 120000,
        isSubscribed: true,
        isPinned: false
    },
    {
        id: 'movies-tv',
        name: 'Movies & TV',
        description: 'Everything about the silver screen and beyond.',
        handle: 'movies.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=M&background=f43f5e&color=fff',
        followersCount: 67000,
        isSubscribed: false,
        isPinned: false
    },
    {
        id: 'nature-lovers',
        name: 'Nature Lovers',
        description: 'A feed for those who appreciate the beauty of our planet.',
        handle: 'nature.bsky.social',
        avatar: 'https://ui-avatars.com/api/?name=N&background=10b981&color=fff',
        followersCount: 154000,
        isSubscribed: false,
        isPinned: false
    }
];

// ==========================================
// 8. TRENDING TOPICS
// ==========================================
export const sampleTrendingTopics: TrendingTopic[] = [
    { id: 't1', hashtag: 'DatabaseDesign', postsCount: 1200, category: 'Tech' },
    { id: 't2', hashtag: 'Caturday', postsCount: 5600, category: 'Pets' },
    { id: 't3', hashtag: 'BlueSky', postsCount: 15400, category: 'Social' }
];

export const sampleTrendingAccounts: TrendingAccount[] = [
    {
        id: 'ta1',
        displayName: 'Tech Insider',
        handle: 'techinsider.bsky.social',
        postsCount: '1.2k',
        category: 'Tech',
        followersAvatars: [sampleUsers[0].avatar!],
        type: 'Account'
    }
];

// ==========================================
// 9. MESSAGES & CONVERSATIONS
// ==========================================
export const sampleMessages: Message[] = [
    {
        id: 'msg-1',
        conversationId: '00000000-0000-0000-0000-000000000001',
        senderId: '00000000-0000-0000-0000-000000000002',
        content: 'Hey Nguyen! I loved your database design post.',
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        isRead: true
    },
    {
        id: 'msg-2',
        conversationId: '00000000-0000-0000-0000-000000000001',
        senderId: '00000000-0000-0000-0000-000000000000',
        content: 'Thanks Alice! It was fun to put together.',
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        isRead: false
    }
];

export const sampleConversations: Conversation[] = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        participants: [sampleUsers[0], sampleUsers[1]],
        lastMessage: sampleMessages[1],
        unreadCount: 1,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    }
];

// Re-exporting subsets for specific feed components if needed
export const mutualsPosts = [samplePosts[1]];
export const sciencePosts = [samplePosts[0]];
export const artistsPosts = [samplePosts[2]];
export const newsPosts = [samplePosts[1]];
export const blackskyPosts = [samplePosts[0]];
export const sampleSuggestedUsers = [sampleUsers[2]];
export const sampleInterests = ['technology', 'art', 'science', 'nature', 'developers', 'books', 'movies', 'music', 'gaming', 'travel', 'food', 'fashion', 'sports', 'news', 'politics', 'environment', 'health', 'fitness'];

