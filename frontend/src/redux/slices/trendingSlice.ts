import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TrendingState } from '../../types';
import { API_BASE_URL } from '../../constants';

const initialState: TrendingState = {
    topics: [],
    accounts: [],
    interests: [],
    isLoading: false,
    error: null,
};

export const fetchTrending = createAsyncThunk(
    'trending/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/trending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch trending');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

export const fetchInterestsList = createAsyncThunk(
    'trending/fetchInterests',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/Interests`, {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch interests');
            // Assuming data is an array of interest objects with a 'name' property
            return data.map((i: any) => i.name || i);
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const trendingSlice = createSlice({
    name: 'trending',
    initialState,
    reducers: {
        setInterests: (state, action: PayloadAction<string[]>) => {
            state.interests = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTrending.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchTrending.fulfilled, (state, action: any) => {
                state.isLoading = false;
                state.topics = action.payload.topics || [];
                state.accounts = action.payload.accounts || [];
            })
            .addCase(fetchTrending.rejected, (state, action: any) => {
                state.isLoading = false;
                state.error = action.payload;
            })
            .addCase(fetchInterestsList.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchInterestsList.fulfilled, (state, action: any) => {
                state.isLoading = false;
                state.interests = action.payload;
            })
            .addCase(fetchInterestsList.rejected, (state, action: any) => {
                state.isLoading = false;
                state.error = action.payload;
            });
    },
});

export const { setInterests } = trendingSlice.actions;

export default trendingSlice.reducer;
