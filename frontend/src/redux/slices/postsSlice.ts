import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PostsState, Post } from '../../types';
import { API_BASE_URL } from '../../constants';
import { mapAtProtoPostToPost } from '../../utils/postMapper';
import { hydratePostsWithInteractionStatus } from '../../utils/postHydrator';

const initialState: PostsState = {
    posts: [],
    threadPosts: [], // Dedicated array for thread views to prevent pollution
    discoverPosts: [],
    trendingPosts: [],
    bookmarkedPosts: [],
    isLoading: false,
    timelineLoading: false,
    discoverLoading: false,
    bookmarkedLoading: false,
    error: null,
    bookmarkedError: null,
    threadError: null,
    hasMore: true,
    discoverHasMore: true,
    actionLoading: {},
    lastTimelineFetch: 0,
    lastDiscoverFetch: 0,
    cursor: null,
    discoverCursor: null,
    lastUserPostsFetch: 0,
    lastUserPostsUserId: null,
    lastUserPostsType: null,
    interactionTruth: {},
};

const normalizeIdentifier = (value?: string | null): string => {
    if (!value) return '';
    return value.trim().replace(/^@/, '').toLowerCase();
};

const identifiersForUser = (user?: any): string[] => {
    if (!user) return [];
    return [
        normalizeIdentifier(user.id),
        normalizeIdentifier(user.did),
        normalizeIdentifier(user.handle),
        normalizeIdentifier(user.username),
    ].filter(Boolean);
};

const userMatchesIdentifier = (user: any, identifier: string): boolean => {
    const normalizedIdentifier = normalizeIdentifier(identifier);
    if (!normalizedIdentifier) return false;
    return identifiersForUser(user).includes(normalizedIdentifier);
};

const mergeUserSnapshot = (existingUser: any, incomingUser: any) => {
    if (!existingUser) return incomingUser;
    if (!incomingUser) return existingUser;

    return {
        ...existingUser,
        ...incomingUser,
        isFollowing: incomingUser.isFollowing ?? existingUser.isFollowing,
        isFollowedBy: incomingUser.isFollowedBy ?? existingUser.isFollowedBy,
        followingReference: incomingUser.followingReference ?? existingUser.followingReference,
    };
};

const mergePostSnapshot = (existingPost: Post, incomingPost: Post): Post => ({
    ...existingPost,
    ...incomingPost,
    author: incomingPost.author ? mergeUserSnapshot(existingPost.author, incomingPost.author) : existingPost.author,
    repostedBy: incomingPost.repostedBy ? mergeUserSnapshot(existingPost.repostedBy, incomingPost.repostedBy) : existingPost.repostedBy,
    quotePost: incomingPost.quotePost
        ? existingPost.quotePost
            ? mergePostSnapshot(existingPost.quotePost, incomingPost.quotePost)
            : incomingPost.quotePost
        : existingPost.quotePost,
    parentPost: incomingPost.parentPost
        ? existingPost.parentPost
            ? mergePostSnapshot(existingPost.parentPost, incomingPost.parentPost)
            : incomingPost.parentPost
        : existingPost.parentPost,
    images: incomingPost.images?.length ? incomingPost.images : existingPost.images,
    imageUrls: incomingPost.imageUrls?.length ? incomingPost.imageUrls : existingPost.imageUrls,
    media: incomingPost.media?.length ? incomingPost.media : existingPost.media,
    video: incomingPost.video ?? existingPost.video,
    videoUrl: incomingPost.videoUrl ?? existingPost.videoUrl,
    linkPreview: incomingPost.linkPreview ?? existingPost.linkPreview,
    likesCount: incomingPost.likesCount ?? existingPost.likesCount,
    repostsCount: incomingPost.repostsCount ?? existingPost.repostsCount,
    repliesCount: incomingPost.repliesCount ?? existingPost.repliesCount,
    quotesCount: incomingPost.quotesCount ?? existingPost.quotesCount,
    bookmarksCount: incomingPost.bookmarksCount ?? existingPost.bookmarksCount,
    isLiked: incomingPost.isLiked ?? existingPost.isLiked,
    isReposted: incomingPost.isReposted ?? existingPost.isReposted,
    isBookmarked: incomingPost.isBookmarked ?? existingPost.isBookmarked,
});

const applyFollowStateToPosts = (posts: Post[], identifier: string, isFollowing: boolean, followUri?: string) => {
    posts.forEach((post) => {
        if (userMatchesIdentifier(post.author, identifier)) {
            post.author = {
                ...post.author,
                isFollowing,
                followingReference: isFollowing ? followUri : undefined,
            };
        }

        if (post.repostedBy && userMatchesIdentifier(post.repostedBy, identifier)) {
            post.repostedBy = {
                ...post.repostedBy,
                isFollowing,
                followingReference: isFollowing ? followUri : undefined,
            };
        }
    });
};
const getPostIdentityKey = (post?: Partial<Post> | null): string => {
    if (!post) return '';
    if (post.uri) return `uri:${post.uri}`;
    if (post.tid) return `tid:${post.tid}`;
    if (post.id) return `id:${post.id}`;
    if (post.cid) return `cid:${post.cid}`;
    return '';
};

const dedupePostsByIdentity = (posts: Post[]): Post[] => {
    const seen = new Set<string>();
    const deduped: Post[] = [];

    posts.forEach((post) => {
        const key = getPostIdentityKey(post);
        if (!key) {
            deduped.push(post);
            return;
        }
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(post);
        }
    });

    return deduped;
};

const matchesPost = (post: Post, actionUri: string): boolean => {
    if (!actionUri) return false;
    return !!(
        post.uri === actionUri ||
        post.id === actionUri ||
        post.tid === actionUri ||
        (post.uri && post.uri.endsWith('/' + actionUri.split('/').pop()!))
    );
};

const updateInteractionTruth = (state: PostsState, post: Post) => {
    if (!post.uri) return;
    
    if (!state.interactionTruth[post.uri]) {
        state.interactionTruth[post.uri] = {
            isLiked: post.isLiked,
            isReposted: post.isReposted,
            isBookmarked: post.isBookmarked,
            likesCount: post.likesCount,
            repostsCount: post.repostsCount,
            bookmarksCount: post.bookmarksCount,
            repliesCount: post.repliesCount,
            viewer: post.viewer,
        };
    } else {
        const existing = state.interactionTruth[post.uri];
        if ((post.likesCount ?? 0) > (existing.likesCount ?? 0)) existing.likesCount = post.likesCount;
        if ((post.repostsCount ?? 0) > (existing.repostsCount ?? 0)) existing.repostsCount = post.repostsCount;
        if ((post.bookmarksCount ?? 0) > (existing.bookmarksCount ?? 0)) existing.bookmarksCount = post.bookmarksCount;
        if ((post.repliesCount ?? 0) > (existing.repliesCount ?? 0)) existing.repliesCount = post.repliesCount;
        
        // Boolean interaction flags: prefer "true" (confirmed state) over "false" (possibly stale).
        // A feed refresh might return isLiked:false because the AppView cache hasn't caught up yet,
        // but we should never reset a confirmed interaction back to false via a background reload.
        // The only authoritative source of a "false" is an explicit user action, which goes through
        // dedicated Redux cases (toggleLike.fulfilled etc.) that bypass this function entirely.
        if (post.isLiked === true) existing.isLiked = true;
        if (post.isReposted === true) existing.isReposted = true;
        if (post.isBookmarked === true) existing.isBookmarked = true;
        // Only propagate false when we have no existing truth (handled above in the !existing branch)
        if (post.viewer !== undefined) existing.viewer = post.viewer;
    }
};

const recursivelyUpdatePost = (post: Post, actionUri: string, updateFn: (p: Post) => void, state?: PostsState) => {
    if (matchesPost(post, actionUri)) {
        updateFn(post);
        if (state) updateInteractionTruth(state, post);
    }
    if (post.parentPost) recursivelyUpdatePost(post.parentPost, actionUri, updateFn, state);
    if (post.quotePost) recursivelyUpdatePost(post.quotePost, actionUri, updateFn, state);
};

const syncPostsWithTruth = (state: PostsState, posts: Post[]) => {
    posts.forEach(post => {
        updateInteractionTruth(state, post);
        if (post.parentPost) syncPostsWithTruth(state, [post.parentPost]);
        if (post.quotePost) syncPostsWithTruth(state, [post.quotePost]);
    });
};



export const fetchTimeline = createAsyncThunk(
    'posts/fetchTimeline',
    async ({ skip = 0, take = 20 }: { skip?: number; take?: number; cursor?: string } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(
                `${API_BASE_URL}/posts/timeline?skip=${skip}&take=${take}`,
                { headers }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch timeline');
            const posts = await response.json();
            return { posts, skip, cursor: null };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserPosts = createAsyncThunk(
    'posts/fetchUserPosts',
    async ({ userId, type, take = 20, skip = 0, cursor }: { userId: string; type?: string; take?: number; skip?: number; cursor?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const params = new URLSearchParams({ take: String(take), skip: String(skip) });
            if (type) params.set('type', type);
            if (cursor) params.set('cursor', cursor);
            const response = await fetch(
                `${API_BASE_URL}/posts/user/${userId}?${params}`,
                { headers }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch user posts');
            const data = await response.json();
            const posts: Post[] = Array.isArray(data) ? data : (data.posts || []);
            const cursorVal = data.cursor || null;
            return { posts, userId, cursor: cursorVal, type };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);



// updatePost removed as AT Protocol usually handles updates by deleting and re-creating or specific field updates in some CMS, but not the standard post flow.

export const updatePost = createAsyncThunk(
    'posts/updatePost',
    async ({ id, content, mediaFiles, videoFile, linkPreview, gifUrl, existingMediaIdsToKeep, labels, quotePostId }: { id: string; content: string; mediaFiles?: File[]; videoFile?: File; linkPreview?: any; gifUrl?: string; existingMediaIdsToKeep?: string[]; labels?: string[]; quotePostId?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('Content', content);
            if (mediaFiles) {
                mediaFiles.forEach(f => formData.append('Images', f));
            }
            if (existingMediaIdsToKeep && existingMediaIdsToKeep.length > 0) {
                existingMediaIdsToKeep.forEach(id => formData.append('ExistingMediaIdsToKeep', id));
            }
            if (videoFile) {
                formData.append('Video', videoFile);
            }
            if (linkPreview) {
                if (linkPreview.url) formData.append('LinkPreviewUrl', linkPreview.url);
                if (linkPreview.title) formData.append('LinkPreviewTitle', linkPreview.title);
                if (linkPreview.description) formData.append('LinkPreviewDescription', linkPreview.description);
                if (linkPreview.image) formData.append('LinkPreviewImage', linkPreview.image);
                if (linkPreview.domain) formData.append('LinkPreviewDomain', linkPreview.domain);
            }
            if (gifUrl) {
                formData.append('GifUrl', gifUrl);
            }
            if (labels && labels.length > 0) {
                labels.forEach(l => formData.append('Labels', l));
            }
            if (quotePostId) {
                formData.append('QuotePostId', quotePostId);
            }

            const response = await fetch(`${API_BASE_URL}/posts/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                return rejectWithValue(err.message || 'Failed to update post');
            }

            return await response.json() as Post;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to update post');
        }
    }
);

export const createPost = createAsyncThunk(
    'posts/createPost',
    async (postData: { content: string; replyTo?: any; mediaFiles?: File[]; videoFile?: File; linkPreview?: any; gifUrl?: string; replyToPostId?: string; rootPostId?: string; quotePostId?: string; labels?: string[] }, { rejectWithValue, getState }) => {
        try {
            const state = getState() as any;
            const user = state.auth.user;
            const token = localStorage.getItem('token');

            const formData = new FormData();
            formData.append('Content', postData.content);
            if (postData.replyToPostId) formData.append('ReplyToPostId', postData.replyToPostId);
            if (postData.rootPostId) formData.append('RootPostId', postData.rootPostId);
            if (postData.mediaFiles) {
                postData.mediaFiles.forEach(f => formData.append('Images', f));
            }
            if (postData.videoFile) {
                formData.append('Video', postData.videoFile);
            }
            if (postData.linkPreview) {
                if (postData.linkPreview.url) formData.append('LinkPreviewUrl', postData.linkPreview.url);
                if (postData.linkPreview.title) formData.append('LinkPreviewTitle', postData.linkPreview.title);
                if (postData.linkPreview.description) formData.append('LinkPreviewDescription', postData.linkPreview.description);
                if (postData.linkPreview.image) formData.append('LinkPreviewImage', postData.linkPreview.image);
                if (postData.linkPreview.domain) formData.append('LinkPreviewDomain', postData.linkPreview.domain);
            }
            if (postData.gifUrl) {
                formData.append('GifUrl', postData.gifUrl);
            }
            if (postData.labels && postData.labels.length > 0) {
                postData.labels.forEach(l => formData.append('Labels', l));
            }
            if (postData.quotePostId) {
                formData.append('QuotePostId', postData.quotePostId);
            }

            const response = await fetch(`${API_BASE_URL}/posts`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                return rejectWithValue(err.message || 'Failed to create post');
            }

            return await response.json() as Post;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create post');
        }
    }
);

export const toggleLike = createAsyncThunk(
    'posts/toggleLike',
    async ({ uri, cid, isLiked }: { uri: string; cid: string; isLiked: boolean }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const postId = uri.includes('/') ? uri.split('/').pop()! : uri;
            const queryParam = uri.startsWith('at://') ? `?uri=${encodeURIComponent(uri)}` : '';
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like${queryParam}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return rejectWithValue('Failed to toggle like');
            const data = await response.json();
            return { uri, isLiked: data.isLiked, likeUri: data.likeUri, likesCount: data.likesCount };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const repostPost = createAsyncThunk(
    'posts/repost',
    async ({ uri, cid, isReposted }: { uri: string; cid: string; isReposted: boolean }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const postId = uri.includes('/') ? uri.split('/').pop()! : uri;
            const queryParam = uri.startsWith('at://') ? `?uri=${encodeURIComponent(uri)}` : '';
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/repost${queryParam}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return rejectWithValue('Failed to toggle repost');
            const data = await response.json();
            return { uri, isReposted: data.isReposted, repostUri: data.repostUri, repostsCount: data.repostsCount };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deletePost = createAsyncThunk(
    'posts/delete',
    async (postUri: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            // Extract GUID from URI
            const postId = postUri.includes('/') ? postUri.split('/').pop()! : postUri;
            const response = await fetch(`${API_BASE_URL}/posts/${postId}?uri=${encodeURIComponent(postUri)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return rejectWithValue('Failed to delete post');
            return postUri;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateInteractionSettings = createAsyncThunk(
    'posts/updateInteractionSettings',
    async ({ postUri, replyRestriction, allowQuotes }: { postUri: string, replyRestriction: string, allowQuotes: boolean }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const postId = postUri.includes('/') ? postUri.split('/').pop()! : postUri;
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/interaction-settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ replyRestriction, allowQuotes })
            });
            if (!response.ok) return rejectWithValue('Failed to update interaction settings');
            const post = await response.json();
            return { postUri, replyRestriction: post.replyRestriction, allowQuotes: post.allowQuotes };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostsByTag = createAsyncThunk(
    'posts/fetchByTag',
    async ({ tag, take = 20, skip = 0 }: { tag: string; take?: number; skip?: number; cursor?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(
                `${API_BASE_URL}/posts/tag/${encodeURIComponent(tag)}?take=${take}&skip=${skip}`,
                { headers }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch posts by tag');
            const posts: Post[] = await response.json();
            return { posts, cursor: null };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostsSearch = createAsyncThunk(
    'posts/fetchSearch',
    async ({ query, skip = 0, take = 20 }: { query: string; skip?: number; take?: number; cursor?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(
                `${API_BASE_URL}/search/posts?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`,
                { headers }
            );
            if (!response.ok) return rejectWithValue('Failed to search posts');
            const posts: Post[] = await response.json();
            return { posts, cursor: null };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostById = createAsyncThunk(
    'posts/fetchPostById',
    async (args: string | { uri: string; handle?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const uri = typeof args === 'string' ? args : args.uri;
            const handle = typeof args === 'object' ? args.handle : undefined;

            // uri may be a full AT URI or just a GUID or a TID
            const postId = uri.includes('/') ? uri.split('/').pop()! : uri;

            // Check if it's a GUID
            const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);

            let endpoint: string;
            if (isGuid) {
                endpoint = `${API_BASE_URL}/posts/${postId}`;
            } else if (handle && handle !== 'local') {
                // Use Standard AT Protocol XRPC getPostThread
                const fullUri = uri.startsWith('at://') ? uri : `at://${handle}/app.bsky.feed.post/${uri}`;
                // Note: API_BASE_URL is usually .../api, so we go up for /xrpc
                const baseUrl = API_BASE_URL.replace(/\/api$/, '');
                endpoint = `${baseUrl}/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(fullUri)}`;
            } else {
                endpoint = `${API_BASE_URL}/posts/tid/${postId}`;
            }

            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(
                endpoint,
                {
                    headers,
                    cache: 'no-store'
                }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch post');

            const data = await response.json();

            // Handle XRPC getPostThread response (thread structure)
            if (data && data.thread) {
                const postsMap = new Map<string, Post>();

                const extractPosts = (node: any) => {
                    if (!node) return;

                    if (node.post) {
                        const mapped = mapAtProtoPostToPost(node.post);
                        if (mapped.uri) {
                            // If we already have this post, merge fields if necessary, otherwise set it
                            if (postsMap.has(mapped.uri)) {
                                postsMap.set(mapped.uri, { ...postsMap.get(mapped.uri)!, ...mapped });
                            } else {
                                postsMap.set(mapped.uri, mapped);
                            }
                        }
                    }

                    if (node.parent) {
                        // parent can be a threadViewPost, notFoundPost, or blockedPost
                        if (node.parent.post) {
                            extractPosts(node.parent);
                        } else if (node.parent.uri) {
                            // Handle cases where parent is not found/blocked but has a URI
                            const mapped = mapAtProtoPostToPost(node.parent);
                            if (mapped.uri && !postsMap.has(mapped.uri)) {
                                postsMap.set(mapped.uri, mapped);
                            }
                        }
                    }

                    if (node.replies && Array.isArray(node.replies)) {
                        node.replies.forEach((r: any) => extractPosts(r));
                    }
                };

                extractPosts(data.thread);
                return await hydratePostsWithInteractionStatus(Array.from(postsMap.values()), token);
            }

            const mappedPosts = Array.isArray(data) ? data.map(mapAtProtoPostToPost) : [mapAtProtoPostToPost(data)];
            return await hydratePostsWithInteractionStatus(mappedPosts, token);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostReplies = createAsyncThunk(
    'posts/fetchReplies',
    async ({ postId, skip = 0, take = 20 }: { postId: string; skip?: number; take?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(
                `${API_BASE_URL}/posts/${postId}/replies?skip=${skip}&take=${take}`,
                { headers }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch replies');
            const posts: Post[] = await response.json();
            return { posts, postId, skip };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchTrendingPosts = createAsyncThunk(
    'posts/fetchTrending',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(
                `${API_BASE_URL}/posts/trending`,
                { headers }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch trending');
            const posts = await response.json() as Post[];
            return posts;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const toggleBookmark = createAsyncThunk(
    'posts/toggleBookmark',
    async ({ uri, isBookmarked }: { uri: string; isBookmarked: boolean }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const postId = uri.includes('/') ? uri.split('/').pop()! : uri;
            const queryParam = uri.startsWith('at://') ? `?uri=${encodeURIComponent(uri)}` : '';
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/bookmark${queryParam}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return rejectWithValue('Failed to toggle bookmark');
            const data = await response.json();
            return { uri, isBookmarked: data.isBookmarked, bookmarksCount: data.bookmarksCount };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const pinPost = createAsyncThunk(
    'posts/pin',
    async (postUri: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/pin?uri=${encodeURIComponent(postUri)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return rejectWithValue('Failed to pin post');
            return postUri;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unpinPost = createAsyncThunk(
    'posts/unpin',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/unpin`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) return rejectWithValue('Failed to unpin post');
            return null;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchBookmarkedPosts = createAsyncThunk(
    'posts/fetchBookmarks',
    async ({ skip = 0, take = 5 }: { skip?: number; take?: number } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/posts/bookmarks?skip=${skip}&take=${take}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch bookmarks');
            
            interface BookmarksResponse {
                posts: Post[];
                cursor: string | null;
            }
            const data = await response.json() as BookmarksResponse;
            
            // Authoritatively hydrate isLiked / isReposted / isBookmarked from the
            // dedicated interactions/status endpoint (queries local DB directly),
            // bypassing any AppView timing / token issues in EnrichAndFilterPostsAsync.
            const hydratedPosts = await hydratePostsWithInteractionStatus(data.posts || [], token);
            return { posts: hydratedPosts, cursor: data.cursor };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDiscoverPosts = createAsyncThunk(
    'posts/fetchDiscover',
    async ({ skip = 0, take = 20 }: { skip?: number; take?: number } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await fetch(
                `${API_BASE_URL}/posts/discover?skip=${skip}&take=${take}`,
                { headers }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch discover feed');
            const data = await response.json();
            // Support both { posts, hasMore } shape and plain Post[] for backward compat
            const posts: Post[] = Array.isArray(data) ? data : (data.posts || []);
            const hasMore: boolean = Array.isArray(data) ? posts.length >= take : (data.hasMore ?? false);
            return { posts, skip, hasMore };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const postsSlice = createSlice({
    name: 'posts',
    initialState,
    reducers: {
        clearPosts: (state: PostsState) => {
            state.posts = [];
            state.hasMore = true;
            state.lastUserPostsFetch = 0;
            state.lastUserPostsUserId = null;
            state.lastUserPostsType = null;
            state.cursor = null;
        },
        updatePostStats: (state, action: PayloadAction<{ uri: string; likesCount: number; repostsCount: number; bookmarksCount: number; repliesCount: number; quotesCount: number; timestamp?: string }>) => {
            const { uri: actionUri, timestamp, ...stats } = action.payload;
            const updateInArray = (arr: Post[]) => {
                arr.forEach((p: Post) => {
                    recursivelyUpdatePost(p, actionUri, (post) => {
                        if (!timestamp || !post.lastUpdated || new Date(timestamp) >= new Date(post.lastUpdated)) {
                            if (stats.likesCount !== undefined) post.likesCount = stats.likesCount;
                            if (stats.repostsCount !== undefined) post.repostsCount = stats.repostsCount;
                            if (stats.bookmarksCount !== undefined) post.bookmarksCount = stats.bookmarksCount;
                            if (stats.repliesCount !== undefined) post.repliesCount = stats.repliesCount;
                            if (stats.quotesCount !== undefined) post.quotesCount = stats.quotesCount;
                            if (timestamp) post.lastUpdated = timestamp;
                        }
                    });
                });
            };
            updateInArray(state.posts);
            updateInArray(state.discoverPosts);
            updateInArray(state.trendingPosts);
            updateInArray(state.bookmarkedPosts);
            updateInArray(state.threadPosts);
        },
        updateUserPostStatus: (state, action: PayloadAction<{ uri: string; isLiked?: boolean; isReposted?: boolean; isBookmarked?: boolean; timestamp?: string }>) => {
            const { uri: actionUri, timestamp, ...status } = action.payload;
            const updateInArray = (arr: Post[]) => {
                arr.forEach((p: Post) => {
                    recursivelyUpdatePost(p, actionUri, (post) => {
                        if (!timestamp || !post.lastUpdated || new Date(timestamp) >= new Date(post.lastUpdated)) {
                            Object.assign(post, status);
                            if (timestamp) post.lastUpdated = timestamp;
                        }
                    });
                });
            };
            updateInArray(state.posts);
            updateInArray(state.discoverPosts);
            updateInArray(state.trendingPosts);
            updateInArray(state.bookmarkedPosts);
            updateInArray(state.threadPosts);
        },
        removePost: (state, action: PayloadAction<string>) => {
            const postUri = action.payload;
            state.posts = state.posts.filter((p: Post) => p.uri !== postUri);
            state.discoverPosts = state.discoverPosts.filter((p: Post) => p.uri !== postUri);
            state.trendingPosts = state.trendingPosts.filter((p: Post) => p.uri !== postUri);
            state.bookmarkedPosts = state.bookmarkedPosts.filter((p: Post) => p.uri !== postUri);
        },
        receiveNewPost: (state, action: PayloadAction<Post>) => {
            const newPost = action.payload;
            // Avoid duplicates
            const exists = state.posts.some(p => p.uri === newPost.uri);
            if (!exists) {
                // Prepend to the main feed
                state.posts = [newPost, ...state.posts];
            }
        },
        clearThreadPosts: (state) => {
            state.threadPosts = [];
        },
        /**
         * Seed interactionTruth from posts fetched outside of Redux thunks
         * (e.g. ProfileTabContent which stores posts in local component state).
         * Calling this after a local fetch ensures PostCard reads the correct
         * isLiked / isReposted / isBookmarked values from the global truth store,
         * and that any stale truth from a previous timeline load is overwritten
         * with the fresher, re-enriched data from the backend.
         */
        seedInteractionTruth: (state, action: PayloadAction<Post[]>) => {
            syncPostsWithTruth(state, action.payload);
        },
        /*
468:         receiveGlobalPost: (state, action: PayloadAction<Post>) => {
469:             const newPost = action.payload;
470:             // Add to discover/trending if not exists
471:             if (!state.discoverPosts.some(p => p.uri === newPost.uri)) {
472:                 state.discoverPosts = [newPost, ...state.discoverPosts];
473:             }
474:         }
475:         */
    },

    extraReducers: (builder) => {
        builder
            // Fetch Timeline
            .addCase(fetchTimeline.pending, (state: PostsState) => {
                state.isLoading = true;
                state.timelineLoading = true;
                // Only clear if we have no posts yet, otherwise keep them until fetch completes
                if (state.posts.length === 0) {
                    state.posts = [];
                }
            })
            .addCase(fetchTimeline.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                state.timelineLoading = false;
                const { skip } = action.meta.arg;

                if (skip === 0) {
                    state.posts = action.payload.posts;
                    state.lastTimelineFetch = Date.now();
                    // Invalidate profile cache since we overwrote the shared posts array
                    state.lastUserPostsUserId = null;
                    state.lastUserPostsType = null;
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
                syncPostsWithTruth(state, action.payload.posts);
                state.hasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchTimeline.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.timelineLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Trending Posts
            .addCase(fetchTrendingPosts.pending, (state: PostsState) => {
                state.isLoading = true;
            })
            .addCase(fetchTrendingPosts.fulfilled, (state: PostsState, action: PayloadAction<Post[]>) => {
                state.isLoading = false;
                state.trendingPosts = action.payload;
                syncPostsWithTruth(state, action.payload);
            })
            .addCase(fetchTrendingPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch User Posts
            .addCase(fetchUserPosts.pending, (state: PostsState, action: any) => {
                state.isLoading = true;
                const { skip, userId } = action.meta.arg;
                // Clear only if it's the first page AND we're switching users or have no posts
                if (skip === 0 || !skip) {
                    const currentAuthorId = state.posts[0]?.author?.id;
                    if (currentAuthorId !== userId) {
                        state.posts = [];
                    }
                }
            })
            .addCase(fetchUserPosts.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const { posts, userId, cursor, type } = action.payload;
                const { skip = 0, take = 20 } = action.meta.arg || {};
                
                const dedupedFetchedPosts = dedupePostsByIdentity(posts);
                let appendedCount = 0;

                if (skip === 0) {
                    state.posts = dedupedFetchedPosts;
                    appendedCount = dedupedFetchedPosts.length;
                    state.lastUserPostsFetch = Date.now();
                    state.lastUserPostsUserId = userId;
                    state.lastUserPostsType = type || 'posts';
                } else {
                    const existingKeys = new Set(
                        state.posts
                            .map((p: Post) => getPostIdentityKey(p))
                            .filter(Boolean)
                    );
                    if (state.lastUserPostsUserId !== userId && state.lastUserPostsUserId !== null) {
                        // If the currently viewed profile user has changed, don't append stale pagination!
                        // If it's null, we might be on timeline, we definitely shouldn't append.
                    } else if (state.lastUserPostsUserId === userId) {
                        const newPosts = dedupedFetchedPosts.filter((p: Post) => {
                            const key = getPostIdentityKey(p);
                            if (!key) return true;
                            if (existingKeys.has(key)) return false;
                            existingKeys.add(key);
                            return true;
                        });
                        state.posts = [...state.posts, ...newPosts];
                        appendedCount = newPosts.length;
                    }
                }

                syncPostsWithTruth(state, posts);
                state.hasMore = posts.length >= take && appendedCount > 0;
                state.cursor = state.hasMore ? (cursor ?? String(skip + posts.length)) : null;
            })
            .addCase(fetchUserPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.lastUserPostsFetch = Date.now();
                const { userId, type } = (action.meta as any).arg || {};
                state.lastUserPostsUserId = userId;
                state.lastUserPostsType = type || 'posts';
            })
            // Create Post
            .addCase(createPost.pending, (state: PostsState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createPost.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const newPost = action.payload;

                // Override parent IDs with the URIs passed to the thunk
                // This is critical because the backend returns local GUIDs, 
                // but remote posts in our UI are identified by their AT URIs/TIDs.
                if (action.meta.arg.replyToPostId) {
                    newPost.replyToPostId = action.meta.arg.replyToPostId;
                }
                if (action.meta.arg.quotePostId) {
                    newPost.quotePostId = action.meta.arg.quotePostId;
                }

                // If backend didn't populate quotePost DTO (e.g. cache miss), look it up in local state
                if (action.meta.arg.quotePostId && !newPost.quotePost) {
                    const qid = action.meta.arg.quotePostId;
                    const findPost = (arr: Post[]) =>
                        arr.find(p =>
                            p.id === qid ||
                            p.tid === qid ||
                            (p.uri && (p.uri === qid || p.uri.endsWith('/' + qid)))
                        );
                    newPost.quotePost =
                        findPost(state.posts) ||
                        findPost(state.trendingPosts) ||
                        findPost(state.discoverPosts) ||
                        null;
                }

                // Prepend the new post to the store (avoids duplicate)
                if (!state.posts.some(p => p.uri === newPost.uri)) {
                    state.posts.unshift(newPost);
                }

                // Invalidate profile post cache so it refreshes on next navigation
                state.lastUserPostsFetch = 0;

                // Optimistically update the parent post's repliesCount
                if (newPost.replyToPostId) {
                    const updateInArray = (arr: Post[]) => {
                        const parent = arr.find(p =>
                            p.id === newPost.replyToPostId ||
                            p.tid === newPost.replyToPostId ||
                            (p.uri && (p.uri === newPost.replyToPostId || p.uri.endsWith('/' + newPost.replyToPostId)))
                        );
                        if (parent) {
                            parent.repliesCount = (parent.repliesCount || 0) + 1;
                        }
                    };
                    updateInArray(state.posts);
                    updateInArray(state.discoverPosts);
                    updateInArray(state.trendingPosts);
                }

                // Optimistically update parent's quotesCount if this is a quote
                if (newPost.quotePostId) {
                    const updateInArray = (arr: Post[]) => {
                        const quoted = arr.find(p =>
                            p.id === newPost.quotePostId ||
                            p.tid === newPost.quotePostId ||
                            (p.uri && (p.uri === newPost.quotePostId || p.uri.endsWith('/' + newPost.quotePostId)))
                        );
                        if (quoted) {
                            quoted.quotesCount = (quoted.quotesCount || 0) + 1;
                        }
                    };
                    updateInArray(state.posts);
                    updateInArray(state.discoverPosts);
                    updateInArray(state.trendingPosts);
                }
            })
            .addCase(createPost.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(toggleLike.pending, (state: PostsState, action) => {
                const { uri: actionUri } = action.meta.arg;
                state.actionLoading[actionUri] = true;

                // Optimistic Update
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isLiked: !state.interactionTruth[actionUri]?.isLiked,
                    likesCount: state.interactionTruth[actionUri]?.isLiked 
                        ? Math.max(0, (state.interactionTruth[actionUri]?.likesCount || 0) - 1) 
                        : (state.interactionTruth[actionUri]?.likesCount || 0) + 1
                };
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            const wasLiked = post.isLiked;
                            post.isLiked = !wasLiked;
                            post.likesCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
            })
            .addCase(toggleLike.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isLiked: boolean, likeUri?: string, likesCount?: number }>) => {
                const actionUri = action.payload.uri;
                state.actionLoading[actionUri] = false;
                
                // Ensure global truth is updated
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isLiked: action.payload.isLiked,
                    likesCount: action.payload.likesCount,
                    viewer: { ...state.interactionTruth[actionUri]?.viewer, like: action.payload.likeUri }
                };

                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            post.isLiked = action.payload.isLiked;
                            if (action.payload.likesCount !== undefined) post.likesCount = action.payload.likesCount;
                            if (!post.viewer) post.viewer = {};
                            post.viewer.like = action.payload.likeUri;
                            post.lastUpdated = new Date().toISOString();
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
            })
            .addCase(toggleLike.rejected, (state: PostsState, action) => {
                const { uri: actionUri } = action.meta.arg;
                state.actionLoading[actionUri] = false;

                // Rollback global truth
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isLiked: !state.interactionTruth[actionUri]?.isLiked,
                    likesCount: state.interactionTruth[actionUri]?.isLiked 
                        ? Math.max(0, (state.interactionTruth[actionUri]?.likesCount || 0) - 1) 
                        : (state.interactionTruth[actionUri]?.likesCount || 0) + 1
                };

                // Rollback on Error in arrays
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            const wasLiked = post.isLiked;
                            post.isLiked = !wasLiked;
                            post.likesCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
                state.error = action.payload as string;
            })
            .addCase(repostPost.pending, (state: PostsState, action) => {
                const { uri: actionUri } = action.meta.arg;
                state.actionLoading[actionUri] = true;

                // Optimistic Update
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isReposted: !state.interactionTruth[actionUri]?.isReposted,
                    repostsCount: state.interactionTruth[actionUri]?.isReposted 
                        ? Math.max(0, (state.interactionTruth[actionUri]?.repostsCount || 0) - 1) 
                        : (state.interactionTruth[actionUri]?.repostsCount || 0) + 1
                };
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            const wasReposted = post.isReposted;
                            post.isReposted = !wasReposted;
                            post.repostsCount = wasReposted ? Math.max(0, post.repostsCount - 1) : post.repostsCount + 1;
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
            })
            .addCase(repostPost.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isReposted: boolean, repostUri?: string, repostsCount?: number }>) => {
                const actionUri = action.payload.uri;
                state.actionLoading[actionUri] = false;

                // Ensure global truth is updated
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isReposted: action.payload.isReposted,
                    repostsCount: action.payload.repostsCount,
                    viewer: { ...state.interactionTruth[actionUri]?.viewer, repost: action.payload.repostUri }
                };

                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            post.isReposted = action.payload.isReposted;
                            if (action.payload.repostsCount !== undefined) post.repostsCount = action.payload.repostsCount;
                            if (!post.viewer) post.viewer = {};
                            post.viewer.repost = action.payload.repostUri;
                            post.lastUpdated = new Date().toISOString();
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
                // Invalidate profile post cache so reposts appear/disappear on next profile visit
                state.lastUserPostsFetch = 0;
            })
            .addCase(repostPost.rejected, (state: PostsState, action) => {
                const { uri: actionUri } = action.meta.arg;
                state.actionLoading[actionUri] = false;

                // Rollback global truth
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isReposted: !state.interactionTruth[actionUri]?.isReposted,
                    repostsCount: state.interactionTruth[actionUri]?.isReposted 
                        ? Math.max(0, (state.interactionTruth[actionUri]?.repostsCount || 0) - 1) 
                        : (state.interactionTruth[actionUri]?.repostsCount || 0) + 1
                };

                // Rollback in arrays
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            const wasReposted = post.isReposted;
                            post.isReposted = !wasReposted;
                            post.repostsCount = wasReposted ? Math.max(0, post.repostsCount - 1) : post.repostsCount + 1;
                        });
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
            })
            // Update Post
            .addCase(updatePost.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updatePost.fulfilled, (state, action) => {
                state.isLoading = false;
                const updatedPost = action.payload;
                const updateInArray = (arr: Post[]) => {
                    const index = arr.findIndex(p => p.id === updatedPost.id);
                    if (index !== -1) {
                        arr[index] = { ...arr[index], ...updatedPost };
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(updatePost.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Delete Post
            .addCase(deletePost.fulfilled, (state: PostsState, action: PayloadAction<string>) => {
                const deletedUri = action.payload; // original postUri passed in
                // Extract TID/ID from the URI for broader matching
                const deletedId = deletedUri.includes('/') ? deletedUri.split('/').pop()! : deletedUri;
                const matchesPost = (p: Post) =>
                    p.uri === deletedUri ||
                    (deletedId && (p.tid === deletedId || p.id === deletedId)) ||
                    (p.uri && p.uri.endsWith('/' + deletedId));
                state.posts = state.posts.filter((p: Post) => !matchesPost(p));
                state.discoverPosts = state.discoverPosts.filter((p: Post) => !matchesPost(p));
                state.trendingPosts = state.trendingPosts.filter((p: Post) => !matchesPost(p));
                state.bookmarkedPosts = state.bookmarkedPosts.filter((p: Post) => !matchesPost(p));
                state.threadPosts = state.threadPosts.filter((p: Post) => !matchesPost(p));
                // Invalidate profile post cache so it re-fetches on next navigation
                state.lastUserPostsFetch = 0;
            })
            // Fetch Post By ID
            .addCase(fetchPostById.pending, (state: PostsState) => {
                state.isLoading = true;
                state.threadError = null;
            })
            .addCase(fetchPostById.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const fetchedPosts: Post[] = Array.isArray(action.payload) ? action.payload : [action.payload];
                fetchedPosts.forEach(fetchedPost => {
                    // Deduplicate by URI or ID (if ID is not empty)
                    const index = state.threadPosts.findIndex(p =>
                        (fetchedPost.uri && p.uri === fetchedPost.uri) ||
                        (fetchedPost.id && p.id === fetchedPost.id && fetchedPost.id !== '')
                    );

                    if (index !== -1) {
                        const existingPost = state.threadPosts[index];
                        state.threadPosts[index] = mergePostSnapshot(existingPost, fetchedPost);
                    } else {
                        state.threadPosts.push(fetchedPost);
                    }
                });
            })
            .addCase(fetchPostById.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.threadError = action.payload as string;
            })
            // toggleBookmark
            .addCase(toggleBookmark.pending, (state: PostsState, action) => {
                const { uri: actionUri } = action.meta.arg;
                state.actionLoading[actionUri] = true;

                // Optimistic Update
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isBookmarked: !state.interactionTruth[actionUri]?.isBookmarked,
                    bookmarksCount: state.interactionTruth[actionUri]?.isBookmarked 
                        ? Math.max(0, (state.interactionTruth[actionUri]?.bookmarksCount || 0) - 1) 
                        : (state.interactionTruth[actionUri]?.bookmarksCount || 0) + 1
                };
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            const wasBookmarked = post.isBookmarked;
                            post.isBookmarked = !wasBookmarked;
                            post.bookmarksCount = wasBookmarked ? Math.max(0, post.bookmarksCount - 1) : post.bookmarksCount + 1;
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
            })
            .addCase(toggleBookmark.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isBookmarked: boolean, bookmarksCount?: number }>) => {
                const actionUri = action.payload.uri;
                state.actionLoading[actionUri] = false;
                
                // Ensure global truth is updated even if not in any tracked array
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isBookmarked: action.payload.isBookmarked,
                    bookmarksCount: action.payload.bookmarksCount
                };

                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            post.isBookmarked = action.payload.isBookmarked;
                            if (action.payload.bookmarksCount !== undefined) post.bookmarksCount = action.payload.bookmarksCount;
                            post.lastUpdated = new Date().toISOString();
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);

                // If unbookmarked, remove from bookmarkedPosts array
                if (!action.payload.isBookmarked) {
                    state.bookmarkedPosts = state.bookmarkedPosts.filter(p => p.uri !== action.payload.uri);
                }
            })
            .addCase(toggleBookmark.rejected, (state: PostsState, action) => {
                const { uri: actionUri } = action.meta.arg;
                state.actionLoading[actionUri] = false;

                // Rollback global truth
                state.interactionTruth[actionUri] = {
                    ...state.interactionTruth[actionUri],
                    isBookmarked: !state.interactionTruth[actionUri]?.isBookmarked,
                    bookmarksCount: state.interactionTruth[actionUri]?.isBookmarked 
                        ? Math.max(0, (state.interactionTruth[actionUri]?.bookmarksCount || 0) - 1) 
                        : (state.interactionTruth[actionUri]?.bookmarksCount || 0) + 1
                };

                // Rollback in arrays
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, actionUri, (post) => {
                            const wasBookmarked = post.isBookmarked;
                            post.isBookmarked = !wasBookmarked;
                            post.bookmarksCount = wasBookmarked ? Math.max(0, post.bookmarksCount - 1) : post.bookmarksCount + 1;
                        }, state);
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                updateInArray(state.threadPosts);
            })
            // Fetch Bookmarked Posts
            .addCase(fetchBookmarkedPosts.pending, (state: PostsState, action: any) => {
                state.bookmarkedLoading = true;
                state.bookmarkedError = null;
            })
            .addCase(fetchBookmarkedPosts.fulfilled, (state: PostsState, action: any) => {
                state.bookmarkedLoading = false;
                state.bookmarkedError = null;
                const { skip } = action.meta.arg || { skip: 0 };

                if (skip === 0) {
                    state.bookmarkedPosts = action.payload.posts;
                } else {
                    const existingUris = new Set(state.bookmarkedPosts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.bookmarkedPosts = [...state.bookmarkedPosts, ...newPosts];
                }
                syncPostsWithTruth(state, action.payload.posts);
                state.hasMore = action.payload.cursor !== null;
            })
            .addCase(fetchBookmarkedPosts.rejected, (state: PostsState, action) => {
                state.bookmarkedLoading = false;
                state.bookmarkedError = action.payload as string;
            })
            // Fetch Posts By Tag
            .addCase(fetchPostsByTag.pending, (state: PostsState, action: any) => {
                state.isLoading = true;
                const { skip } = action.meta.arg;
                if (skip === 0 || !skip) {
                    state.posts = [];
                    state.lastUserPostsUserId = null;
                    state.lastUserPostsType = null;
                }
            })
            .addCase(fetchPostsByTag.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const { skip } = action.meta.arg;
                if (skip === 0 || !skip) {
                    state.posts = action.payload.posts;
                    state.lastUserPostsUserId = null;
                    state.lastUserPostsType = null;
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
                syncPostsWithTruth(state, action.payload.posts);
                state.hasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchPostsByTag.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Posts Search
            .addCase(fetchPostsSearch.pending, (state: PostsState, action: any) => {
                state.isLoading = true;
                const { skip } = action.meta.arg;
                if (skip === 0 || !skip) {
                    state.posts = [];
                    state.lastUserPostsUserId = null;
                    state.lastUserPostsType = null;
                }
            })
            .addCase(fetchPostsSearch.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const { skip } = action.meta.arg;
                if (skip === 0) {
                    state.posts = action.payload.posts;
                    state.lastUserPostsUserId = null;
                    state.lastUserPostsType = null;
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
                syncPostsWithTruth(state, action.payload.posts);
                state.hasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchPostsSearch.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Discover Posts
            .addCase(fetchDiscoverPosts.pending, (state: PostsState, action: any) => {
                state.isLoading = true;
                state.discoverLoading = true;
                const { skip } = action.meta.arg || { skip: 0 };
                if (skip === 0) {
                    state.discoverPosts = [];
                }
            })
            .addCase(fetchDiscoverPosts.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                state.discoverLoading = false;
                const { skip } = action.meta.arg || { skip: 0 };

                if (skip === 0) {
                    state.discoverPosts = action.payload.posts;
                    state.lastDiscoverFetch = Date.now();
                } else {
                    const existingUris = new Set(state.discoverPosts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.discoverPosts = [...state.discoverPosts, ...newPosts];
                }
                syncPostsWithTruth(state, action.payload.posts);
                state.discoverHasMore = action.payload.hasMore;
            })
            .addCase(fetchDiscoverPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.discoverLoading = false;
                state.error = action.payload as string;
            })


            .addCase(deletePost.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update Interaction Settings
            .addCase(updateInteractionSettings.pending, (state: PostsState, action) => {
                state.isLoading = true;
                state.error = null;

                // Optimistic Update
                const { postUri, replyRestriction, allowQuotes } = action.meta.arg;
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, postUri, (post) => {
                            post.replyRestriction = replyRestriction;
                            post.allowQuotes = allowQuotes;
                        });
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.threadPosts);
            })
            .addCase(updateInteractionSettings.fulfilled, (state: PostsState, action: PayloadAction<{ postUri: string, replyRestriction: string, allowQuotes: boolean }>) => {
                state.isLoading = false;
                const { postUri, replyRestriction, allowQuotes } = action.payload;
                const updateInArray = (arr: Post[]) => {
                    arr.forEach(p => {
                        recursivelyUpdatePost(p, postUri, (post) => {
                            post.replyRestriction = replyRestriction;
                            post.allowQuotes = allowQuotes;
                        });
                    });
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.threadPosts);
            })
            .addCase(updateInteractionSettings.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                // Note: Rollback logic could be added here if we stored previous state,
                // but for interaction settings, showing an error toast is usually sufficient.
            })
            // Pin Post
            .addCase(pinPost.fulfilled, (state, action) => {
                const pinnedUri = action.payload;
                const updatePinned = (arr: Post[]) => {
                    arr.forEach(p => {
                        // For pinning, we clear pinned status for ALL posts first, then set it for the one.
                        p.isPinned = (p.uri === pinnedUri || p.id === pinnedUri || p.tid === pinnedUri);
                        if (p.uri === pinnedUri) updateInteractionTruth(state, p);
                        if (p.parentPost) recursivelyUpdatePost(p.parentPost, pinnedUri, (post) => { post.isPinned = true; }, state);
                        if (p.quotePost) recursivelyUpdatePost(p.quotePost, pinnedUri, (post) => { post.isPinned = true; }, state);
                    });
                };
                updatePinned(state.posts);
                updatePinned(state.discoverPosts);
                updatePinned(state.trendingPosts);
            })
            // Unpin Post
            .addCase(unpinPost.fulfilled, (state) => {
                const clearPinned = (arr: Post[]) => {
                    arr.forEach(p => {
                        p.isPinned = false;
                    });
                };
                clearPinned(state.posts);
                clearPinned(state.discoverPosts);
                clearPinned(state.trendingPosts);
            })
            // Synchronize Profile Updates
            .addMatcher(
                (action) => action.type.endsWith('/updateProfile/fulfilled'),
                (state: PostsState, action: any) => {
                    const updatedUser = action.payload;
                    if (!updatedUser || !updatedUser.id) return;

                    const updateAuthorInArray = (arr: Post[]) => {
                        arr.forEach(post => {
                            if (userMatchesIdentifier(post.author, updatedUser.id) || userMatchesIdentifier(post.author, updatedUser.did) || userMatchesIdentifier(post.author, updatedUser.handle)) {
                                post.author = { ...post.author, ...updatedUser };
                            }
                            if (post.repostedBy && (userMatchesIdentifier(post.repostedBy, updatedUser.id) || userMatchesIdentifier(post.repostedBy, updatedUser.did) || userMatchesIdentifier(post.repostedBy, updatedUser.handle))) {
                                post.repostedBy = { ...post.repostedBy, ...updatedUser };
                            }
                        });
                    };

                    updateAuthorInArray(state.posts);
                    updateAuthorInArray(state.discoverPosts);
                    updateAuthorInArray(state.trendingPosts);
                    updateAuthorInArray(state.bookmarkedPosts);
                }
            )
            .addMatcher(
                (action) => action.type === 'user/follow/pending',
                (state: PostsState, action: any) => {
                    const identifier = action.meta?.arg as string;
                    if (!identifier) return;

                    applyFollowStateToPosts(state.posts, identifier, true);
                    applyFollowStateToPosts(state.threadPosts, identifier, true);
                    applyFollowStateToPosts(state.discoverPosts, identifier, true);
                    applyFollowStateToPosts(state.trendingPosts, identifier, true);
                    applyFollowStateToPosts(state.bookmarkedPosts, identifier, true);
                }
            )
            .addMatcher(
                (action) => action.type === 'user/follow/fulfilled',
                (state: PostsState, action: any) => {
                    const identifier = action.meta?.arg as string;
                    const followUri = action.payload?.uri as string | undefined;
                    if (!identifier) return;

                    applyFollowStateToPosts(state.posts, identifier, true, followUri);
                    applyFollowStateToPosts(state.threadPosts, identifier, true, followUri);
                    applyFollowStateToPosts(state.discoverPosts, identifier, true, followUri);
                    applyFollowStateToPosts(state.trendingPosts, identifier, true, followUri);
                    applyFollowStateToPosts(state.bookmarkedPosts, identifier, true, followUri);
                }
            )
            .addMatcher(
                (action) => action.type === 'user/follow/rejected',
                (state: PostsState, action: any) => {
                    const identifier = action.meta?.arg as string;
                    if (!identifier) return;

                    applyFollowStateToPosts(state.posts, identifier, false);
                    applyFollowStateToPosts(state.threadPosts, identifier, false);
                    applyFollowStateToPosts(state.discoverPosts, identifier, false);
                    applyFollowStateToPosts(state.trendingPosts, identifier, false);
                    applyFollowStateToPosts(state.bookmarkedPosts, identifier, false);
                }
            )
            .addMatcher(
                (action) => action.type === 'user/unfollow/pending',
                (state: PostsState, action: any) => {
                    const identifier = action.meta?.arg?.userId as string;
                    if (!identifier) return;

                    applyFollowStateToPosts(state.posts, identifier, false);
                    applyFollowStateToPosts(state.threadPosts, identifier, false);
                    applyFollowStateToPosts(state.discoverPosts, identifier, false);
                    applyFollowStateToPosts(state.trendingPosts, identifier, false);
                    applyFollowStateToPosts(state.bookmarkedPosts, identifier, false);
                }
            )
            .addMatcher(
                (action) => action.type === 'user/unfollow/fulfilled',
                (state: PostsState, action: any) => {
                    const identifier = action.meta?.arg?.userId as string;
                    if (!identifier) return;

                    applyFollowStateToPosts(state.posts, identifier, false);
                    applyFollowStateToPosts(state.threadPosts, identifier, false);
                    applyFollowStateToPosts(state.discoverPosts, identifier, false);
                    applyFollowStateToPosts(state.trendingPosts, identifier, false);
                    applyFollowStateToPosts(state.bookmarkedPosts, identifier, false);
                }
            )
            .addMatcher(
                (action) => action.type === 'user/unfollow/rejected',
                (state: PostsState, action: any) => {
                    const identifier = action.meta?.arg?.userId as string;
                    if (!identifier) return;

                    applyFollowStateToPosts(state.posts, identifier, true);
                    applyFollowStateToPosts(state.threadPosts, identifier, true);
                    applyFollowStateToPosts(state.discoverPosts, identifier, true);
                    applyFollowStateToPosts(state.trendingPosts, identifier, true);
                    applyFollowStateToPosts(state.bookmarkedPosts, identifier, true);
                }
            );
    },
});


export const { clearPosts, clearThreadPosts, updatePostStats, updateUserPostStatus, removePost, receiveNewPost, seedInteractionTruth } = postsSlice.actions;


export default postsSlice.reducer;
