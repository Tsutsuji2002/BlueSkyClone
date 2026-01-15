import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { Feed, Post } from '../../types';
import { API_BASE_URL } from '../../constants';

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
    searchLoading: boolean;
    error: string | null;
    hasMoreSearch: boolean;
}

const initialState: FeedsState = {
    feeds: [],
    subscribedFeeds: [],
    searchResults: [],
    pinnedFeedIds: [],
    activeFeedId: null,
    activeTab: 'following', // Default to following
    feedPosts: {},
    recommendedFeeds: [],
    isLoading: false,
    searchLoading: false,
    error: null,
    hasMoreSearch: true,
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
    async (feedId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/save/${feedId}`, {
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
    async (feedId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/unsave/${feedId}`, {
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
    async (feedId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/pin/${feedId}`, {
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
    async (feedId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/unpin/${feedId}`, {
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

export const fetchFeedInfo = createAsyncThunk<
    Feed,
    string,
    { rejectValue: string }
>(
    'feeds/fetchInfo',
    async (feedId: string, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/feeds/info/${feedId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
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
            const response = await fetch(`${API_BASE_URL}/feeds/${feedId}/posts?skip=${skip}&take=${take}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch feed posts');
            return { feedId, posts: data, isMore: data.length === take };
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
                state.pinnedFeedIds = action.payload.filter((f: Feed) => f.isPinned).map((f: Feed) => f.id);
            })
            .addCase(fetchFeedInfo.pending, (state: FeedsState) => {
                state.isLoading = true;
            })
            .addCase(fetchFeedInfo.fulfilled, (state: FeedsState, action: PayloadAction<Feed>) => {
                state.isLoading = false;
                // Add to searchResults or another cache if not already present
                if (!state.subscribedFeeds.find(f => f.id === action.payload.id)) {
                    // We don't want to duplicate, just make it available for Detail page
                    // Maybe put it in feeds array which we use as a general cache
                    const index = state.feeds.findIndex(f => f.id === action.payload.id);
                    if (index >= 0) {
                        state.feeds[index] = action.payload;
                    } else {
                        state.feeds.push(action.payload);
                    }
                }
            })
            .addCase(fetchFeedInfo.rejected, (state: FeedsState, action: any) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(searchFeeds.pending, (state: FeedsState) => {
                state.searchLoading = true;
            })
            .addCase(searchFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.searchLoading = false;
                state.searchResults = action.payload;
                state.hasMoreSearch = action.payload.length === 10;
            })
            .addCase(pinFeed.fulfilled, (state: FeedsState, action: any) => {
                state.isLoading = false;
                const feedId = action.meta.arg;

                const updateInList = (list: Feed[]) => {
                    const f = list.find(x => x.id === feedId);
                    if (f) {
                        f.isPinned = true;
                        f.isSubscribed = true;
                    }
                };

                updateInList(state.feeds);
                updateInList(state.searchResults);
                updateInList(state.recommendedFeeds);

                // Handle subscribedFeeds
                let subFeed = state.subscribedFeeds.find(f => f.id === feedId);
                if (subFeed) {
                    subFeed.isPinned = true;
                    subFeed.isSubscribed = true;
                } else {
                    const sourceFeed = state.feeds.find(f => f.id === feedId) ||
                        state.searchResults.find(f => f.id === feedId) ||
                        state.recommendedFeeds.find(f => f.id === feedId);
                    if (sourceFeed) {
                        state.subscribedFeeds.push({ ...sourceFeed, isPinned: true, isSubscribed: true });
                    }
                }

                if (!state.pinnedFeedIds.includes(feedId)) {
                    state.pinnedFeedIds.push(feedId);
                }
            })
            .addCase(unpinFeed.fulfilled, (state: FeedsState, action: any) => {
                state.isLoading = false;
                const feedId = action.meta.arg;

                const updateInList = (list: Feed[]) => {
                    const f = list.find(x => x.id === feedId);
                    if (f) {
                        f.isPinned = false;
                    }
                };

                updateInList(state.feeds);
                updateInList(state.searchResults);
                updateInList(state.recommendedFeeds);
                updateInList(state.subscribedFeeds);

                state.pinnedFeedIds = state.pinnedFeedIds.filter(id => id !== feedId);
            })
            .addCase(saveFeed.fulfilled, (state: FeedsState, action: any) => {
                const feedId = action.meta.arg;
                const sourceFeed = state.searchResults.find(f => f.id === feedId) ||
                    state.recommendedFeeds.find(f => f.id === feedId);

                if (sourceFeed) {
                    sourceFeed.isSubscribed = true;
                    if (!state.subscribedFeeds.find(f => f.id === feedId)) {
                        state.subscribedFeeds.push({ ...sourceFeed, isSubscribed: true });
                    }
                }
            })
            .addCase(unsaveFeed.fulfilled, (state: FeedsState, action: any) => {
                const feedId = action.meta.arg;
                const findAndUpdate = (list: Feed[]) => {
                    const f = list.find(x => x.id === feedId);
                    if (f) {
                        f.isSubscribed = false;
                        f.isPinned = false;
                    }
                };
                findAndUpdate(state.searchResults);
                findAndUpdate(state.recommendedFeeds);
                state.subscribedFeeds = state.subscribedFeeds.filter(f => f.id !== feedId);
                state.pinnedFeedIds = state.pinnedFeedIds.filter(id => id !== feedId);
            })
            .addCase(fetchFeedPosts.pending, (state: FeedsState) => {
                state.isLoading = true;
            })
            .addCase(fetchFeedPosts.fulfilled, (state: FeedsState, action: any) => {
                state.isLoading = false;
                const { feedId, posts } = action.payload;
                if (!state.feedPosts[feedId] || action.meta.arg.skip === 0) {
                    state.feedPosts[feedId] = posts;
                } else {
                    state.feedPosts[feedId] = [...state.feedPosts[feedId], ...posts];
                }
            })
            .addCase(fetchFeedPosts.rejected, (state: FeedsState, action: any) => {
                state.isLoading = false;
                state.error = action.payload as string;
            });
    }
});

export const { setActiveFeed, setActiveTab, setPinnedFeedIds } = feedsSlice.actions;
export default feedsSlice.reducer;
