import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export interface SupportRequest {
    id: string;
    email: string;
    description: string;
    username?: string;
    category: string;
    deviceType: string;
    status: string;
    createdAt: string;
    userId?: string;
}

export interface SupportState {
    requests: SupportRequest[];
    loading: boolean;
    error: string | null;
    success: boolean;
}

const initialState: SupportState = {
    requests: [],
    loading: false,
    error: null,
    success: false,
};

export const submitSupportRequest = createAsyncThunk(
    'support/submit',
    async (data: { email: string; description: string; username?: string; category: string; deviceType: string }, { rejectWithValue }) => {
        try {
            const response = await axios.post(`${API_URL}/SupportRequest`, data);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to submit request');
        }
    }
);

export const fetchAllSupportRequests = createAsyncThunk(
    'support/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/SupportRequest`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch requests');
        }
    }
);

export const updateSupportStatus = createAsyncThunk(
    'support/updateStatus',
    async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.patch(`${API_URL}/SupportRequest/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return { id, status };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update status');
        }
    }
);

const supportSlice = createSlice({
    name: 'support',
    initialState,
    reducers: {
        resetSupportStatus: (state) => {
            state.success = false;
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Submit
            .addCase(submitSupportRequest.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
            })
            .addCase(submitSupportRequest.fulfilled, (state) => {
                state.loading = false;
                state.success = true;
            })
            .addCase(submitSupportRequest.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Fetch All
            .addCase(fetchAllSupportRequests.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchAllSupportRequests.fulfilled, (state, action: PayloadAction<SupportRequest[]>) => {
                state.loading = false;
                state.requests = action.payload;
            })
            .addCase(fetchAllSupportRequests.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Update Status
            .addCase(updateSupportStatus.fulfilled, (state, action) => {
                const request = state.requests.find(r => r.id === action.payload.id);
                if (request) {
                    request.status = action.payload.status;
                }
            });
    },
});

export const { resetSupportStatus } = supportSlice.actions;
export default supportSlice.reducer;
