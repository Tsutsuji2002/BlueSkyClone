import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PostsState, Post } from '../../types';
import agent from '../../services/atpAgent';

const initialState: PostsState = {
    posts: [],
    discoverPosts: [],
    trendingPosts: [],
    isLoading: false,
    timelineLoading: false,
    discoverLoading: false,
    error: null,
    hasMore: true,
    discoverHasMore: true,
    actionLoading: {},
    lastTimelineFetch: 0,
    lastDiscoverFetch: 0,
    cursor: null,
    discoverCursor: null,
};

export const fetchTimeline = createAsyncThunk(
    'posts/fetchTimeline',
    async ({ skip = 0, take = 20, cursor }: { skip?: number; take?: number; cursor?: string } = {}, { rejectWithValue }) => {
        try {
            const response = await agent.getTimeline({
                cursor: cursor || (skip > 0 ? skip.toString() : undefined),
                limit: take
            });

            if (!response.success) return rejectWithValue('Failed to fetch timeline');

            // Map FeedViewPost to our internal Post type
            const posts: Post[] = response.data.feed.map((item: any) => {
                const postView = item.post;
                const record = postView.record as any;

                return {
                    id: postView.uri.split('/').pop() || '',
                    cid: postView.cid,
                    author: {
                        id: postView.author.did,
                        did: postView.author.did,
                        handle: postView.author.handle,
                        username: postView.author.handle, // Map handle to username for compatibility
                        displayName: postView.author.displayName || postView.author.handle,
                        avatarUrl: postView.author.avatar
                    },
                    content: record.text,
                    createdAt: record.createdAt,
                    likesCount: postView.likeCount || 0,
                    repostsCount: postView.repostCount || 0,
                    repliesCount: postView.replyCount || 0,
                    quotesCount: postView.quoteCount || 0,
                    bookmarksCount: 0,
                    isLiked: !!postView.viewer?.like,
                    isReposted: !!postView.viewer?.repost,
                    tid: postView.uri.split('/').pop() || ''
                } as Post;
            });

            return { posts, skip, cursor: response.data.cursor };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserPosts = createAsyncThunk(
    'posts/fetchUserPosts',
    async ({ userId, limit = 20, cursor }: { userId: string; type?: string; limit?: number; offset?: number; cursor?: string }, { rejectWithValue }) => {
        try {
            const response = await agent.getAuthorFeed({
                actor: userId,
                limit,
                cursor
            });

            if (!response.success) return rejectWithValue('Failed to fetch author feed');

            const posts: Post[] = response.data.feed.map((item: any) => {
                const postView = item.post;
                const record = postView.record as any;

                return {
                    id: postView.uri.split('/').pop() || '',
                    uri: postView.uri,
                    cid: postView.cid,
                    author: {
                        id: postView.author.did,
                        did: postView.author.did,
                        handle: postView.author.handle,
                        username: postView.author.handle,
                        displayName: postView.author.displayName || postView.author.handle,
                        avatarUrl: postView.author.avatar
                    },
                    content: record.text,
                    createdAt: record.createdAt,
                    likesCount: postView.likeCount || 0,
                    repostsCount: postView.repostCount || 0,
                    repliesCount: postView.replyCount || 0,
                    quotesCount: postView.quoteCount || 0,
                    bookmarksCount: 0,
                    isLiked: !!postView.viewer?.like,
                    isReposted: !!postView.viewer?.repost,
                    tid: postView.uri.split('/').pop() || '',
                    viewer: postView.viewer
                } as Post;
            });

            return { posts, userId, cursor: response.data.cursor };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);



// updatePost removed as AT Protocol usually handles updates by deleting and re-creating or specific field updates in some CMS, but not the standard post flow.

export const createPost = createAsyncThunk(
    'posts/createPost',
    async (postData: { content: string; replyTo?: any; embed?: any }, { rejectWithValue, getState }) => {
        try {
            const state = getState() as any;
            const user = state.auth.user;

            const response = await agent.post({
                text: postData.content,
                reply: postData.replyTo,
                embed: postData.embed,
                createdAt: new Date().toISOString()
            });

            // Return a full Post object to satisfy the Reducer and UI
            return {
                id: response.uri.split('/').pop() || '',
                uri: response.uri,
                cid: response.cid,
                content: postData.content,
                createdAt: new Date().toISOString(),
                author: {
                    id: user?.id || '',
                    did: user?.did || '',
                    handle: user?.handle || '',
                    username: user?.username || '',
                    displayName: user?.displayName || '',
                    avatarUrl: user?.avatarUrl || user?.avatar
                },
                likesCount: 0,
                repostsCount: 0,
                repliesCount: 0,
                quotesCount: 0,
                bookmarksCount: 0,
                isLiked: false,
                isReposted: false,
                isBookmarked: false,
                tid: response.uri.split('/').pop() || ''
            } as Post;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to create post');
        }
    }
);

export const toggleLike = createAsyncThunk(
    'posts/toggleLike',
    async ({ uri, cid, isLiked }: { uri: string; cid: string; isLiked: boolean }, { rejectWithValue }) => {
        try {
            if (isLiked) {
                // We need the like URI to delete it. Usually stored in post.viewer.like
                // If we don't have it, we might need to fetch it or the agent handles it if we pass the right thing.
                // But typically AtpAgent expects the URI of the like record.
                await agent.deleteLike(uri);
                return { uri, isLiked: false };
            } else {
                const response = await agent.like(uri, cid);
                return { uri, isLiked: true, likeUri: response.uri };
            }
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const repostPost = createAsyncThunk(
    'posts/repost',
    async ({ uri, cid, isReposted }: { uri: string; cid: string; isReposted: boolean }, { rejectWithValue }) => {
        try {
            if (isReposted) {
                await agent.deleteRepost(uri);
                return { uri, isReposted: false };
            } else {
                const response = await agent.repost(uri, cid);
                return { uri, isReposted: true, repostUri: response.uri };
            }
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// Bookmark thunk removed as AT Protocol does not have a standard bookmark lexicon yet.
// Users can use 'Like' or 'Repost' for similar functionality, or custom lists.

export const deletePost = createAsyncThunk(
    'posts/delete',
    async (postUri: string, { rejectWithValue }) => {
        try {
            await agent.deletePost(postUri);
            return postUri;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// updateInteractionSettings removed to focus on standard AT Protocol post/feed flow.

export const fetchPostsByTag = createAsyncThunk(
    'posts/fetchByTag',
    async ({ tag, limit = 20, cursor }: { tag: string; limit?: number; offset?: number; cursor?: string }, { rejectWithValue }) => {
        try {
            const response = await agent.app.bsky.feed.searchPosts({
                q: `#${tag}`,
                limit,
                cursor
            });
            if (!response.success) return rejectWithValue('Failed to fetch posts by tag');

            const posts: Post[] = response.data.posts.map((postView: any) => ({
                id: postView.uri.split('/').pop() || '',
                uri: postView.uri,
                cid: postView.cid,
                author: postView.author,
                content: (postView.record as any).text,
                createdAt: (postView.record as any).createdAt,
                likesCount: postView.likeCount || 0,
                repostsCount: postView.repostCount || 0,
                isLiked: !!postView.viewer?.like,
                isReposted: !!postView.viewer?.repost,
                viewer: postView.viewer
            } as any));

            return { posts, cursor: response.data.cursor };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostsSearch = createAsyncThunk(
    'posts/fetchSearch',
    async ({ query, take = 20, cursor }: { query: string; skip?: number; take?: number; cursor?: string }, { rejectWithValue }) => {
        try {
            const response = await agent.app.bsky.feed.searchPosts({
                q: query,
                limit: take,
                cursor
            });
            if (!response.success) return rejectWithValue('Failed to search posts');

            const posts: Post[] = response.data.posts.map((postView: any) => {
                const record = postView.record as any;
                return {
                    id: postView.uri.split('/').pop() || '',
                    uri: postView.uri,
                    cid: postView.cid,
                    author: {
                        id: postView.author.did,
                        did: postView.author.did,
                        handle: postView.author.handle,
                        username: postView.author.handle,
                        displayName: postView.author.displayName || postView.author.handle,
                        avatarUrl: postView.author.avatar
                    },
                    content: record.text,
                    createdAt: record.createdAt,
                    likesCount: postView.likeCount || 0,
                    repostsCount: postView.repostCount || 0,
                    repliesCount: postView.replyCount || 0,
                    quotesCount: postView.quoteCount || 0,
                    isLiked: !!postView.viewer?.like,
                    isReposted: !!postView.viewer?.repost,
                    viewer: postView.viewer
                } as Post;
            });

            return { posts, cursor: response.data.cursor };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostById = createAsyncThunk(
    'posts/fetchPostById',
    async (uri: string, { rejectWithValue }) => {
        try {
            const response = await agent.getPostThread({ uri });
            if (!response.success) return rejectWithValue('Failed to fetch post thread');

            // Map ThreadViewPost to our internal Post type
            const thread: any = response.data.thread;
            const postView = thread.post;
            const record = postView.record as any;

            return {
                id: postView.uri.split('/').pop() || '',
                uri: postView.uri,
                cid: postView.cid,
                author: {
                    id: postView.author.did,
                    did: postView.author.did,
                    handle: postView.author.handle,
                    username: postView.author.handle,
                    displayName: postView.author.displayName || postView.author.handle,
                    avatarUrl: postView.author.avatar
                },
                content: record.text,
                createdAt: record.createdAt,
                likesCount: postView.likeCount || 0,
                repostsCount: postView.repostCount || 0,
                repliesCount: postView.replyCount || 0,
                quotesCount: postView.quoteCount || 0,
                isLiked: !!postView.viewer?.like,
                isReposted: !!postView.viewer?.repost,
                viewer: postView.viewer
            } as Post;
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
            // Standard AT Proto doesn't have a "trending" endpoint in bsky.feed namespace.
            // For now, we'll use getTimeline or a custom feed if available.
            const response = await agent.getTimeline({ limit: 40 });
            if (!response.success) return rejectWithValue('Failed to fetch trending');

            return response.data.feed.map((item: any) => ({
                id: item.post.uri.split('/').pop() || '',
                uri: item.post.uri,
                cid: item.post.cid,
                author: item.post.author,
                content: (item.post.record as any).text,
                createdAt: (item.post.record as any).createdAt,
                likesCount: item.post.likeCount || 0,
                repostsCount: item.post.repostCount || 0,
                isLiked: !!item.post.viewer?.like,
                isReposted: !!item.post.viewer?.repost,
                viewer: item.post.viewer
            } as any));
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

// fetchBookmarkedPosts removed as not natively supported by AT Proto lexicon yet

export const fetchDiscoverPosts = createAsyncThunk(
    'posts/fetchDiscover',
    async ({ skip = 0, take = 20, cursor }: { skip?: number; take?: number; cursor?: string } = {}, { rejectWithValue }) => {
        try {
            // Using getTimeline for now as a "discover" fallback if no specific discover feed
            const response = await agent.getTimeline({
                cursor,
                limit: take
            });
            if (!response.success) return rejectWithValue('Failed to fetch discover feed');

            const posts: Post[] = response.data.feed.map((item: any) => {
                const postView = item.post;
                const record = postView.record as any;
                return {
                    id: postView.uri.split('/').pop() || '',
                    uri: postView.uri,
                    cid: postView.cid,
                    author: {
                        id: postView.author.did,
                        did: postView.author.did,
                        handle: postView.author.handle,
                        username: postView.author.handle,
                        displayName: postView.author.displayName || postView.author.handle,
                        avatarUrl: postView.author.avatar
                    },
                    content: record.text,
                    createdAt: record.createdAt,
                    likesCount: postView.likeCount || 0,
                    repostsCount: postView.repostCount || 0,
                    repliesCount: postView.replyCount || 0,
                    quotesCount: postView.quoteCount || 0,
                    isLiked: !!postView.viewer?.like,
                    isReposted: !!postView.viewer?.repost,
                    viewer: postView.viewer
                } as Post;
            });

            return { posts, skip, cursor: response.data.cursor };
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
                    if (!timestamp || !post.lastUpdated || new Date(timestamp) >= new Date(post.lastUpdated)) {
                        Object.assign(post, stats);
                        if (timestamp) post.lastUpdated = timestamp;
                    }
                }
            };
            updateInArray(state.posts);
            updateInArray(state.discoverPosts);
            updateInArray(state.trendingPosts);
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
        },
        removePost: (state, action: PayloadAction<string>) => {
            const postUri = action.payload;
            state.posts = state.posts.filter((p: Post) => p.uri !== postUri);
            state.discoverPosts = state.discoverPosts.filter((p: Post) => p.uri !== postUri);
            state.trendingPosts = state.trendingPosts.filter((p: Post) => p.uri !== postUri);
        }
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
                if (!action.meta.arg.cursor) {
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
                const { cursor, userId } = action.meta.arg;
                // Clear only if it's the first page AND we're switching users or have no posts
                if (!cursor) {
                    const currentAuthorId = state.posts[0]?.author?.id;
                    if (currentAuthorId !== userId) {
                        state.posts = [];
                    }
                }
            })
            .addCase(fetchUserPosts.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                if (!action.meta.arg.cursor) {
                    state.posts = action.payload.posts;
                } else {
                    const existingUris = new Set(state.posts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.posts = [...state.posts, ...newPosts];
                }
                state.hasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchUserPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
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
            })
            .addCase(toggleLike.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isLiked: boolean, likeUri?: string }>) => {
                state.actionLoading[action.payload.uri] = false;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === action.payload.uri);
                    if (post) {
                        post.isLiked = action.payload.isLiked;
                        // We store the like record URI in the viewer object to allow deletion later
                        if (!post.viewer) post.viewer = {};
                        post.viewer.like = action.payload.likeUri;
                        post.lastUpdated = new Date().toISOString();
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
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
            })
            .addCase(repostPost.fulfilled, (state: PostsState, action: PayloadAction<{ uri: string, isReposted: boolean, repostUri?: string }>) => {
                state.actionLoading[action.payload.uri] = false;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.uri === action.payload.uri);
                    if (post) {
                        post.isReposted = action.payload.isReposted;
                        if (!post.viewer) post.viewer = {};
                        post.viewer.repost = action.payload.repostUri;
                        post.lastUpdated = new Date().toISOString();
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
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
            .addCase(fetchPostById.fulfilled, (state: PostsState, action: PayloadAction<Post>) => {
                state.isLoading = false;
                const index = state.posts.findIndex(p => p.uri === action.payload.uri);
                if (index !== -1) {
                    state.posts[index] = action.payload;
                } else {
                    state.posts.push(action.payload);
                }
            })
            .addCase(fetchPostById.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // fetchBookmarkedPosts removed as not natively supported by AT Proto lexicon yet
            // Fetch Posts By Tag
            .addCase(fetchPostsByTag.pending, (state: PostsState, action: any) => {
                state.isLoading = true;
                if (!action.meta.arg.cursor) {
                    state.posts = [];
                }
            })
            .addCase(fetchPostsByTag.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                if (!action.meta.arg.cursor) {
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
                if (!action.meta.arg.cursor) {
                    state.posts = [];
                }
            })
            .addCase(fetchPostsSearch.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                if (!action.meta.arg.cursor) {
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
                if (!action.meta.arg?.cursor) {
                    state.discoverPosts = [];
                }
            })
            .addCase(fetchDiscoverPosts.fulfilled, (state: PostsState, action: any) => {
                state.isLoading = false;
                state.discoverLoading = false;
                if (!action.meta.arg?.cursor) {
                    state.discoverPosts = action.payload.posts;
                    state.lastDiscoverFetch = Date.now();
                } else {
                    const existingUris = new Set(state.discoverPosts.map((p: Post) => p.uri));
                    const newPosts = action.payload.posts.filter((p: Post) => !existingUris.has(p.uri));
                    state.discoverPosts = [...state.discoverPosts, ...newPosts];
                }
                state.discoverHasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchDiscoverPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.discoverLoading = false;
                state.error = action.payload as string;
            })


    }
});


export const { clearPosts, updatePostStats, updateUserPostStatus, removePost } = postsSlice.actions;


export default postsSlice.reducer;

