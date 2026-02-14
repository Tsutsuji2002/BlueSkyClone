import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { PostsState, Post } from '../../types';
import { API_BASE_URL } from '../../constants';

const initialState: PostsState = {
    posts: [],
    trendingPosts: [],
    isLoading: false,
    error: null,
    hasMore: true,
    actionLoading: {}, // Map of postId -> boolean
};

export const fetchTimeline = createAsyncThunk(
    'posts/fetchTimeline',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/posts/timeline`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch timeline');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserPosts = createAsyncThunk(
    'posts/fetchUserPosts',
    async ({ userId, type, limit = 3, offset = 0 }: { userId: string; type?: string; limit?: number; offset?: number }, { rejectWithValue }) => {
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

export const deletePost = createAsyncThunk(
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
            return postId;
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

const postsSlice = createSlice({
    name: 'posts',
    initialState,
    reducers: {
        clearPosts: (state: PostsState) => {
            state.posts = [];
            state.hasMore = true;
        },
    },

    extraReducers: (builder) => {
        builder
            // Fetch Timeline
            .addCase(fetchTimeline.pending, (state: PostsState) => {
                state.isLoading = true;
                // Only clear if we have no posts yet, otherwise keep them until fetch completes
                if (state.posts.length === 0) {
                    state.posts = [];
                }
            })
            .addCase(fetchTimeline.fulfilled, (state: PostsState, action: PayloadAction<Post[]>) => {
                state.isLoading = false;
                state.posts = action.payload;
                state.hasMore = action.payload.length > 0;
            })
            .addCase(fetchTimeline.rejected, (state: PostsState, action) => {
                state.isLoading = false;
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
                state.hasMore = action.payload.posts.length === 3; // Assuming limit is 3
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
            })
            .addCase(createPost.rejected, (state: PostsState, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Toggle Like
            .addCase(toggleLike.pending, (state: PostsState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(toggleLike.fulfilled, (state: PostsState, action: PayloadAction<{ postId: string, isLiked: boolean, likesCount: number }>) => {
                state.actionLoading[action.payload.postId] = false;
                const post = state.posts.find(p => p.id === action.payload.postId);
                if (post) {
                    post.isLiked = action.payload.isLiked;
                    post.likesCount = action.payload.likesCount;
                }
            })
            .addCase(toggleLike.rejected, (state: PostsState, action) => {
                state.actionLoading[action.meta.arg] = false;
            })
            // Repost
            .addCase(repostPost.pending, (state: PostsState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(repostPost.fulfilled, (state: PostsState, action: PayloadAction<{ postId: string, isReposted: boolean, repostsCount: number }>) => {
                state.actionLoading[action.payload.postId] = false;
                const post = state.posts.find(p => p.id === action.payload.postId);
                if (post) {
                    post.isReposted = action.payload.isReposted;
                    post.repostsCount = action.payload.repostsCount;
                }
            })
            .addCase(repostPost.rejected, (state: PostsState, action) => {
                state.actionLoading[action.meta.arg] = false;
            })
            // Bookmark
            .addCase(bookmarkPost.pending, (state: PostsState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(bookmarkPost.fulfilled, (state: PostsState, action: PayloadAction<{ postId: string, isBookmarked: boolean, bookmarksCount: number }>) => {
                state.actionLoading[action.payload.postId] = false;
                const post = state.posts.find(p => p.id === action.payload.postId);
                if (post) {
                    post.isBookmarked = action.payload.isBookmarked;
                    post.bookmarksCount = action.payload.bookmarksCount;
                }
            })
            .addCase(bookmarkPost.rejected, (state: PostsState, action) => {
                state.actionLoading[action.meta.arg] = false;
            })
            // Delete Post
            .addCase(deletePost.fulfilled, (state: PostsState, action: PayloadAction<string>) => {
                state.posts = state.posts.filter(p => p.id !== action.payload);
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
            });


    }
});


export const { clearPosts } = postsSlice.actions;


export default postsSlice.reducer;

