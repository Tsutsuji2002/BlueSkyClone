import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PostsState, Post } from '../../types';
import { API_BASE_URL } from '../../constants';
import { mapAtProtoPostToPost } from '../../utils/postMapper';

const initialState: PostsState = {
    posts: [],
    discoverPosts: [],
    trendingPosts: [],
    bookmarkedPosts: [],
    isLoading: false,
    timelineLoading: false,
    discoverLoading: false,
    bookmarkedLoading: false,
    error: null,
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
};

export const fetchTimeline = createAsyncThunk(
    'posts/fetchTimeline',
    async ({ skip = 0, take = 20 }: { skip?: number; take?: number; cursor?: string } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/posts/timeline?skip=${skip}&take=${take}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch timeline');
            const posts: Post[] = await response.json();
            return { posts, skip, cursor: null };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserPosts = createAsyncThunk(
    'posts/fetchUserPosts',
    async ({ userId, type, take = 20, skip = 0 }: { userId: string; type?: string; take?: number; skip?: number; cursor?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({ take: String(take), skip: String(skip) });
            if (type) params.set('type', type);
            const response = await fetch(
                `${API_BASE_URL}/posts/user/${userId}?${params}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch user posts');
            const posts: Post[] = await response.json();
            return { posts, userId, cursor: null, type };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);



// updatePost removed as AT Protocol usually handles updates by deleting and re-creating or specific field updates in some CMS, but not the standard post flow.

export const updatePost = createAsyncThunk(
    'posts/updatePost',
    async ({ id, content, mediaFiles, videoFile, linkPreview, gifUrl, existingMediaIdsToKeep }: { id: string; content: string; mediaFiles?: File[]; videoFile?: File; linkPreview?: any; gifUrl?: string; existingMediaIdsToKeep?: string[] }, { rejectWithValue }) => {
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
    async (postData: { content: string; replyTo?: any; mediaFiles?: File[]; videoFile?: File; linkPreview?: any; gifUrl?: string; replyToPostId?: string }, { rejectWithValue, getState }) => {
        try {
            const state = getState() as any;
            const user = state.auth.user;
            const token = localStorage.getItem('token');

            const formData = new FormData();
            formData.append('Content', postData.content);
            if (postData.replyToPostId) formData.append('ReplyToPostId', postData.replyToPostId);
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
            const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
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
            const response = await fetch(
                `${API_BASE_URL}/posts/tag/${encodeURIComponent(tag)}?take=${take}&skip=${skip}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
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
            const response = await fetch(
                `${API_BASE_URL}/search/posts?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
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
            
            const response = await fetch(
                endpoint,
                { headers: { 'Authorization': `Bearer ${token}` } }
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
                return Array.from(postsMap.values());
            }

            return Array.isArray(data) ? data.map(mapAtProtoPostToPost) : [mapAtProtoPostToPost(data)];
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);


// fetchPostReplies removed as replies are included in getPostThread

export const fetchTrendingPosts = createAsyncThunk(
    'posts/fetchTrending',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/posts/trending`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch trending');
            return await response.json() as Post[];
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

export const fetchBookmarkedPosts = createAsyncThunk(
    'posts/fetchBookmarks',
    async ({ skip = 0, take = 20 }: { skip?: number; take?: number } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/posts/bookmarks?skip=${skip}&take=${take}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch bookmarks');
            return await response.json() as Post[];
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDiscoverPosts = createAsyncThunk(
    'posts/fetchDiscover',
    async ({ skip = 0, take = 15 }: { skip?: number; take?: number; cursor?: string } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${API_BASE_URL}/posts/trending?skip=${skip}&take=${take}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (!response.ok) return rejectWithValue('Failed to fetch discover feed');
            const posts: Post[] = await response.json();
            return { posts, skip, cursor: null };
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
        },
        updatePostStats: (state, action: PayloadAction<{ uri: string; likesCount: number; repostsCount: number; bookmarksCount: number; repliesCount: number; quotesCount: number; timestamp?: string }>) => {
            const { uri, timestamp, ...stats } = action.payload;
            const updateInArray = (arr: Post[]) => {
                const post = arr.find((p: Post) => p.uri === uri);
                if (post) {
                    const isRemote = post.uri && !post.uri.includes('localhost') && !post.uri.includes('staging') && post.uri.includes('at://');
                    if (!timestamp || !post.lastUpdated || new Date(timestamp) >= new Date(post.lastUpdated)) {
                        if (stats.likesCount !== undefined) {
                            post.likesCount = isRemote ? Math.max(post.likesCount, stats.likesCount) : stats.likesCount;
                        }
                        if (stats.repostsCount !== undefined) {
                            post.repostsCount = isRemote ? Math.max(post.repostsCount, stats.repostsCount) : stats.repostsCount;
                        }
                        if (stats.bookmarksCount !== undefined) {
                            post.bookmarksCount = isRemote ? Math.max(post.bookmarksCount, stats.bookmarksCount) : stats.bookmarksCount;
                        }
                        if (stats.repliesCount !== undefined) {
                            post.repliesCount = isRemote ? Math.max(post.repliesCount, stats.repliesCount) : stats.repliesCount;
                        }
                        if (stats.quotesCount !== undefined) {
                            post.quotesCount = isRemote ? Math.max(post.quotesCount, stats.quotesCount) : stats.quotesCount;
                        }
                        if (timestamp) post.lastUpdated = timestamp;
                    }
                }
            };
            updateInArray(state.posts);
            updateInArray(state.discoverPosts);
            updateInArray(state.trendingPosts);
            updateInArray(state.bookmarkedPosts);
        },
        updateUserPostStatus: (state, action: PayloadAction<{ uri: string; isLiked?: boolean; isReposted?: boolean; isBookmarked?: boolean; timestamp?: string }>) => {
            const { uri, timestamp, ...status } = action.payload;
            const updateInArray = (arr: Post[]) => {
                const post = arr.find((p: Post) => p.uri === uri);
                if (post) {
                    if (!timestamp || !post.lastUpdated || new Date(timestamp) >= new Date(post.lastUpdated)) {
                        Object.assign(post, status);
                        if (timestamp) post.lastUpdated = timestamp;
                    }
                }
            };
            updateInArray(state.posts);
            updateInArray(state.discoverPosts);
            updateInArray(state.trendingPosts);
            updateInArray(state.bookmarkedPosts);
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
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
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
                const { skip } = action.meta.arg;

                if (skip === 0) {
                    state.posts = posts;
                    state.lastUserPostsFetch = Date.now();
                    state.lastUserPostsUserId = userId;
                    state.lastUserPostsType = type || 'posts';
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
                state.cursor = cursor;
                state.hasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchUserPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
                state.lastUserPostsFetch = Date.now(); // Mark as attempted to prevent infinite loop
            })
            // Create Post
            .addCase(createPost.pending, (state: PostsState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(createPost.fulfilled, (state: PostsState, action: PayloadAction<Post>) => {
                state.isLoading = false;
                state.posts.unshift(action.payload);
                // Optimistic replies/quotes count updates would need parent post URI
            })
            .addCase(createPost.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(toggleLike.pending, (state: PostsState, action) => {
                const { uri } = action.meta.arg;
                state.actionLoading[uri] = true;

                // Optimistic Update
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === uri);
                    if (post) {
                        const wasLiked = post.isLiked;
                        post.isLiked = !wasLiked;
                        post.likesCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
            })
            .addCase(toggleLike.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isLiked: boolean, likeUri?: string, likesCount?: number }>) => {
                state.actionLoading[action.payload.uri] = false;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === action.payload.uri);
                    if (post) {
                        post.isLiked = action.payload.isLiked;
                        // Keep optimistic count, do not overwrite with backend local count
                        // We store the like record URI in the viewer object to allow deletion later
                        if (!post.viewer) post.viewer = {};
                        post.viewer.like = action.payload.likeUri;
                        post.lastUpdated = new Date().toISOString();
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
            })
            .addCase(toggleLike.rejected, (state: PostsState, action) => {
                const { uri } = action.meta.arg;
                state.actionLoading[uri] = false;

                // Rollback on Error
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === uri);
                    if (post) {
                        const wasLiked = post.isLiked;
                        post.isLiked = !wasLiked;
                        post.likesCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
                state.error = action.payload as string;
            })
            .addCase(repostPost.pending, (state: PostsState, action) => {
                const { uri } = action.meta.arg;
                state.actionLoading[uri] = true;

                // Optimistic Update
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === uri);
                    if (post) {
                        const wasReposted = post.isReposted;
                        post.isReposted = !wasReposted;
                        post.repostsCount = wasReposted ? Math.max(0, post.repostsCount - 1) : post.repostsCount + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
            })
            .addCase(repostPost.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isReposted: boolean, repostUri?: string, repostsCount?: number }>) => {
                state.actionLoading[action.payload.uri] = false;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === action.payload.uri);
                    if (post) {
                        post.isReposted = action.payload.isReposted;
                        // Keep optimistic count, do not overwrite with backend local count
                        if (!post.viewer) post.viewer = {};
                        post.viewer.repost = action.payload.repostUri;
                        post.lastUpdated = new Date().toISOString();
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
            })
            .addCase(repostPost.rejected, (state: PostsState, action) => {
                const { uri } = action.meta.arg;
                state.actionLoading[uri] = false;

                // Rollback
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === uri);
                    if (post) {
                        const wasReposted = post.isReposted;
                        post.isReposted = !wasReposted;
                        post.repostsCount = wasReposted ? Math.max(0, post.repostsCount - 1) : post.repostsCount + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
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
                state.lastUpdated = new Date().toISOString();
            })
            .addCase(updatePost.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Delete Post
            .addCase(deletePost.fulfilled, (state: PostsState, action: PayloadAction<string>) => {
                const deletedUri = action.payload;
                state.posts = state.posts.filter((p: Post) => p.uri !== deletedUri);
                state.discoverPosts = state.discoverPosts.filter((p: Post) => p.uri !== deletedUri);
                state.trendingPosts = state.trendingPosts.filter((p: Post) => p.uri !== deletedUri);
            })
            // Fetch Post By ID
            .addCase(fetchPostById.pending, (state: PostsState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPostById.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const fetchedPosts: Post[] = Array.isArray(action.payload) ? action.payload : [action.payload];
                fetchedPosts.forEach(fetchedPost => {
                    const index = state.posts.findIndex(p => p.uri === fetchedPost.uri);
                    if (index !== -1) {
                        state.posts[index] = { ...state.posts[index], ...fetchedPost };
                    } else {
                        state.posts.push(fetchedPost);
                    }
                });
            })
            .addCase(fetchPostById.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // toggleBookmark
            .addCase(toggleBookmark.pending, (state: PostsState, action) => {
                const { uri } = action.meta.arg;
                state.actionLoading[uri] = true;

                // Optimistic Update
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === uri);
                    if (post) {
                        const wasBookmarked = post.isBookmarked;
                        post.isBookmarked = !wasBookmarked;
                        post.bookmarksCount = wasBookmarked ? Math.max(0, post.bookmarksCount - 1) : post.bookmarksCount + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
            })
            .addCase(toggleBookmark.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isBookmarked: boolean, bookmarksCount?: number }>) => {
                state.actionLoading[action.payload.uri] = false;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === action.payload.uri);
                    if (post) {
                        post.isBookmarked = action.payload.isBookmarked;
                        if (action.payload.bookmarksCount !== undefined) post.bookmarksCount = action.payload.bookmarksCount;
                        post.lastUpdated = new Date().toISOString();
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);

                // If unbookmarked, remove from bookmarkedPosts array
                if (!action.payload.isBookmarked) {
                    state.bookmarkedPosts = state.bookmarkedPosts.filter(p => p.uri !== action.payload.uri);
                }
            })
            .addCase(toggleBookmark.rejected, (state: PostsState, action) => {
                const { uri } = action.meta.arg;
                state.actionLoading[uri] = false;

                // Rollback
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === uri);
                    if (post) {
                        const wasBookmarked = post.isBookmarked;
                        post.isBookmarked = !wasBookmarked;
                        post.bookmarksCount = wasBookmarked ? Math.max(0, post.bookmarksCount - 1) : post.bookmarksCount + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
                updateInArray(state.bookmarkedPosts);
            })
            // Fetch Bookmarked Posts
            .addCase(fetchBookmarkedPosts.pending, (state: PostsState, action: any) => {
                state.bookmarkedLoading = true;
                const { skip } = action.meta.arg || { skip: 0 };
                if (skip === 0) {
                    state.bookmarkedPosts = [];
                }
            })
            .addCase(fetchBookmarkedPosts.fulfilled, (state: PostsState, action: any) => {
                state.bookmarkedLoading = false;
                const { skip } = action.meta.arg || { skip: 0 };
                if (skip === 0) {
                    state.bookmarkedPosts = action.payload;
                } else {
                    const existingUris = new Set(state.bookmarkedPosts.map((p: Post) => p.uri));
                    const newPosts = action.payload.filter((p: Post) => !existingUris.has(p.uri));
                    state.bookmarkedPosts = [...state.bookmarkedPosts, ...newPosts];
                }
                state.hasMore = action.payload.length > 0;
            })
            .addCase(fetchBookmarkedPosts.rejected, (state: PostsState, action) => {
                state.bookmarkedLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Posts By Tag
            .addCase(fetchPostsByTag.pending, (state: PostsState, action: any) => {
                state.isLoading = true;
                const { skip } = action.meta.arg;
                if (skip === 0 || !skip) {
                    state.posts = [];
                }
            })
            .addCase(fetchPostsByTag.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const { skip } = action.meta.arg;
                if (skip === 0 || !skip) {
                    state.posts = action.payload.posts;
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
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
                }
            })
            .addCase(fetchPostsSearch.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                const { skip } = action.meta.arg;
                if (skip === 0) {
                    state.posts = action.payload.posts;
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
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
                const { take = 15 } = action.meta.arg || {};
                state.discoverHasMore = action.payload.posts.length >= take;
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
            .addCase(updateInteractionSettings.pending, (state: PostsState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateInteractionSettings.fulfilled, (state: PostsState, action: PayloadAction<{ postUri: string, replyRestriction: string, allowQuotes: boolean }>) => {
                state.isLoading = false;
                const { postUri, replyRestriction, allowQuotes } = action.payload;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === postUri);
                    if (post) {
                        post.replyRestriction = replyRestriction;
                        post.allowQuotes = allowQuotes;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(updateInteractionSettings.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Synchronize Profile Updates
            .addMatcher(
                (action) => action.type.endsWith('/updateProfile/fulfilled'),
                (state: PostsState, action: any) => {
                    const updatedUser = action.payload;
                    if (!updatedUser || !updatedUser.id) return;

                    const updateAuthorInArray = (arr: Post[]) => {
                        arr.forEach(post => {
                            if (post.author && post.author.id === updatedUser.id) {
                                post.author = { ...post.author, ...updatedUser };
                            }
                            if (post.repostedBy && post.repostedBy.id === updatedUser.id) {
                                post.repostedBy = { ...post.repostedBy, ...updatedUser };
                            }
                        });
                    };

                    updateAuthorInArray(state.posts);
                    updateAuthorInArray(state.discoverPosts);
                    updateAuthorInArray(state.trendingPosts);
                    updateAuthorInArray(state.bookmarkedPosts);
                }
            );
    }
});


export const { clearPosts, updatePostStats, updateUserPostStatus, removePost, receiveNewPost } = postsSlice.actions;


export default postsSlice.reducer;

