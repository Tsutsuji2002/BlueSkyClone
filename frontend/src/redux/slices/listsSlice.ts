import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { ListDto, ListItemDto, CreateListDto, UpdateListDto, Post } from '../../types';
import listService from '../../services/listsService';

interface ListsState {
    myLists: ListDto[];
    pinnedLists: ListDto[];
    activeList: ListDto | null;
    activeListMembers: ListItemDto[];
    activeListFeed: Post[];
    isLoading: boolean;
    error: string | null;
}

const initialState: ListsState = {
    myLists: [],
    pinnedLists: [],
    activeList: null,
    activeListMembers: [],
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

const listsSlice = createSlice({
    name: 'lists',
    initialState,
    reducers: {
        clearActiveList: (state) => {
            state.activeList = null;
            state.activeListMembers = [];
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
    }
});

export const { clearActiveList } = listsSlice.actions;
export default listsSlice.reducer;
