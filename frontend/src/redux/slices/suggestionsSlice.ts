import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../constants';
import { SuggestedUser } from '../../types';

interface SuggestionsState {
    suggestionsByCategory: Record<string, SuggestedUser[]>;
    loadingStates: Record<string, boolean>;
    error: string | null;
}

const initialState: SuggestionsState = {
    suggestionsByCategory: {},
    loadingStates: {},
    error: null,
};

export const fetchSuggestedUsers = createAsyncThunk(
    'suggestions/fetchByCategory',
    async ({ categoryId, limit = 10 }: { categoryId: string; limit?: number }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const url = new URL(`${API_BASE_URL}/xrpc/app.bsky.unspecced.getSuggestedUsersForExplore`);
            url.searchParams.append('limit', limit.toString());
            
            if (categoryId !== 'all') {
                url.searchParams.append('category', categoryId);
            }

            url.searchParams.append('_t', Date.now().toString());

            const response = await fetch(url.toString(), {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });

            if (!response.ok) {
                const errorData = await response.json();
                return rejectWithValue(errorData.message || 'Failed to fetch suggestions');
            }

            const data = await response.json();
            const items = data.suggestions || data.actors || data.users || [];
            return { categoryId, items };
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const suggestionsSlice = createSlice({
    name: 'suggestions',
    initialState,
    reducers: {
        updateFollowStatus: (state, action: PayloadAction<{ did: string; isFollowing: boolean; followUri?: string }>) => {
            const { did, isFollowing, followUri } = action.payload;
            Object.keys(state.suggestionsByCategory).forEach(catId => {
                state.suggestionsByCategory[catId] = state.suggestionsByCategory[catId].map(u => 
                    u.did === did 
                        ? { ...u, viewer: { ...u.viewer, following: isFollowing ? followUri : undefined } } 
                        : u
                );
            });
        },
        setVerifiedStatus: (state, action: PayloadAction<{ did: string; isFollowing: boolean; followUri?: string }>) => {
            const { did, isFollowing, followUri } = action.payload;
            Object.keys(state.suggestionsByCategory).forEach(catId => {
                state.suggestionsByCategory[catId] = state.suggestionsByCategory[catId].map(u => 
                    u.did === did 
                        ? { ...u, viewer: { ...u.viewer, following: isFollowing ? (followUri || u.viewer?.following) : undefined } } 
                        : u
                );
            });
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSuggestedUsers.pending, (state, action) => {
                state.loadingStates[action.meta.arg.categoryId] = true;
            })
            .addCase(fetchSuggestedUsers.fulfilled, (state, action) => {
                const { categoryId, items } = action.payload;
                state.loadingStates[categoryId] = false;
                state.suggestionsByCategory[categoryId] = items;
            })
            .addCase(fetchSuggestedUsers.rejected, (state, action) => {
                state.loadingStates[action.meta.arg.categoryId] = false;
                state.error = action.payload as string;
            });
    },
});

export const { updateFollowStatus, setVerifiedStatus } = suggestionsSlice.actions;
export default suggestionsSlice.reducer;
