import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PostsState, Post } from '../../types';
import { API_BASE_URL } from '../../constants';

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
    actionLoading: {}, // Map of postId -> boolean
    lastTimelineFetch: 0,
    lastDiscoverFetch: 0,
};

export const fetchTimeline = createAsyncThunk(
    'posts/fetchTimeline',
    async ({ skip = 0, take = 20 }: { skip?: number; take?: number } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/timeline?skip=${skip}&take=${take}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch timeline');
            return { posts: data, skip };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserPosts = createAsyncThunk(
    'posts/fetchUserPosts',
    async ({ userId, type, limit = 20, offset = 0 }: { userId: string; type?: string; limit?: number; offset?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/posts/user/${userId}?limit=${limit}&offset=${offset}`;
            if (type && type !== 'posts') {
                url += `&type=${type}`;
            }
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch user posts');
            return { posts: data, offset };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);



export const updatePost = createAsyncThunk(
    'posts/updatePost',
    async ({ postId, formData }: { postId: string; formData: FormData }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to update post');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const createPost = createAsyncThunk(
    'posts/createPost',
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to create post');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const toggleLike = createAsyncThunk(
    'posts/toggleLike',
    async (postId: string, { rejectWithValue, getState }) => {
        console.log('toggleLike thunk started for:', postId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to like post');
            return { postId, ...data }; // { isLiked, likesCount }
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const repostPost = createAsyncThunk(
    'posts/repost',
    async (postId: string, { rejectWithValue, getState }) => {
        console.log('repostPost thunk started for:', postId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/repost`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to repost');
            return { postId, ...data };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const bookmarkPost = createAsyncThunk(
    'posts/bookmark',
    async (postId: string, { rejectWithValue, getState }) => {
        console.log('bookmarkPost thunk started for:', postId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/bookmark`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to bookmark');
            return { postId, ...data };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const deletePost = createAsyncThunk<string[], string>(
    'posts/delete',
    async (postId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to delete post');
            }
            const data = await response.json();
            return data; // Array of affected IDs
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const updateInteractionSettings = createAsyncThunk(
    'posts/updateInteractionSettings',
    async ({ postId, replyRestriction, allowQuotes }: { postId: string; replyRestriction: string; allowQuotes: boolean }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/interaction-settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ replyRestriction, allowQuotes })
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to update interaction settings');
            }
            const data = await response.json();
            return data; // Returns the updated PostDto
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostsByTag = createAsyncThunk(
    'posts/fetchByTag',
    async ({ tag, limit = 20, offset = 0 }: { tag: string; limit?: number; offset?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/tag/${tag}?limit=${limit}&offset=${offset}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch posts by tag');
            return { posts: data, offset };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostsSearch = createAsyncThunk(
    'posts/fetchSearch',
    async ({ query, skip = 0, take = 20 }: { query: string; skip?: number; take?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/search/posts?q=${encodeURIComponent(query)}&skip=${skip}&take=${take}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to search posts');
            return { posts: data, skip };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchPostById = createAsyncThunk(
    'posts/fetchPostById',
    async (postId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch post');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);


export const fetchPostReplies = createAsyncThunk(
    'posts/fetchPostReplies',
    async (postId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/${postId}/replies`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch replies');
            return data;
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
            const response = await fetch(`${API_BASE_URL}/posts/trending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch trending posts');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchTrendingPosts24h = createAsyncThunk(
    'posts/fetchTrending24h',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/Feeds/trending-posts`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch trending posts');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchBookmarkedPosts = createAsyncThunk(
    'posts/fetchBookmarked',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/bookmarks`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch bookmarked posts');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchDiscoverPosts = createAsyncThunk(
    'posts/fetchDiscover',
    async ({ skip = 0, take = 10 }: { skip?: number; take?: number } = {}, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/Feeds/discover?skip=${skip}&take=${take}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch discover posts');
            return { posts: data, skip };
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
        updatePostStats: (state, action: PayloadAction<{ postId: string; likesCount: number; repostsCount: number; bookmarksCount: number; repliesCount: number; quotesCount: number }>) => {
            const { postId, ...stats } = action.payload;
            const updateInArray = (arr: Post[]) => {
                const post = arr.find(p => p.id === postId);
                if (post) {
                    Object.assign(post, stats);
                }
            };
            updateInArray(state.posts);
            updateInArray(state.discoverPosts);
            updateInArray(state.trendingPosts);
            if (state.currentPost?.id === postId) {
                Object.assign(state.currentPost, stats);
            }
        },
        updateUserPostStatus: (state, action: PayloadAction<{ postId: string; isLiked?: boolean; isReposted?: boolean; isBookmarked?: boolean }>) => {
            const { postId, ...status } = action.payload;
            const updateInArray = (arr: Post[]) => {
                const post = arr.find(p => p.id === postId);
                if (post) {
                    Object.assign(post, status);
                }
            };
            updateInArray(state.posts);
            updateInArray(state.discoverPosts);
            updateInArray(state.trendingPosts);
            if (state.currentPost?.id === postId) {
                Object.assign(state.currentPost, status);
            }
        },
        removePost: (state, action: PayloadAction<string>) => {
            const postId = action.payload;
            state.posts = state.posts.filter(p => p.id !== postId);
            state.discoverPosts = state.discoverPosts.filter(p => p.id !== postId);
            state.trendingPosts = state.trendingPosts.filter(p => p.id !== postId);
            if (state.currentPost?.id === postId) {
                state.currentPost = null;
            }
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
            .addCase(fetchTimeline.fulfilled, (state: PostsState, action: PayloadAction<{ posts: Post[], skip: number }>) => {
                state.isLoading = false;
                state.timelineLoading = false;
                if (action.payload.skip === 0) {
                    state.posts = action.payload.posts;
                    state.lastTimelineFetch = Date.now();
                } else {
                    state.posts = [...state.posts, ...action.payload.posts];
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
            // Fetch Trending Posts 24h
            .addCase(fetchTrendingPosts24h.pending, (state: PostsState) => {
                state.isLoading = true;
            })
            .addCase(fetchTrendingPosts24h.fulfilled, (state: PostsState, action: PayloadAction<Post[]>) => {
                state.isLoading = false;
                state.trendingPosts = action.payload;
            })
            .addCase(fetchTrendingPosts24h.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch User Posts
            .addCase(fetchUserPosts.pending, (state: PostsState, action) => {
                state.isLoading = true;
                const { offset, userId } = action.meta.arg;
                // Clear only if it's the first page AND we're switching users or have no posts
                if (offset === 0) {
                    const currentAuthorId = state.posts[0]?.author?.id;
                    if (currentAuthorId !== userId) {
                        state.posts = [];
                    }
                }
            })
            .addCase(fetchUserPosts.fulfilled, (state: PostsState, action: PayloadAction<{ posts: Post[], offset: number }>) => {
                state.isLoading = false;
                if (action.payload.offset === 0) {
                    state.posts = action.payload.posts;
                } else {
                    state.posts = [...state.posts, ...action.payload.posts];
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
                if (action.payload.replyToPostId) {
                    const parentPost = state.posts.find(p => p.id === action.payload.replyToPostId);
                    if (parentPost) {
                        parentPost.repliesCount = (parentPost.repliesCount || 0) + 1;
                    }
                }
                if (action.payload.quotePostId) {
                    const quotedPost = state.posts.find(p => p.id === action.payload.quotePostId);
                    if (quotedPost) {
                        quotedPost.quotesCount = (quotedPost.quotesCount || 0) + 1;
                    }
                }
            })
            .addCase(createPost.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update Post
            .addCase(updatePost.pending, (state: PostsState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updatePost.fulfilled, (state: PostsState, action: PayloadAction<Post>) => {
                state.isLoading = false;
                const updateInArray = (arr: Post[]) => {
                    const idx = arr.findIndex(p => p.id === action.payload.id);
                    if (idx !== -1) arr[idx] = action.payload;
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(updatePost.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(toggleLike.pending, (state: PostsState, action) => {
                const postId = action.meta.arg;
                state.actionLoading[postId] = true;

                // Optimistic Update
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === postId);
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
            .addCase(toggleLike.fulfilled, (state: PostsState, action: PayloadAction<{ postId: string, isLiked: boolean, likesCount: number }>) => {
                state.actionLoading[action.payload.postId] = false;
                // Update in timeline/user posts with actual server data
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === action.payload.postId);
                    if (post) {
                        post.isLiked = action.payload.isLiked;
                        post.likesCount = action.payload.likesCount;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(toggleLike.rejected, (state: PostsState, action) => {
                const postId = action.meta.arg;
                state.actionLoading[postId] = false;

                // Rollback on Error
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === postId);
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
                const postId = action.meta.arg;
                state.actionLoading[postId] = true;

                // Optimistic Update
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === postId);
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
            .addCase(repostPost.fulfilled, (state: PostsState, action: PayloadAction<{ postId: string, isReposted: boolean, repostsCount: number }>) => {
                state.actionLoading[action.payload.postId] = false;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === action.payload.postId);
                    if (post) {
                        post.isReposted = action.payload.isReposted;
                        post.repostsCount = action.payload.repostsCount;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(repostPost.rejected, (state: PostsState, action) => {
                const postId = action.meta.arg;
                state.actionLoading[postId] = false;

                // Rollback
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === postId);
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
            .addCase(bookmarkPost.pending, (state: PostsState, action) => {
                const postId = action.meta.arg;
                state.actionLoading[postId] = true;

                // Optimistic Update
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === postId);
                    if (post) {
                        const wasBookmarked = post.isBookmarked;
                        post.isBookmarked = !wasBookmarked;
                        post.bookmarksCount = wasBookmarked ? Math.max(0, (post.bookmarksCount || 0) - 1) : (post.bookmarksCount || 0) + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(bookmarkPost.fulfilled, (state: PostsState, action: PayloadAction<{ postId: string, isBookmarked: boolean, bookmarksCount: number }>) => {
                state.actionLoading[action.payload.postId] = false;
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === action.payload.postId);
                    if (post) {
                        post.isBookmarked = action.payload.isBookmarked;
                        post.bookmarksCount = action.payload.bookmarksCount;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(bookmarkPost.rejected, (state: PostsState, action) => {
                const postId = action.meta.arg;
                state.actionLoading[postId] = false;

                // Rollback
                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === postId);
                    if (post) {
                        const wasBookmarked = post.isBookmarked;
                        post.isBookmarked = !wasBookmarked;
                        post.bookmarksCount = wasBookmarked ? Math.max(0, (post.bookmarksCount || 0) - 1) : (post.bookmarksCount || 0) + 1;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            // Delete Post
            .addCase(deletePost.fulfilled, (state: PostsState, action: PayloadAction<string[]>) => {
                const deletedIds = new Set(action.payload);
                state.posts = state.posts.filter(p => !deletedIds.has(p.id));
                state.discoverPosts = state.discoverPosts.filter(p => !deletedIds.has(p.id));
                state.trendingPosts = state.trendingPosts.filter(p => !deletedIds.has(p.id));
            })
            // Fetch Post By ID
            .addCase(fetchPostById.pending, (state: PostsState) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchPostById.fulfilled, (state: PostsState, action: PayloadAction<Post>) => {
                state.isLoading = false;
                const index = state.posts.findIndex(p => p.id === action.payload.id);
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
            // Fetch Post Replies
            .addCase(fetchPostReplies.fulfilled, (state: PostsState, action: PayloadAction<Post[]>) => {
                action.payload.forEach(reply => {
                    const index = state.posts.findIndex(p => p.id === reply.id);
                    if (index !== -1) {
                        state.posts[index] = reply;
                    } else {
                        state.posts.push(reply);
                    }
                });
            })
            // Fetch Bookmarked Posts
            .addCase(fetchBookmarkedPosts.pending, (state: PostsState) => {
                state.isLoading = true;
                // For bookmarks, we can keep existing until new ones load unless list is empty
                if (state.posts.length === 0) {
                    state.posts = [];
                }
            })
            .addCase(fetchBookmarkedPosts.fulfilled, (state: PostsState, action: PayloadAction<Post[]>) => {
                state.isLoading = false;
                // We want to combine these into the main posts list but also mark them
                action.payload.forEach(post => {
                    const index = state.posts.findIndex(p => p.id === post.id);
                    if (index !== -1) {
                        state.posts[index] = post;
                    } else {
                        state.posts.push(post);
                    }
                });
            })
            .addCase(fetchBookmarkedPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Posts By Tag
            .addCase(fetchPostsByTag.pending, (state: PostsState, action) => {
                state.isLoading = true;
                if (action.meta.arg.offset === 0) {
                    state.posts = [];
                }
            })
            .addCase(fetchPostsByTag.fulfilled, (state: PostsState, action: PayloadAction<{ posts: Post[], offset: number }>) => {
                state.isLoading = false;
                if (action.payload.offset === 0) {
                    state.posts = action.payload.posts;
                } else {
                    state.posts = [...state.posts, ...action.payload.posts];
                }
                state.hasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchPostsByTag.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Posts Search
            .addCase(fetchPostsSearch.pending, (state: PostsState, action) => {
                state.isLoading = true;
                if (action.meta.arg.skip === 0) {
                    state.posts = [];
                }
            })
            .addCase(fetchPostsSearch.fulfilled, (state: PostsState, action: PayloadAction<{ posts: Post[], skip: number }>) => {
                state.isLoading = false;
                if (action.payload.skip === 0) {
                    state.posts = action.payload.posts;
                } else {
                    state.posts = [...state.posts, ...action.payload.posts];
                }
                state.hasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchPostsSearch.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Fetch Discover Posts
            .addCase(fetchDiscoverPosts.pending, (state: PostsState, action) => {
                state.isLoading = true;
                state.discoverLoading = true;
                if (action.meta.arg?.skip === 0 || !action.meta.arg) {
                    state.discoverPosts = [];
                }
            })
            .addCase(fetchDiscoverPosts.fulfilled, (state: PostsState, action: PayloadAction<{ posts: Post[], skip: number }>) => {
                state.isLoading = false;
                state.discoverLoading = false;
                if (action.payload.skip === 0) {
                    state.discoverPosts = action.payload.posts;
                    state.lastDiscoverFetch = Date.now();
                } else {
                    state.discoverPosts = [...state.discoverPosts, ...action.payload.posts];
                }
                state.discoverHasMore = action.payload.posts.length > 0;
            })
            .addCase(fetchDiscoverPosts.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.discoverLoading = false;
                state.error = action.payload as string;
            })
            // Update Interaction Settings
            .addCase(updateInteractionSettings.pending, (state: PostsState, action) => {
                const { postId, replyRestriction, allowQuotes } = action.meta.arg;
                state.actionLoading[postId] = true;

                const updateInArray = (arr: Post[]) => {
                    const post = arr.find(p => p.id === postId);
                    if (post) {
                        post.replyRestriction = replyRestriction;
                        post.allowQuotes = allowQuotes;
                        // Also update canReply optimistically if we can infer it
                        // For simplicity, we just update the restriction fields
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(updateInteractionSettings.fulfilled, (state: PostsState, action: PayloadAction<Post>) => {
                state.actionLoading[action.payload.id] = false;
                const updateInArray = (arr: Post[]) => {
                    const index = arr.findIndex(p => p.id === action.payload.id);
                    if (index !== -1) {
                        arr[index] = action.payload;
                    }
                };
                updateInArray(state.posts);
                updateInArray(state.discoverPosts);
                updateInArray(state.trendingPosts);
            })
            .addCase(updateInteractionSettings.rejected, (state: PostsState, action) => {
                const postId = action.meta.arg.postId;
                state.actionLoading[postId] = false;
                state.error = action.payload as string;
                // Note: Full rollback would require storing old values, 
                // but since we usually fetch the post again or rely on next refresh, 
                // this is a reasonable compromise for now.
            });


    }
});


export const { clearPosts, updatePostStats, updateUserPostStatus, removePost } = postsSlice.actions;


export default postsSlice.reducer;

