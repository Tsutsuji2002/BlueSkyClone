import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import { ListDto, ListItemDto, CreateListDto, UpdateListDto, Post, UserDto } from '../../types';
import listService from '../../services/listsService';
import { API_BASE_URL } from '../../constants';

interface ListsState {
    myLists: ListDto[];
    userLists: ListDto[];
    listsIAmOn: ListDto[];
    pinnedLists: ListDto[];
    activeList: ListDto | null;
    activeListMembers: ListItemDto[];
    candidateMembers: UserDto[]; // For adding members
    candidatePosts: Post[]; // For adding posts
    activeListFeed: Post[];
    isLoading: boolean;
    hasMoreFeed: boolean;
    error: string | null;
}

const initialState: ListsState = {
    myLists: [],
    userLists: [],
    listsIAmOn: [],
    pinnedLists: [],
    activeList: null,
    activeListMembers: [],
    candidateMembers: [],
    candidatePosts: [],
    activeListFeed: [],
    isLoading: false,
    hasMoreFeed: true,
    error: null,
};

// ---------- XRPC helpers (bypass @atproto/api SDK validation) ----------
const getXrpcBase = () =>
    (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '') + '/xrpc';

const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const mapListFromXrpc = (list: any): ListDto => {
    const id = list.id || (list.uri ? list.uri.split('/').pop() : '');
    const creator = list.creator || list.owner;
    
    return {
        id: id || '',
        uri: list.uri || '',
        cid: list.cid || '',
        ownerId: creator?.did || '',
        owner: creator ? {
            id: creator.did || '',
            did: creator.did || '',
            handle: creator.handle || '',
            displayName: creator.displayName || creator.handle || '',
            avatar: creator.avatar,
            avatarUrl: creator.avatar,
            username: creator.handle || '',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0
        } : undefined,
        name: list.name || '',
        description: list.description,
        purpose: list.purpose,
        avatarUrl: list.avatar || list.avatarUrl,
        membersCount: list.membersCount || 0,
        postsCount: list.postsCount || 0,
        createdAt: list.indexedAt || list.createdAt,
        isPinned: list.isPinned || false,
        isOwner: list.isOwner || false
    };
};

// ---------- Async Thunks ----------

// fetchMyLists and fetchUserLists use XRPC direct fetch to bypass @atproto/api SDK schema validation
export const fetchMyLists = createAsyncThunk(
    'lists/fetchMyLists',
    async (_, { rejectWithValue }) => {
        try {
            const res = await fetch(`${getXrpcBase()}/app.bsky.graph.getLists?limit=50`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) {
                // Fallback to internal REST API if XRPC fails
                return await listService.getMyLists();
            }
            const data = await res.json();
            const lists: any[] = data.lists || data.items || [];
            // If no results from XRPC (e.g. actor param missing), try REST
            if (lists.length === 0) {
                return await listService.getMyLists();
            }
            return lists.map(mapListFromXrpc);
        } catch (error: any) {
            // Fallback to internal REST API
            try {
                return await listService.getMyLists();
            } catch {
                return rejectWithValue(error.response?.data?.message || 'Failed to fetch lists');
            }
        }
    }
);

export const fetchUserLists = createAsyncThunk(
    'lists/fetchUserLists',
    async (userId: string, { rejectWithValue }) => {
        try {
            return await listService.getUserLists(userId);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch user lists');
        }
    }
);

export const fetchPinnedLists = createAsyncThunk(
    'lists/fetchPinnedLists',
    async (_, { rejectWithValue }) => {
        try {
            return await listService.getPinnedLists();
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch pinned lists');
        }
    }
);

export const createList = createAsyncThunk(
    'lists/createList',
    async (data: CreateListDto, { rejectWithValue }) => {
        try {
            return await listService.createList(data);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create list');
        }
    }
);

export const fetchListById = createAsyncThunk(
    'lists/fetchListById',
    async (id: string, { rejectWithValue }) => {
        try {
            return await listService.getList(id);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch list');
        }
    }
);

export const updateList = createAsyncThunk(
    'lists/updateList',
    async ({ id, data }: { id: string; data: UpdateListDto }, { rejectWithValue }) => {
        try {
            return await listService.updateList(id, data);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update list');
        }
    }
);

export const deleteList = createAsyncThunk(
    'lists/deleteList',
    async (id: string, { rejectWithValue }) => {
        try {
            await listService.deleteList(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete list');
        }
    }
);

export const pinList = createAsyncThunk(
    'lists/pinList',
    async (id: string, { rejectWithValue }) => {
        try {
            await listService.pinList(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to pin list');
        }
    }
);

export const unpinList = createAsyncThunk(
    'lists/unpinList',
    async (id: string, { rejectWithValue }) => {
        try {
            await listService.unpinList(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to unpin list');
        }
    }
);

export const fetchListMembers = createAsyncThunk(
    'lists/fetchListMembers',
    async (id: string, { rejectWithValue }) => {
        try {
            return await listService.getMembers(id);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch members');
        }
    }
);

export const fetchListFeed = createAsyncThunk(
    'lists/fetchListFeed',
    async ({ id, skip = 0, take = 20 }: { id: string; skip?: number; take?: number }, { rejectWithValue }) => {
        try {
            return await listService.getListFeed(id, skip, take);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch list feed');
        }
    }
);

export const fetchListsIAmOn = createAsyncThunk(
    'lists/fetchListsIAmOn',
    async (_, { rejectWithValue }) => {
        try {
            return await listService.getListsIAmOn();
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch participating lists');
        }
    }
);

export const fetchCandidateMembers = createAsyncThunk(
    'lists/fetchCandidateMembers',
    async ({ listId, query }: { listId: string; query?: string }, { rejectWithValue }) => {
        try {
            return await listService.getCandidateMembers(listId, query);
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch candidates');
        }
    }
);

export const addListMember = createAsyncThunk(
    'lists/addListMember',
    async ({ listId, userId }: { listId: string; userId: string }, { rejectWithValue }) => {
        try {
            await listService.addMember(listId, userId);
            return { listId, userId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to add member');
        }
    }
);

export const removeListMember = createAsyncThunk(
    'lists/removeListMember',
    async ({ listId, userId }: { listId: string; userId: string }, { rejectWithValue }) => {
        try {
            await listService.removeMember(listId, userId);
            return { listId, userId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to remove member');
        }
    }
);

export const fetchCandidatePosts = createAsyncThunk(
    'lists/fetchCandidatePosts',
    async ({ listId, userId, take = 20, skip = 0 }: { listId: string; userId: string; take?: number; skip?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/lists/${listId}/candidate-posts?userId=${userId}&take=${take}&skip=${skip}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch posts');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const addListPost = createAsyncThunk(
    'lists/addListPost',
    async ({ listId, postId, caption }: { listId: string; postId: string; caption?: string }, { rejectWithValue }) => {
        try {
            await listService.addPost(listId, postId, caption);
            return { listId, postId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to add post');
        }
    }
);

export const removeListPost = createAsyncThunk(
    'lists/removeListPost',
    async ({ listId, postId }: { listId: string; postId: string }, { rejectWithValue }) => {
        try {
            await listService.removePost(listId, postId);
            return { listId, postId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to remove post');
        }
    }
);

export const acceptInvitation = createAsyncThunk(
    'lists/acceptInvitation',
    async (id: string, { rejectWithValue }) => {
        try {
            await listService.acceptInvitation(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to accept invitation');
        }
    }
);

export const rejectInvitation = createAsyncThunk(
    'lists/rejectInvitation',
    async (id: string, { rejectWithValue }) => {
        try {
            await listService.rejectInvitation(id);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to reject invitation');
        }
    }
);

const listsSlice = createSlice({
    name: 'lists',
    initialState,
    reducers: {
        clearActiveList: (state) => {
            state.activeList = null;
            state.activeListMembers = [];
            state.activeListFeed = [];
            state.candidateMembers = [];
        },
        clearCandidates: (state) => {
            state.candidateMembers = [];
        },
        clearCandidatePosts: (state) => {
            state.candidatePosts = [];
        }
    },
    extraReducers: (builder) => {
        // Fetch My Lists
        builder.addCase(fetchMyLists.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchMyLists.fulfilled, (state, action) => {
            state.isLoading = false;
            state.myLists = action.payload;
        });
        builder.addCase(fetchMyLists.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Fetch Pinned Lists
        builder.addCase(fetchPinnedLists.fulfilled, (state, action) => {
            state.pinnedLists = action.payload;
        });

        // Create List
        builder.addCase(createList.fulfilled, (state, action) => {
            state.myLists.unshift(action.payload);
        });

        // Fetch List By Id
        builder.addCase(fetchListById.pending, (state) => {
            state.isLoading = true;
        });
        builder.addCase(fetchListById.fulfilled, (state, action) => {
            state.isLoading = false;
            state.activeList = action.payload;
        });
        builder.addCase(fetchListById.rejected, (state) => {
            state.isLoading = false;
        });

        // Update List
        builder.addCase(updateList.fulfilled, (state, action) => {
            state.activeList = action.payload;
            const index = state.myLists.findIndex(l => l.id === action.payload.id);
            if (index !== -1) {
                state.myLists[index] = action.payload;
            }
        });

        // Delete List
        builder.addCase(deleteList.fulfilled, (state, action) => {
            state.myLists = state.myLists.filter(l => l.id !== action.payload);
            if (state.activeList?.id === action.payload) {
                state.activeList = null;
            }
        });

        // Pin/Unpin
        builder.addCase(pinList.fulfilled, (state, action) => {
            if (state.activeList && state.activeList.id === action.payload) {
                state.activeList.isPinned = true;
            }
            const list = state.myLists.find(l => l.id === action.payload);
            if (list) list.isPinned = true;
        });
        builder.addCase(unpinList.fulfilled, (state, action) => {
            if (state.activeList && state.activeList.id === action.payload) {
                state.activeList.isPinned = false;
            }
            const list = state.myLists.find(l => l.id === action.payload);
            if (list) list.isPinned = false;
            state.pinnedLists = state.pinnedLists.filter(l => l.id !== action.payload);
        });

        // Members
        builder.addCase(fetchListMembers.fulfilled, (state, action) => {
            state.activeListMembers = action.payload;
        });

        // Feed
        builder.addCase(fetchListFeed.pending, (state, action: any) => {
            const { skip } = action.meta.arg || { skip: 0 };
            if (skip === 0) {
                state.activeListFeed = [];
            }
        });
        builder.addCase(fetchListFeed.fulfilled, (state, action: any) => {
            const { skip } = action.meta.arg || { skip: 0 };
            if (skip === 0) {
                state.activeListFeed = action.payload;
            } else {
                const existingIds = new Set(state.activeListFeed.map(p => p.id));
                const newPosts = action.payload.filter((p: Post) => !existingIds.has(p.id));
                state.activeListFeed = [...state.activeListFeed, ...newPosts];
            }
            state.hasMoreFeed = action.payload.length > 0;
        });

        // Fetch User Lists
        builder.addCase(fetchUserLists.pending, (state) => {
            state.isLoading = true;
            state.error = null;
        });
        builder.addCase(fetchUserLists.fulfilled, (state, action) => {
            state.isLoading = false;
            state.userLists = action.payload;
        });
        builder.addCase(fetchUserLists.rejected, (state, action) => {
            state.isLoading = false;
            state.error = action.payload as string;
        });

        // Lists I Am On
        builder.addCase(fetchListsIAmOn.fulfilled, (state, action) => {
            state.listsIAmOn = action.payload;
        });

        // Candidate Members
        builder.addCase(fetchCandidateMembers.fulfilled, (state, action) => {
            state.candidateMembers = action.payload;
        });

        // Add Member
        builder.addCase(addListMember.fulfilled, (state, action) => {
            state.candidateMembers = state.candidateMembers.filter(u => u.id !== action.payload.userId);
        });

        // Remove Member
        builder.addCase(removeListMember.fulfilled, (state, action) => {
            if (state.activeList?.id === action.payload.listId) {
                state.activeListMembers = state.activeListMembers.filter(m => m.userId !== action.payload.userId);
                state.activeList.membersCount = Math.max(0, state.activeList.membersCount - 1);
            }
        });

        // Add Post
        builder.addCase(addListPost.fulfilled, (state) => {
            // Invalidate feed so it reloads
        });

        // Remove Post
        builder.addCase(removeListPost.fulfilled, (state, action) => {
            state.activeListFeed = state.activeListFeed.filter(p => p.id !== action.payload.postId);
        });

        // Accept Invitation
        builder.addCase(acceptInvitation.fulfilled, (state, action) => {
            // Remove from listsIAmOn if we want to refresh or update it
            // Typically we'd refetch listsIAmOn after this
        });

        // Reject Invitation
        builder.addCase(rejectInvitation.fulfilled, (state, action) => {
            state.listsIAmOn = state.listsIAmOn.filter(l => l.id !== action.payload);
        });

        // Candidate Posts
        builder.addCase(fetchCandidatePosts.fulfilled, (state, action: any) => {
            const { skip } = action.meta.arg || { skip: 0 };
            if (skip && skip > 0) {
                const newPosts = action.payload.filter((p: Post) => !state.candidatePosts.some(existing => existing.id === p.id));
                state.candidatePosts = [...state.candidatePosts, ...newPosts];
            } else {
                state.candidatePosts = action.payload;
            }
        });

        builder
            // Synchronize interactions across list feeds (Optimistic)
            .addMatcher(
            (action) => action.type.endsWith('/toggleLike/pending') ||
                action.type.endsWith('/repostPost/pending') ||
                action.type.endsWith('/toggleBookmark/pending'),
            (state: ListsState, action: any) => {
                const { uri: actionUri } = action.meta.arg;
                const type = action.type;

                const applyOptimistic = (posts: Post[]) => {
                    const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
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
                };

                applyOptimistic(state.activeListFeed);
                applyOptimistic(state.candidatePosts);
            }
        )
        // Synchronize interactions across list feeds (Fulfilled/Final)
        .addMatcher(
            (action) => action.type.endsWith('/toggleLike/fulfilled') ||
                action.type.endsWith('/repostPost/fulfilled') ||
                action.type.endsWith('/toggleBookmark/fulfilled'),
            (state: ListsState, action: any) => {
                const payload = action.payload;
                const actionUri = payload.uri || payload.postId; // Fallback to postId for backward compatibility
                if (!actionUri) return;

                const applyFinal = (posts: Post[]) => {
                    const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
                    if (post) {
                        if (payload.isLiked !== undefined) post.isLiked = payload.isLiked;
                        if (payload.isReposted !== undefined) post.isReposted = payload.isReposted;
                        if (payload.isBookmarked !== undefined) post.isBookmarked = payload.isBookmarked;
                        if (payload.likesCount !== undefined) post.likesCount = payload.likesCount;
                        if (payload.repostsCount !== undefined) post.repostsCount = payload.repostsCount;
                        if (payload.bookmarksCount !== undefined) post.bookmarksCount = payload.bookmarksCount;
                        
                        if (payload.likeUri !== undefined) {
                            if (!post.viewer) post.viewer = {};
                            post.viewer.like = payload.likeUri;
                        }
                        if (payload.repostUri !== undefined) {
                            if (!post.viewer) post.viewer = {};
                            post.viewer.repost = payload.repostUri;
                        }
                    }
                };

                applyFinal(state.activeListFeed);
                applyFinal(state.candidatePosts);
            }
        )
        // Rollback on Error
        .addMatcher(
            (action) => action.type.endsWith('/toggleLike/rejected') ||
                action.type.endsWith('/repostPost/rejected') ||
                action.type.endsWith('/toggleBookmark/rejected'),
            (state: ListsState, action: any) => {
                const { uri: actionUri } = action.meta.arg;
                const type = action.type;

                const rollback = (posts: Post[]) => {
                    const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
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
                };

                rollback(state.activeListFeed);
                rollback(state.candidatePosts);
            }
        )
        // Synchronize Real-time SignalR updates (Stats)
        .addMatcher(
            (action) => action.type === 'posts/updatePostStats',
            (state: ListsState, action: any) => {
                const { uri: actionUri, likesCount, repostsCount, bookmarksCount, repliesCount, quotesCount } = action.payload;
                if (!actionUri) return;

                const updateStats = (posts: Post[]) => {
                    const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
                    if (post) {
                        if (likesCount !== undefined) post.likesCount = likesCount;
                        if (repostsCount !== undefined) post.repostsCount = repostsCount;
                        if (bookmarksCount !== undefined) post.bookmarksCount = bookmarksCount;
                        if (repliesCount !== undefined) post.repliesCount = repliesCount;
                        if (quotesCount !== undefined) post.quotesCount = quotesCount;
                    }
                };

                updateStats(state.activeListFeed);
                updateStats(state.candidatePosts);
            }
        )
        // Synchronize Real-time SignalR updates (User Status)
        .addMatcher(
            (action) => action.type === 'posts/updateUserPostStatus',
            (state: ListsState, action: any) => {
                const { uri: actionUri, isLiked, isReposted, isBookmarked } = action.payload;
                if (!actionUri) return;

                const updateStatus = (posts: Post[]) => {
                    const post = posts.find(p => p.uri === actionUri || p.id === actionUri || p.tid === actionUri || (p.uri && p.uri.endsWith('/' + actionUri.split('/').pop()!)));
                    if (post) {
                        if (isLiked !== undefined) post.isLiked = isLiked;
                        if (isReposted !== undefined) post.isReposted = isReposted;
                        if (isBookmarked !== undefined) post.isBookmarked = isBookmarked;
                    }
                };

                updateStatus(state.activeListFeed);
                updateStatus(state.candidatePosts);
            }
        )
        // Synchronize Content Updates
        .addMatcher(
            (action) => action.type.endsWith('/updatePost/fulfilled'),
            (state: ListsState, action: any) => {
                const updatedPost = action.payload;
                if (!updatedPost || !updatedPost.id) return;

                const updateContent = (posts: Post[]) => {
                    const index = posts.findIndex(p => p.id === updatedPost.id);
                    if (index !== -1) {
                        posts[index] = { ...posts[index], ...updatedPost };
                    }
                };

                updateContent(state.activeListFeed);
                updateContent(state.candidatePosts);
            }
        )
        // Synchronize Profile Updates
        .addMatcher(
            (action) => action.type.endsWith('/updateProfile/fulfilled'),
            (state: ListsState, action: any) => {
                const updatedUser = action.payload;
                if (!updatedUser || !updatedUser.id) return;

                const updateAuthor = (posts: Post[]) => {
                    posts.forEach(post => {
                        if (post.author && post.author.id === updatedUser.id) {
                            post.author = { ...post.author, ...updatedUser };
                        }
                    });
                };

                updateAuthor(state.activeListFeed);
                updateAuthor(state.candidatePosts);
            }
        );
    }
});

export const { clearActiveList, clearCandidates, clearCandidatePosts } = listsSlice.actions;
export default listsSlice.reducer;
