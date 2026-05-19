import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

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
            const response = await fetch(`${API_URL}/SupportRequest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
                credentials: 'include'
            });
            const resData = await response.json().catch(() => ({}));
            if (!response.ok) return rejectWithValue(resData.message || 'Failed to submit request');
            return resData;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const fetchAllSupportRequests = createAsyncThunk(
    'support/fetchAll',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/SupportRequest`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch requests');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const updateSupportStatus = createAsyncThunk(
    'support/updateStatus',
    async ({ id, status }: { id: string; status: string }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/SupportRequest/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
                credentials: 'include'
            });
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                return rejectWithValue(data.message || 'Failed to update status');
            }
            return { id, status };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
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
