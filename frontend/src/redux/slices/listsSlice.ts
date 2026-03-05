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
    error: null,
};

// Async Thunks

export const fetchMyLists = createAsyncThunk(
    'lists/fetchMyLists',
    async (_, { rejectWithValue }) => {
        try {
            return await listService.getMyLists();
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch lists');
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
    async (id: string, { rejectWithValue }) => {
        try {
            return await listService.getListFeed(id);
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
    async ({ listId, userId, limit = 10, offset = 0 }: { listId: string; userId: string; limit?: number; offset?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/lists/${listId}/candidate-posts?userId=${userId}&limit=${limit}&offset=${offset}`, {
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
            // Optimistic update? Need whole object.
            // For now, fetchPinnedLists should be called after.
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
        builder.addCase(fetchListFeed.fulfilled, (state, action) => {
            state.activeListFeed = action.payload;
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
            // Optimistically update active members if we have the user detail? 
            // We only have userId. So we might need to rely on refetch or pass user object. 
            // For now, let's just trigger a refetch in UI or let UI handle it. 
            // Better: remove from candidates
            state.candidateMembers = state.candidateMembers.filter(u => u.id !== action.payload.userId);
        });

        // Remove Member
        builder.addCase(removeListMember.fulfilled, (state, action) => {
            if (state.activeList?.id === action.payload.listId) {
                state.activeListMembers = state.activeListMembers.filter(m => m.userId !== action.payload.userId);
                state.activeList.membersCount = Math.max(0, state.activeList.membersCount - 1);
            }
            // If I removed myself, logic to update listsIAmOn
            // But checking my ID in reducer is hard without auth state access. 
            // UI should handle refetching listsIAmOn if needed.
            // UI should handle refetching listsIAmOn if needed.
        });

        // Add Post
        builder.addCase(addListPost.fulfilled, (state) => {
            // Invalidate feed so it reloads
            // Or we could try to just add it if we had the object, but we don't.
        });

        // Remove Post
        builder.addCase(removeListPost.fulfilled, (state, action) => {
            state.activeListFeed = state.activeListFeed.filter(p => p.id !== action.payload.postId);
        });
        // Candidate Posts
        builder.addCase(fetchCandidatePosts.fulfilled, (state, action) => {
            if (action.meta.arg.offset && action.meta.arg.offset > 0) {
                // Check for duplicates before appending?
                const newPosts = action.payload.filter((p: Post) => !state.candidatePosts.some(existing => existing.id === p.id));
                state.candidatePosts = [...state.candidatePosts, ...newPosts];
            } else {
                state.candidatePosts = action.payload;
            }
        });

        builder.addMatcher(
            (action) => action.type.endsWith('/toggleLike/fulfilled') ||
                action.type.endsWith('/repostPost/fulfilled') ||
                action.type.endsWith('/bookmarkPost/fulfilled'),
            (state, action: any) => {
                const updatedPost = action.payload;
                if (!updatedPost || !updatedPost.postId) return;

                // Update activeListFeed
                const index = state.activeListFeed.findIndex(p => p.id === updatedPost.postId);
                if (index !== -1) {
                    state.activeListFeed[index] = {
                        ...state.activeListFeed[index],
                        isLiked: updatedPost.isLiked !== undefined ? updatedPost.isLiked : state.activeListFeed[index].isLiked,
                        isReposted: updatedPost.isReposted !== undefined ? updatedPost.isReposted : state.activeListFeed[index].isReposted,
                        isBookmarked: updatedPost.isBookmarked !== undefined ? updatedPost.isBookmarked : state.activeListFeed[index].isBookmarked,
                        likesCount: updatedPost.likesCount !== undefined ? updatedPost.likesCount : state.activeListFeed[index].likesCount,
                        repostsCount: updatedPost.repostsCount !== undefined ? updatedPost.repostsCount : state.activeListFeed[index].repostsCount,
                        bookmarksCount: updatedPost.bookmarksCount !== undefined ? updatedPost.bookmarksCount : state.activeListFeed[index].bookmarksCount,
                    };
                }

                // Update candidatePosts
                const cIndex = state.candidatePosts.findIndex(p => p.id === updatedPost.postId);
                if (cIndex !== -1) {
                    state.candidatePosts[cIndex] = {
                        ...state.candidatePosts[cIndex],
                        isLiked: updatedPost.isLiked !== undefined ? updatedPost.isLiked : state.candidatePosts[cIndex].isLiked,
                        isReposted: updatedPost.isReposted !== undefined ? updatedPost.isReposted : state.candidatePosts[cIndex].isReposted,
                        isBookmarked: updatedPost.isBookmarked !== undefined ? updatedPost.isBookmarked : state.candidatePosts[cIndex].isBookmarked,
                        likesCount: updatedPost.likesCount !== undefined ? updatedPost.likesCount : state.candidatePosts[cIndex].likesCount,
                        repostsCount: updatedPost.repostsCount !== undefined ? updatedPost.repostsCount : state.candidatePosts[cIndex].repostsCount,
                        bookmarksCount: updatedPost.bookmarksCount !== undefined ? updatedPost.bookmarksCount : state.candidatePosts[cIndex].bookmarksCount,
                    };
                }
            }
        );
    }
});

export const { clearActiveList, clearCandidates, clearCandidatePosts } = listsSlice.actions;
export default listsSlice.reducer;
