import React from 'react';

// User types
export interface User {
    id: string;
    username: string;
    displayName: string;
    handle: string; // e.g., "user.bsky.social"
    email?: string;
    avatar?: string;
    coverImage?: string;
    bio?: string;
    location?: string;
    website?: string;
    dateOfBirth?: string;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    isPrivate?: boolean;
    createdAt?: string;
    lastLoginAt?: string;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing?: boolean;
    isOnline?: boolean;
    // For simplified author data from posts
    avatarUrl?: string;
    isBlockedBy?: boolean;
    isBlocking?: boolean;
    isMuted?: boolean;
    role?: 'user' | 'admin';
    listMembershipStatus?: number; // 0: Pending, 1: Accepted, 2: Rejected, null: None
}

export interface UserSettings {
    userId: string;
    // Accessibility
    requireAltText: boolean;
    largerAltBadge: boolean;
    // Content & Media
    autoplayVideoGif: boolean;
    openTrendingTopics: boolean;
    enableVideoDiscover: boolean;
    sortReplies: 'top' | 'oldest' | 'newest';
    treeView: boolean;
    showReplies: boolean;
    showReposts: boolean;
    showQuotePosts: boolean;
    showSampleSavedFeeds: boolean;
    // External Media Providers
    enabledMediaProviders: string[];
    // Interests
    selectedInterests: string[];
    // Privacy
    logoutVisibility: boolean;
    // Moderation
    enableAdultContent: boolean;
    adultContentFilter: 'show' | 'warn' | 'hide';
    sexuallyExplicitFilter: 'show' | 'warn' | 'hide';
    graphicMediaFilter: 'show' | 'warn' | 'hide';
    nonSexualNudityFilter: 'show' | 'warn' | 'hide';
    // Notifications Toggles
    notifyLikes: boolean;
    notifyFollowers: boolean;
    notifyReplies: boolean;
    notifyMentions: boolean;
    notifyQuotes: boolean;
    notifyReposts: boolean;
    pushNotifyLikes: boolean;
    pushNotifyFollowers: boolean;
    pushNotifyReplies: boolean;
    pushNotifyMentions: boolean;
    pushNotifyQuotes: boolean;
    pushNotifyReposts: boolean;
    inAppNotifyLikes: boolean;
    inAppNotifyFollowers: boolean;
    inAppNotifyReplies: boolean;
    inAppNotifyMentions: boolean;
    inAppNotifyQuotes: boolean;
    inAppNotifyReposts: boolean;
    // Branding/UI
    appLanguage: string;
    primaryLanguage: string;
    themeMode: 'system' | 'light' | 'dark';
    fontSize?: number;
    // Interaction Settings
    defaultReplyRestriction?: string;
    defaultAllowQuotes?: boolean;
}

export interface LinkPreview {
    title: string;
    description: string;
    image?: string;
    url: string;
    domain: string;
}

export interface PostImage {
    url: string;
    alt?: string;
}

export interface PostVideo {
    url: string;
    thumbnail?: string;
    alt?: string;
}

// Post types
export interface Post {
    id: string;
    author: Partial<User> & { id: string; username: string; handle: string; displayName: string; avatarUrl?: string };
    content: string;
    images?: PostImage[];
    imageUrls?: string[]; // From backend
    videoUrl?: string; // From backend
    video?: PostVideo;
    linkPreview?: LinkPreview;
    createdAt: string;
    likesCount: number;
    repostsCount: number;
    bookmarksCount: number;
    repliesCount: number;
    quotesCount: number;
    isLiked?: boolean;
    isReposted?: boolean;
    isBookmarked?: boolean;
    listCaption?: string; // For curated lists
    isDeleted?: boolean;
    replyToPostId?: string;
    replyToHandle?: string;
    rootPostId?: string;
    addedByUserId?: string; // For curated lists
    tags?: string[];
    muteInfo?: {
        isMuted: boolean;
        behavior: 'hide' | 'warn' | 'none';
        reason?: string;
    };
    canReply?: boolean;
    replyRestriction?: string;
}

// Comment/Reply types
export interface Comment {
    id: string;
    postId: string;
    author: User;
    content: string;
    createdAt: string;
    likesCount: number;
    isLiked?: boolean;
}

// Notification types
export type NotificationType = 'like' | 'repost' | 'follow' | 'mention' | 'reply' | 'quote' | 'system' | 'System' | 'list_invitation';

export interface Notification {
    id: string;
    type: NotificationType;
    sender: User;
    postId?: string;
    listId?: string;
    title?: string;
    content?: string;
    createdAt: string;
    isRead: boolean;
    invitationStatus?: number;
}

export interface MutedWord {
    id: number;
    word: string;
    muteBehavior: string;
    createdAt?: string;
}

// Trending topic types
export interface TrendingTopic {
    id: string;
    hashtag: string;
    postsCount: number;
    category?: string;
}

export interface TrendingAccount {
    id: string;
    displayName: string;
    handle: string;
    postsCount: string;
    category: string;
    followersAvatars: string[];
    type: string;
    isPromoted?: boolean;
    timeAgo?: string;
    hoursAgo?: number;
}

// Feed types
export interface Feed {
    id: string;
    name: string;
    description: string;
    handle: string;
    avatar?: string;
    avatarUrl?: string;
    followersCount: number;
    subscribersCount?: number;
    isSubscribed?: boolean;
    isPinned?: boolean; // For UI state in FeedsPage/ProfilePage
    pinnedOrder?: number;
}

export interface MessageReaction {
    userId: string;
    emoji: string;
    displayName?: string;
}

export interface Message {
    id: string;
    conversationId: string;
    senderId: string;
    content?: string;
    imageUrl?: string;
    createdAt: string;
    isRead: boolean;
    isModified?: boolean;
    isRecalled?: boolean;
    sender?: Partial<User>;
    linkPreview?: LinkPreview;
    replyTo?: Message;
    reactions?: MessageReaction[];
}

export interface Conversation {
    id: string;
    participants: User[];
    lastMessage: Message | null;
    unreadCount: number;
    createdAt: string;
}

export type UserDto = User;

// List types
export interface ListDto {
    id: string;
    ownerId: string;
    owner: User;
    name: string;
    description?: string;
    purpose?: string;
    avatarUrl?: string;
    membersCount: number;
    postsCount: number;
    createdAt: string;
    isPinned: boolean;
    isOwner: boolean;
}

export interface CreateListDto {
    name: string;
    description?: string;
    purpose?: string;
    avatar?: string;
}

export interface UpdateListDto {
    name?: string;
    description?: string;
    avatar?: string;
}

export interface ListItemDto {
    userId: string;
    user: User;
    joinedAt: string;
}

// Redux State Types
export interface AuthState {
    user: User | null;
    settings: UserSettings | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface ThemeState {
    mode: 'light' | 'dark';
    colorMode: 'system' | 'light' | 'dark';
    darkVariant: 'dim' | 'dark';
    fontFamily: 'system' | 'ui';
    fontSize: 'sm' | 'md' | 'lg';
}

export interface PostsState {
    posts: Post[];
    trendingPosts: Post[];
    isLoading: boolean;
    error: string | null;
    hasMore: boolean;
    actionLoading: Record<string, boolean>;
}

export interface UserState {
    profile: User | null; // Current viewing profile
    users: User[]; // All sample users
    suggestedUsers: User[]; // Suggested users to follow
    mutedWords: MutedWord[];
    mutedUsers: string[]; // User IDs
    blockedUsers: string[]; // User IDs
    isLoading: boolean;
    error: string | null;
    actionLoading: Record<string, boolean>;
}

export interface NotificationsState {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
}

export interface TrendingState {
    topics: TrendingTopic[];
    accounts: TrendingAccount[];
    interests: string[];
    isLoading: boolean;
    error: string | null;
}

export interface LanguageState {
    appLanguage: string;
    primaryLanguage: string;
    contentLanguages: string[];
}

export interface ModalsState {
    createPost: boolean;
    editProfile: boolean;
    mobileMenu: boolean;
    imageViewer: {
        isOpen: boolean;
        images: string[];
        currentIndex: number;
    };
    reply: {
        isOpen: boolean;
        post: Post | null;
    };
    confirmation: {
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm?: () => void;
    };
    sharePost: {
        isOpen: boolean;
        post: Post | null;
    };
}

// Component Props Types
export interface ButtonProps {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    disabled?: boolean;
    loading?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
}

export interface InputProps {
    type?: string;
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label?: string;
    error?: string;
    disabled?: boolean;
    className?: string;
    icon?: React.ReactNode;
}

export interface AvatarProps {
    src?: string;
    alt: string;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    online?: boolean;
    className?: string;
}

// Auth form types
export interface SignUpFormData {
    email: string;
    password: string;
    dateOfBirth: string;
    username: string;
    hostingProvider: string;
}

export interface LoginFormData {
    identifier: string; // email or username
    password: string;
    rememberMe?: boolean;
}
