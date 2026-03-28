import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { Feed, Post } from '../../types';
import { API_BASE_URL } from '../../constants';
import { feedActionKey } from '../../utils/feedKeys';

interface FeedsState {
    feeds: Feed[];
    subscribedFeeds: Feed[];
    searchResults: Feed[];
    pinnedFeedIds: string[];
    activeFeedId: string | null;
    activeTab: string;
    feedPosts: Record<string, Post[]>;
    recommendedFeeds: Feed[];
    isLoading: boolean;
    feedLoading: Record<string, boolean>; // per-feed loading flag for pagination
    searchLoading: boolean;
    error: string | null;
    hasMoreSearch: boolean;
    actionLoading: Record<string, boolean>;
    feedHasMore: Record<string, boolean>;
    feedLastFetch: Record<string, number>;
    infoLoading: Record<string, boolean>;
    infoError: Record<string, string | null>;
}

const initialState: FeedsState = {
    feeds: [],
    subscribedFeeds: [],
    searchResults: [],
    pinnedFeedIds: [],
    activeFeedId: null,
    activeTab: localStorage.getItem('home_active_tab') || 'following', // Default to following or persisted tab
    feedPosts: {},
    recommendedFeeds: [],
    isLoading: false,
    feedLoading: {},
    searchLoading: false,
    error: null,
    hasMoreSearch: true,
    actionLoading: {},
    feedHasMore: {},
    feedLastFetch: {},
    infoLoading: {},
    infoError: {},
};

export const fetchTrendingFeeds = createAsyncThunk<
    Feed[],
    void,
    { rejectValue: string }
>(
    'feeds/fetchTrendingFeeds',
    async (_: void, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/trending`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            console.log('feedsSlice: fetchTrendingFeeds returned:', data);
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch trending feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchRecommendedFeeds = createAsyncThunk<
    Feed[],
    void,
    { rejectValue: string }
>(
    'feeds/fetchRecommendedFeeds',
    async (_: void, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/recommended`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            console.log('feedsSlice: fetchRecommendedFeeds returned:', data);
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch recommended feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchSubscribedFeeds = createAsyncThunk<
    Feed[],
    void,
    { rejectValue: string }
>(
    'feeds/fetchSubscribedFeeds',
    async (_: void, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/subscribed`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            console.log('feedsSlice: fetchSubscribedFeeds returned:', data);
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch subscribed feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const saveFeed = createAsyncThunk<
    boolean,
    string,
    { rejectValue: string }
>(
    'feeds/save',
    async (feedId: string, { rejectWithValue, getState }: { rejectWithValue: (value: string) => any, getState: () => any }) => {
        console.log('saveFeed thunk started for:', feedId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/save/${encodeURIComponent(feedId)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to save feed');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unsaveFeed = createAsyncThunk<
    boolean,
    string,
    { rejectValue: string }
>(
    'feeds/unsave',
    async (feedId: string, { rejectWithValue, getState }: { rejectWithValue: (value: string) => any, getState: () => any }) => {
        console.log('unsaveFeed thunk started for:', feedId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/unsave/${encodeURIComponent(feedId)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to unsave feed');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const pinFeed = createAsyncThunk<
    boolean,
    string,
    { rejectValue: string }
>(
    'feeds/pin',
    async (feedId: string, { rejectWithValue, getState }: { rejectWithValue: (value: string) => any, getState: () => any }) => {
        console.log('pinFeed thunk started for:', feedId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/pin/${encodeURIComponent(feedId)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to pin feed');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const unpinFeed = createAsyncThunk<
    boolean,
    string,
    { rejectValue: string }
>(
    'feeds/unpin',
    async (feedId: string, { rejectWithValue, getState }: { rejectWithValue: (value: string) => any, getState: () => any }) => {
        console.log('unpinFeed thunk started for:', feedId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/unpin/${encodeURIComponent(feedId)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to unpin feed');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const reorderFeeds = createAsyncThunk<
    boolean,
    string[],
    { rejectValue: string }
>(
    'feeds/reorder',
    async (feedIds: string[], { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/reorder`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(feedIds)
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to reorder feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const reorderPinnedFeeds = createAsyncThunk<
    boolean,
    string[],
    { rejectValue: string }
>(
    'feeds/reorderPinned',
    async (orderedKeys: string[], { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/reorder-pinned`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderedKeys)
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to reorder pinned feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchFeedInfo = createAsyncThunk<
    Feed,
    string,
    { rejectValue: string }
>(
    'feeds/fetchInfo',
    async (feedId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const isRemoteKey = feedId.startsWith('at://') || feedId === 'following' || feedId === 'discover';
            const url = isRemoteKey
                ? `${API_BASE_URL}/feeds/resolve?uri=${encodeURIComponent(feedId)}`
                : `${API_BASE_URL}/feeds/info/${feedId}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            console.log('feedsSlice: fetchFeedInfo returned for ID', feedId, ':', data);
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch feed info');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const searchFeeds = createAsyncThunk<
    Feed[],
    { query: string, skip: number, take: number },
    { rejectValue: string }
>(
    'feeds/search',
    async ({ query, skip, take }: { query: string, skip: number, take: number }, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/search?query=${encodeURIComponent(query)}&skip=${skip}&take=${take}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to search feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchFeedPosts = createAsyncThunk<
    { feedId: string; posts: Post[]; isMore: boolean },
    { feedId: string; skip: number; take: number },
    { rejectValue: string }
>(
    'feeds/fetchPosts',
    async ({ feedId, skip, take }: { feedId: string; skip: number; take: number }, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/unified-feed?feedId=${encodeURIComponent(feedId)}&skip=${skip}&take=${take}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.error || 'Failed to fetch feed posts');
            return { feedId: data.feedId, posts: data.posts, isMore: data.hasMore };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const feedsSlice = createSlice({
    name: 'feeds',
    initialState,
    reducers: {
        setActiveFeed: (state: FeedsState, action: PayloadAction<string | null>) => {
            state.activeFeedId = action.payload;
            if (action.payload) {
                state.activeTab = action.payload;
            }
        },
        setActiveTab: (state: FeedsState, action: PayloadAction<string>) => {
            state.activeTab = action.payload;
            localStorage.setItem('home_active_tab', action.payload);
            if (action.payload === 'following' || action.payload === 'discover') {
                state.activeFeedId = null;
            } else {
                state.activeFeedId = action.payload;
            }
        },
        setPinnedFeedIds: (state: FeedsState, action: PayloadAction<string[]>) => {
            state.pinnedFeedIds = action.payload;
        },
    },
    extraReducers: (builder: ActionReducerMapBuilder<FeedsState>) => {
        builder
            .addCase(fetchTrendingFeeds.pending, (state: FeedsState) => {
                state.isLoading = true;
                state.feeds = [];
            })
            .addCase(fetchTrendingFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.isLoading = false;
                state.feeds = action.payload;
            })
            .addCase(fetchTrendingFeeds.rejected, (state: FeedsState, action: any) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchRecommendedFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.recommendedFeeds = action.payload;
            })
            .addCase(fetchSubscribedFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.subscribedFeeds = action.payload;
                state.pinnedFeedIds = action.payload
                    .filter((f: Feed) => f.isPinned)
                    .map((f: Feed) => feedActionKey(f));
            })
            .addCase(fetchFeedInfo.pending, (state: FeedsState, action) => {
                state.infoLoading[action.meta.arg] = true;
                state.infoError[action.meta.arg] = null;
            })
            .addCase(fetchFeedInfo.fulfilled, (state: FeedsState, action: any) => {
                state.infoLoading[action.meta.arg] = false;
                // Add to searchResults or another cache if not already present
                const resolvedKey = feedActionKey(action.payload);
                if (!state.subscribedFeeds.find(f => feedActionKey(f) === resolvedKey)) {
                    // We don't want to duplicate, just make it available for Detail page
                    // Maybe put it in feeds array which we use as a general cache
                    const index = state.feeds.findIndex(f => feedActionKey(f) === resolvedKey);
                    if (index >= 0) {
                        state.feeds[index] = action.payload;
                    } else {
                        state.feeds.push(action.payload);
                    }
                }
            })
            .addCase(fetchFeedInfo.rejected, (state: FeedsState, action: any) => {
                state.infoLoading[action.meta.arg] = false;
                state.infoError[action.meta.arg] = action.payload;
            })
            .addCase(searchFeeds.pending, (state: FeedsState) => {
                state.searchLoading = true;
            })
            .addCase(searchFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.searchLoading = false;
                state.searchResults = action.payload;
                state.hasMoreSearch = action.payload.length === 10;
            })
            .addCase(pinFeed.pending, (state: FeedsState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(pinFeed.fulfilled, (state: FeedsState, action: any) => {
                state.isLoading = false;
                const feedId = action.meta.arg;
                state.actionLoading[feedId] = false;

                const matches = (f: Feed) => feedActionKey(f) === feedId || f.id === feedId;
                const updateInList = (list: Feed[]) => {
                    const f = list.find(matches);
                    if (f) {
                        f.isPinned = true;
                        f.isSubscribed = true;
                    }
                };

                updateInList(state.feeds);
                updateInList(state.searchResults);
                updateInList(state.recommendedFeeds);

                // Handle subscribedFeeds
                let subFeed = state.subscribedFeeds.find(matches);
                if (subFeed) {
                    subFeed.isPinned = true;
                    subFeed.isSubscribed = true;
                } else {
                    const sourceFeed = state.feeds.find(matches) ||
                        state.searchResults.find(matches) ||
                        state.recommendedFeeds.find(matches);
                    if (sourceFeed) {
                        state.subscribedFeeds.push({ ...sourceFeed, isPinned: true, isSubscribed: true });
                    }
                }

                const canonical = state.subscribedFeeds.find(matches) ||
                    state.feeds.find(matches) ||
                    state.searchResults.find(matches) ||
                    state.recommendedFeeds.find(matches);
                const pinIdToStore = canonical ? feedActionKey(canonical) : feedId;
                if (!state.pinnedFeedIds.includes(pinIdToStore)) {
                    state.pinnedFeedIds.push(pinIdToStore);
                }
            })
            .addCase(pinFeed.rejected, (state: FeedsState, action: any) => {
                state.actionLoading[action.meta.arg] = false;
            })
            .addCase(unpinFeed.pending, (state: FeedsState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(unpinFeed.fulfilled, (state: FeedsState, action: any) => {
                state.isLoading = false;
                const feedId = action.meta.arg;
                state.actionLoading[feedId] = false;

                const matches = (f: Feed) => feedActionKey(f) === feedId || f.id === feedId;
                const updateInList = (list: Feed[]) => {
                    const f = list.find(matches);
                    if (f) {
                        f.isPinned = false;
                    }
                };

                updateInList(state.feeds);
                updateInList(state.searchResults);
                updateInList(state.recommendedFeeds);
                updateInList(state.subscribedFeeds);

                const canonical = state.subscribedFeeds.find(matches);
                const pinKey = canonical ? feedActionKey(canonical) : feedId;
                state.pinnedFeedIds = state.pinnedFeedIds.filter(id => id !== feedId && id !== pinKey);
            })
            .addCase(unpinFeed.rejected, (state: FeedsState, action: any) => {
                state.actionLoading[action.meta.arg] = false;
            })
            .addCase(saveFeed.pending, (state: FeedsState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(saveFeed.fulfilled, (state: FeedsState, action: any) => {
                const feedId = action.meta.arg;
                state.actionLoading[feedId] = false;
                const matches = (f: Feed) => feedActionKey(f) === feedId || f.id === feedId;
                const sourceFeed = state.searchResults.find(matches) ||
                    state.recommendedFeeds.find(matches);

                if (sourceFeed) {
                    sourceFeed.isSubscribed = true;
                    if (!state.subscribedFeeds.find(matches)) {
                        state.subscribedFeeds.push({ ...sourceFeed, isSubscribed: true });
                    }
                }
            })
            .addCase(saveFeed.rejected, (state: FeedsState, action: any) => {
                state.actionLoading[action.meta.arg] = false;
            })
            .addCase(unsaveFeed.pending, (state: FeedsState, action) => {
                state.actionLoading[action.meta.arg] = true;
            })
            .addCase(unsaveFeed.fulfilled, (state: FeedsState, action: any) => {
                const feedId = action.meta.arg;
                state.actionLoading[feedId] = false;
                const matches = (f: Feed) => feedActionKey(f) === feedId || f.id === feedId;
                const findAndUpdate = (list: Feed[]) => {
                    const f = list.find(matches);
                    if (f) {
                        f.isSubscribed = false;
                        f.isPinned = false;
                    }
                };
                findAndUpdate(state.searchResults);
                findAndUpdate(state.recommendedFeeds);
                const canonical = state.subscribedFeeds.find(matches);
                const pinKey = canonical ? feedActionKey(canonical) : feedId;
                state.subscribedFeeds = state.subscribedFeeds.filter(f => !matches(f));
                state.pinnedFeedIds = state.pinnedFeedIds.filter(id => id !== feedId && id !== pinKey);
            })
            .addCase(unsaveFeed.rejected, (state: FeedsState, action: any) => {
                state.actionLoading[action.meta.arg] = false;
            })
            .addCase(fetchFeedPosts.pending, (state: FeedsState, action) => {
                const { feedId, skip } = action.meta.arg;
                if (skip === 0) {
                    // Initial load: clear posts and show full skeleton
                    state.feedPosts[feedId] = [];
                    state.isLoading = true;
                }
                // Always mark per-feed as loading (for pagination spinner in footer)
                state.feedLoading[feedId] = true;
            })
            .addCase(fetchFeedPosts.fulfilled, (state: FeedsState, action: any) => {
                const { feedId, posts, isMore } = action.payload;
                state.isLoading = false;
                state.feedLoading[feedId] = false;
                if (!state.feedPosts[feedId] || action.meta.arg.skip === 0) {
                    state.feedPosts[feedId] = posts;
                    state.feedLastFetch[feedId] = Date.now();
                } else {
                    state.feedPosts[feedId] = [...state.feedPosts[feedId], ...posts];
                }
                state.feedHasMore[feedId] = isMore !== undefined ? isMore : posts.length > 0;
            })
            .addCase(fetchFeedPosts.rejected, (state: FeedsState, action: any) => {
                const feedId = action.meta.arg.feedId;
                state.isLoading = false;
                state.feedLoading[feedId] = false;
                state.error = action.payload as string;
            })
            // Synchronize interactions across feedPosts (Optimistic)
            .addMatcher(
                (action) => action.type.endsWith('/toggleLike/pending') ||
                    action.type.endsWith('/repostPost/pending') ||
                    action.type.endsWith('/toggleBookmark/pending'),
                (state: FeedsState, action: any) => {
                    const { uri: actionUri } = action.meta.arg;
                    const type = action.type;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        const posts = state.feedPosts[feedId];
                        const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!))); // Handle all formats
                        if (post) {
                            if (type.includes('toggleLike')) {
                                const wasLiked = post.isLiked;
                                post.isLiked = !wasLiked;
                                post.likesCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;
                            } else if (type.includes('repostPost')) {
                                const wasReposted = post.isReposted;
                                post.isReposted = !wasReposted;
                                post.repostsCount = wasReposted ? Math.max(0, post.repostsCount - 1) : post.repostsCount + 1;
                            } else if (type.includes('toggleBookmark')) {
                                const wasBookmarked = post.isBookmarked;
                                post.isBookmarked = !wasBookmarked;
                                post.bookmarksCount = wasBookmarked ? Math.max(0, post.bookmarksCount - 1) : post.bookmarksCount + 1;
                            }
                        }
                    });
                }
            )
            // Synchronize interactions across feedPosts (Fulfilled/Final)
            .addMatcher(
                (action) => action.type.endsWith('/toggleLike/fulfilled') ||
                    action.type.endsWith('/repostPost/fulfilled') ||
                    action.type.endsWith('/toggleBookmark/fulfilled'),
                (state: FeedsState, action: any) => {
                    const payload = action.payload;
                    const actionUri = payload.uri;
                    if (!actionUri) return;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        const posts = state.feedPosts[feedId];
                        const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
                        if (post) {
                            if (payload.isLiked !== undefined) post.isLiked = payload.isLiked;
                            if (payload.isReposted !== undefined) post.isReposted = payload.isReposted;
                            if (payload.isBookmarked !== undefined) post.isBookmarked = payload.isBookmarked;
                            if (payload.likeUri !== undefined) {
                                if (!post.viewer) post.viewer = {};
                                post.viewer.like = payload.likeUri;
                            }
                            if (payload.repostUri !== undefined) {
                                if (!post.viewer) post.viewer = {};
                                post.viewer.repost = payload.repostUri;
                            }
                            post.lastUpdated = new Date().toISOString();
                        }
                    });
                }
            )
            // Rollback on Error
            .addMatcher(
                (action) => action.type.endsWith('/toggleLike/rejected') ||
                    action.type.endsWith('/repostPost/rejected') ||
                    action.type.endsWith('/toggleBookmark/rejected'),
                (state: FeedsState, action: any) => {
                    const { uri: actionUri } = action.meta.arg;
                    const type = action.type;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        const posts = state.feedPosts[feedId];
                        const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
                        if (post) {
                            // Simple toggle back
                            if (type.includes('toggleLike')) {
                                const wasLiked = post.isLiked;
                                post.isLiked = !wasLiked;
                                post.likesCount = wasLiked ? Math.max(0, post.likesCount - 1) : post.likesCount + 1;
                            } else if (type.includes('repostPost')) {
                                const wasReposted = post.isReposted;
                                post.isReposted = !wasReposted;
                                post.repostsCount = wasReposted ? Math.max(0, post.repostsCount - 1) : post.repostsCount + 1;
                            } else if (type.includes('toggleBookmark')) {
                                const wasBookmarked = post.isBookmarked;
                                post.isBookmarked = !wasBookmarked;
                                post.bookmarksCount = wasBookmarked ? Math.max(0, post.bookmarksCount - 1) : post.bookmarksCount + 1;
                            }
                        }
                    });
                }
            )
            // Synchronize Content Updates
            .addMatcher(
                (action) => action.type.endsWith('/updatePost/fulfilled'),
                (state: FeedsState, action: any) => {
                    const updatedPost = action.payload;
                    if (!updatedPost || !updatedPost.id) return;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        const posts = state.feedPosts[feedId];
                        const index = posts.findIndex(p => p.id === updatedPost.id);
                        if (index !== -1) {
                            posts[index] = { ...posts[index], ...updatedPost };
                        }
                    });
                }
            )
            // Synchronize Real-time SignalR updates (Stats)
            .addMatcher(
                (action) => action.type === 'posts/updatePostStats',
                (state: FeedsState, action: any) => {
                    const { uri: actionUri, likesCount, repostsCount, bookmarksCount, repliesCount, quotesCount, timestamp } = action.payload;
                    if (!actionUri) return;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        const posts = state.feedPosts[feedId];
                        const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
                        if (post) {
                            const isRemote = post.uri && !post.uri.includes('localhost') && !post.uri.includes('staging') && post.uri.includes('at://');
                            if (likesCount !== undefined) {
                                post.likesCount = isRemote ? Math.max(post.likesCount, likesCount) : likesCount;
                            }
                            if (repostsCount !== undefined) {
                                post.repostsCount = isRemote ? Math.max(post.repostsCount, repostsCount) : repostsCount;
                            }
                            if (bookmarksCount !== undefined) {
                                post.bookmarksCount = isRemote ? Math.max(post.bookmarksCount, bookmarksCount) : bookmarksCount;
                            }
                            if (repliesCount !== undefined) {
                                post.repliesCount = isRemote ? Math.max(post.repliesCount, repliesCount) : repliesCount;
                            }
                            if (quotesCount !== undefined) {
                                post.quotesCount = isRemote ? Math.max(post.quotesCount, quotesCount) : quotesCount;
                            }
                            post.lastUpdated = timestamp || new Date().toISOString();
                        }
                    });
                }
            )
            // Synchronize Real-time SignalR updates (User Status)
            .addMatcher(
                (action) => action.type === 'posts/updateUserPostStatus',
                (state: FeedsState, action: any) => {
                    const { uri: actionUri, isLiked, isReposted, isBookmarked } = action.payload;
                    if (!actionUri) return;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        const posts = state.feedPosts[feedId];
                        const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
                        if (post) {
                            if (isLiked !== undefined) post.isLiked = isLiked;
                            if (isReposted !== undefined) post.isReposted = isReposted;
                            if (isBookmarked !== undefined) post.isBookmarked = isBookmarked;
                            post.lastUpdated = new Date().toISOString();
                        }
                    });
                }
            )
            // Synchronize Profile Updates
            .addMatcher(
                (action) => action.type.endsWith('/updateProfile/fulfilled'),
                (state: FeedsState, action: any) => {
                    const updatedUser = action.payload;
                    if (!updatedUser || !updatedUser.id) return;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        state.feedPosts[feedId].forEach(post => {
                            if (post.author && post.author.id === updatedUser.id) {
                                post.author = { ...post.author, ...updatedUser };
                            }
                        });
                    });
                }
            );
    }
});

export const { setActiveFeed, setActiveTab, setPinnedFeedIds } = feedsSlice.actions;
export default feedsSlice.reducer;


