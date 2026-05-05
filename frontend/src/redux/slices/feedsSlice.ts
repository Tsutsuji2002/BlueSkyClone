import { createSlice, createAsyncThunk, PayloadAction, ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { Feed, Post } from '../../types';
import { matchesPost } from '../../utils/postUtils';
import { API_BASE_URL } from '../../constants';
import { feedActionKey } from '../../utils/feedKeys';
import { mapAtProtoPostToPost } from '../../utils/postMapper';

const REMOTE_METADATA_FALLBACK_DESCRIPTION = 'Remote feed metadata is temporarily unavailable.';

const isRemoteMetadataFallback = (feed: Feed): boolean =>
    (feed.description || '').trim().toLowerCase() === REMOTE_METADATA_FALLBACK_DESCRIPTION.toLowerCase();

const applyVisualMetadata = (target: Feed, source: Feed) => {
    target.name = source.name || target.name;
    target.description = source.description || target.description;
    target.handle = source.handle || target.handle;
    target.avatarUrl = source.avatarUrl || source.avatar || target.avatarUrl;
    target.avatar = source.avatar || source.avatarUrl || target.avatar;
    target.uri = source.uri || target.uri;
};

const getPostIdentityKey = (post?: Partial<Post> | null): string => {
    if (!post) return '';
    if (post.uri) return `uri:${post.uri}`;
    if (post.tid) return `tid:${post.tid}`;
    if (post.id) return `id:${post.id}`;
    if (post.cid) return `cid:${post.cid}`;
    return '';
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

const normalizeFeedPosts = (incoming: any[], existing: Post[] = []): Post[] => {
    const byKey = new Map<string, Post>();

    existing.forEach((post) => {
        const key = getPostIdentityKey(post);
        if (key) byKey.set(key, post);
    });

    incoming.map(mapAtProtoPostToPost).forEach((post) => {
        const key = getPostIdentityKey(post);
        if (!key) return;
        const existingPost = byKey.get(key);
        byKey.set(key, existingPost ? mergePostSnapshot(existingPost, post) : post);
    });

    return Array.from(byKey.values());
};

interface FeedsState {
    feeds: Feed[];
    subscribedFeeds: Feed[];
    searchResults: Feed[];
    pinnedFeedIds: string[];
    activeFeedId: string | null;
    activeTab: string;
    feedPosts: Record<string, Post[]>;
    recommendedFeeds: Feed[];
    recommendedCursor: string | null;
    isLoading: boolean;
    feedLoading: Record<string, boolean>; // per-feed loading flag for pagination
    searchLoading: boolean;
    error: string | null;
    hasMoreSearch: boolean;
    actionLoading: Record<string, boolean>;
    feedHasMore: Record<string, boolean>;
    feedCursors: Record<string, string | null>;
    feedLastFetch: Record<string, number>;
    infoLoading: Record<string, boolean>;
    infoError: Record<string, string | null>;
    userFeeds: Feed[];
    userFeedsLoading: boolean;
    lastSubscribedFeedsFetch: number;
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
    recommendedCursor: null,
    isLoading: false,
    feedLoading: {},
    searchLoading: false,
    error: null,
    hasMoreSearch: true,
    actionLoading: {},
    feedHasMore: {},
    feedCursors: {},
    feedLastFetch: {},
    infoLoading: {},
    infoError: {},
    userFeeds: [],
    userFeedsLoading: false,
    lastSubscribedFeedsFetch: 0,
};

export const fetchTrendingFeeds = createAsyncThunk<
    Feed[],
    void,
    { rejectValue: string }
>(
    'feeds/fetchTrendingFeeds',
    async (_: void, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/feeds/trending`);
            const data = await response.json();
            console.log('feedsSlice: fetchTrendingFeeds returned:', data);
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch trending feeds');
            return data.feeds || data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchRecommendedFeeds = createAsyncThunk<
    { feeds: Feed[], cursor: string | null },
    { cursor?: string | null, limit?: number } | void,
    { rejectValue: string }
>(
    'feeds/fetchRecommendedFeeds',
    async (params, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const cursor = params && typeof params === 'object' ? params.cursor : null;
            const limit = (params && typeof params === 'object' && typeof params.limit === 'number') ? params.limit : 10;

            let url = `${API_BASE_URL}/feeds/recommended?limit=${limit}`;
            if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

            const response = await fetch(url);
            const data = await response.json();
            
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch recommended feeds');
            
            // Backend now returns PagedFeedsDto { feeds, cursor }
            return {
                feeds: data.feeds || data, // Fallback for backward compatibility if backend not updated yet
                cursor: data.cursor || null
            };
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
    async (_: void, { rejectWithValue, getState }: { rejectWithValue: (value: string) => any, getState: () => any }) => {
        try {
            const state = getState() as { feeds: FeedsState };
            const now = Date.now();
            // Throttle: don't fetch more than once every 10 seconds unless it's the first time
            if (state.feeds.lastSubscribedFeedsFetch && (now - state.feeds.lastSubscribedFeedsFetch < 10000)) {
                console.log('feedsSlice: fetchSubscribedFeeds throttled (called too recently)');
                return state.feeds.subscribedFeeds;
            }

            const response = await fetch(`${API_BASE_URL}/feeds/subscribed`);
            const data = await response.json();
            console.log('feedsSlice: fetchSubscribedFeeds returned:', data);
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch subscribed feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchUserFeeds = createAsyncThunk<
    Feed[],
    string,
    { rejectValue: string }
>(
    'feeds/fetchUserFeeds',
    async (actor: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_BASE_URL}/feeds/actor/${actor}`);
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch user feeds');
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
            const response = await fetch(`${API_BASE_URL}/feeds/save/${encodeURIComponent(feedId)}`, {
                method: 'POST'
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
            const response = await fetch(`${API_BASE_URL}/feeds/unsave/${encodeURIComponent(feedId)}`, {
                method: 'DELETE'
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
            const response = await fetch(`${API_BASE_URL}/feeds/pin/${encodeURIComponent(feedId)}`, {
                method: 'POST'
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
            const response = await fetch(`${API_BASE_URL}/feeds/unpin/${encodeURIComponent(feedId)}`, {
                method: 'DELETE'
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
            const response = await fetch(`${API_BASE_URL}/feeds/reorder`, {
                method: 'POST',
                headers: {
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
            const response = await fetch(`${API_BASE_URL}/feeds/reorder-pinned`, {
                method: 'POST',
                headers: {
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
            const isRemoteKey = feedId.startsWith('at://') || feedId === 'following' || feedId === 'discover';
            const url = isRemoteKey
                ? `${API_BASE_URL}/feeds/resolve?uri=${encodeURIComponent(feedId)}`
                : `${API_BASE_URL}/feeds/info/${feedId}`;
            const response = await fetch(url);
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
            const response = await fetch(`${API_BASE_URL}/feeds/search?query=${encodeURIComponent(query)}&skip=${skip}&take=${take}`);
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to search feeds');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchFeedPosts = createAsyncThunk<
    { feedId: string; posts: Post[]; isMore: boolean; cursor: string | null },
    { feedId: string; skip: number; take?: number; cursor?: string | null; refresh?: boolean },
    { rejectValue: string }
>(
    'feeds/fetchPosts',
    async ({ feedId, skip, take = 5, cursor, refresh = false }: { feedId: string; skip: number; take?: number, cursor?: string | null, refresh?: boolean }, { rejectWithValue }: { rejectWithValue: (value: string) => any }) => {
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/unified-feed?feedId=${encodeURIComponent(feedId)}&skip=${skip}&take=${take}`;
            if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
            if (refresh) url += `&refresh=true`;

            const headers: Record<string, string> = {};
            if (token && token !== 'null') headers.Authorization = `Bearer ${token}`;

            const response = await fetch(url, { headers });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.error || 'Failed to fetch feed posts');
            
            const rawPosts = data.posts || (Array.isArray(data) ? data : []);
            return {
                feedId,
                posts: rawPosts,
                isMore: data.hasMore ?? (Array.isArray(data) ? rawPosts.length >= take : rawPosts.length >= take),
                cursor: data.cursor || null
            };
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
                if (state.feeds.length === 0) {
                    state.isLoading = true;
                }
            })
            .addCase(fetchTrendingFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.isLoading = false;
                state.feeds = action.payload;
            })
            .addCase(fetchTrendingFeeds.rejected, (state: FeedsState, action: any) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchRecommendedFeeds.fulfilled, (state: FeedsState, action: any) => {
                const { feeds, cursor } = action.payload;
                
                if (!action.meta.arg || !(action.meta.arg as any).cursor) {
                    state.recommendedFeeds = feeds;
                } else {
                    const existingUris = new Set(state.recommendedFeeds.map((f: Feed) => feedActionKey(f)));
                    const newFeeds = feeds.filter((f: Feed) => !existingUris.has(feedActionKey(f)));
                    state.recommendedFeeds = [...state.recommendedFeeds, ...newFeeds];
                }
                
                state.recommendedCursor = cursor;

                const recommendedByKey = new Map<string, Feed>();
                feeds.forEach((feed: Feed) => {
                    recommendedByKey.set(feedActionKey(feed), feed);
                });

                state.subscribedFeeds.forEach((feed) => {
                    if (!isRemoteMetadataFallback(feed)) return;
                    const preferred = recommendedByKey.get(feedActionKey(feed));
                    if (preferred) {
                        applyVisualMetadata(feed, preferred);
                    }
                });
            })
            .addCase(fetchSubscribedFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.lastSubscribedFeedsFetch = Date.now();
                const cacheByKey = new Map<string, Feed>();
                [...state.subscribedFeeds, ...state.recommendedFeeds, ...state.searchResults, ...state.feeds].forEach((feed) => {
                    cacheByKey.set(feedActionKey(feed), feed);
                });

                state.subscribedFeeds = action.payload.map((incoming) => {
                    const key = feedActionKey(incoming);
                    const cached = cacheByKey.get(key);
                    if (!cached) return incoming;
                    if (!isRemoteMetadataFallback(incoming) && incoming.name?.trim()) return incoming;

                    const merged = { ...incoming };
                    applyVisualMetadata(merged, cached);
                    return merged;
                });
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
            // Fetch User Feeds (Actor Feeds)
            .addCase(fetchUserFeeds.pending, (state: FeedsState) => {
                state.userFeedsLoading = true;
                state.error = null;
            })
            .addCase(fetchUserFeeds.fulfilled, (state: FeedsState, action: PayloadAction<Feed[]>) => {
                state.userFeedsLoading = false;
                state.userFeeds = action.payload;
            })
            .addCase(fetchUserFeeds.rejected, (state: FeedsState, action: any) => {
                state.userFeedsLoading = false;
                state.error = action.payload;
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
                const existingPosts = state.feedPosts[feedId] || [];
                
                if (skip === 0 && existingPosts.length === 0) {
                    // Only show skeleton on truly fresh load (first time)
                    state.isLoading = true;
                    state.feedPosts[feedId] = [];
                }
                // Always mark per-feed as loading (for pagination spinner in footer)
                state.feedLoading[feedId] = true;
            })
            .addCase(fetchFeedPosts.fulfilled, (state: FeedsState, action: any) => {
                const { feedId, posts, isMore, cursor } = action.payload;
                state.isLoading = false;
                state.feedLoading[feedId] = false;
                const existingPosts = state.feedPosts[feedId] || [];
                if (!state.feedPosts[feedId] || action.meta.arg.skip === 0) {
                    state.feedPosts[feedId] = normalizeFeedPosts(posts || [], []);
                    state.feedLastFetch[feedId] = Date.now();
                } else {
                    state.feedPosts[feedId] = normalizeFeedPosts(posts || [], existingPosts);
                }
                state.feedHasMore[feedId] = isMore !== undefined ? isMore : posts.length > 0;
                state.feedCursors[feedId] = cursor || null;
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
                (action) => action.type.endsWith('/fulfilled') && (action.type.includes('toggleLike') || action.type.includes('repostPost') || action.type.includes('toggleBookmark')),
                (state: FeedsState, action: PayloadAction<any>) => {
                    const payload = action.payload;
                    if (!payload || !payload.uri) return;

                    // Update interaction truth is not in this slice, but we sync the posts
                    Object.keys(state.feedPosts).forEach(feedId => {
                        state.feedPosts[feedId].forEach(post => {
                            const updateRecursive = (p: Post) => {
                                if (matchesPost(p, payload)) {
                                    if (payload.isLiked !== undefined) p.isLiked = payload.isLiked;
                                    if (payload.isReposted !== undefined) p.isReposted = payload.isReposted;
                                    if (payload.isBookmarked !== undefined) p.isBookmarked = payload.isBookmarked;
                                    if (payload.likesCount !== undefined) p.likesCount = payload.likesCount;
                                    if (payload.repostsCount !== undefined) p.repostsCount = payload.repostsCount;
                                    
                                    if (payload.likeUri !== undefined) {
                                        if (!p.viewer) p.viewer = {};
                                        p.viewer.like = payload.likeUri;
                                    }
                                    if (payload.repostUri !== undefined) {
                                        if (!p.viewer) p.viewer = {};
                                        p.viewer.repost = payload.repostUri;
                                    }
                                    p.lastUpdated = new Date().toISOString();
                                }
                                if (p.quotePost) updateRecursive(p.quotePost);
                                if (p.parentPost) updateRecursive(p.parentPost);
                            };
                            updateRecursive(post);
                        });
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
                            if (likesCount !== undefined) post.likesCount = likesCount;
                            if (repostsCount !== undefined) post.repostsCount = repostsCount;
                            if (bookmarksCount !== undefined) post.bookmarksCount = bookmarksCount;
                            if (repliesCount !== undefined) post.repliesCount = repliesCount;
                            if (quotesCount !== undefined) post.quotesCount = quotesCount;
                            post.lastUpdated = timestamp || new Date().toISOString();
                        }
                    });
                }
            )
            .addMatcher(
                (action) => action.type === 'posts/fetchPostById/fulfilled',
                (state: FeedsState, action: any) => {
                    const detailedPost = action.payload;
                    if (!detailedPost) return;

                    const normalizedPost = mapAtProtoPostToPost(detailedPost);
                    const detailKey = getPostIdentityKey(normalizedPost);
                    if (!detailKey) return;

                    Object.keys(state.feedPosts).forEach(feedId => {
                        state.feedPosts[feedId] = state.feedPosts[feedId].map((post) => {
                            const key = getPostIdentityKey(post);
                            if (key !== detailKey) return post;
                            return mergePostSnapshot(post, normalizedPost);
                        });
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
