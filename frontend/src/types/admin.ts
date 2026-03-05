export interface AdminStats {
    totalUsers: number;
    totalPosts: number;
    totalFeeds: number;
    activeUsersToday: number;
    newPostsToday: number;
    bannedUsers: number;
    totalLists: number;
    totalConversations: number;
    totalNotifications: number;
}

export interface AdminList {
    id: string;
    name: string;
    description?: string;
    purpose?: string;
    ownerHandle: string;
    membersCount: number;
    postsCount: number;
    createdAt: string;
}

export interface AdminConversation {
    id: string;
    participants: string[]; // Handles
    messageCount: number;
    lastActivity: string;
    createdAt: string;
}

export interface AdminBlock {
    id: string;
    userHandle: string;
    blockedUserHandle: string;
    createdAt: string;
}

export interface AdminMute {
    id: string;
    userHandle: string;
    mutedUserHandle: string;
    createdAt: string;
}

export interface AdminUser {
    id: string;
    handle: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    followersCount: number;
    postsCount: number;
    isBanned: boolean;
    isVerified: boolean;
    createdAt: string;
    role: string;
}

export interface AdminPost {
    id: string;
    tid: string;
    content: string;
    authorHandle: string;
    authorDisplayName?: string;
    authorAvatarUrl?: string;
    likesCount: number;
    repostsCount: number;
    repliesCount: number;
    createdAt: string;
    mediaUrls: string[];
    isDeleted: boolean;
    videoUrl?: string;
    linkTitle?: string;
    linkDescription?: string;
    linkImage?: string;
    linkUrl?: string;
}

export interface AdminFeed {
    id: string;
    name: string;
    handle: string;
    description?: string;
    avatarUrl?: string;
    subscribersCount: number;
    createdAt: string;
    isOfficial: boolean;
}

export interface AdminInterest {
    name: string;
    usersCount: number;
    createdAt?: string;
}

export interface AdminHashtag {
    id: number;
    name: string;
    slug: string;
    postsCount: number;
    createdAt: string;
}

export interface BroadcastNotificationRequest {
    title: string;
    content: string;
    type: string;
    targetRole?: string;
}

export interface PaginatedResult<T> {
    items: T[];
    totalCount: number;
}
