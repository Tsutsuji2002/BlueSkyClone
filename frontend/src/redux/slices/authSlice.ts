import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, UserSettings, LoginFormData, SignUpFormData } from '../../types';
import { isTokenExpired } from '../../utils/authUtils';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Normalizes settings from the backend (PascalCase / different field names)
 * to the frontend camelCase UserSettings shape.
 */
function normalizeSettings(raw: any): UserSettings {
    return {
        ...raw,
        // Map backend's enableTreeView -> frontend's treeView
        treeView: raw.treeView ?? raw.enableTreeView ?? false,
        // Map backend's sortReplies (already camelCase) - keep as is
        sortReplies: raw.sortReplies ?? 'top',
        // Map backend's enableDiscoverVideo -> frontend's enableVideoDiscover
        enableVideoDiscover: raw.enableVideoDiscover ?? raw.enableDiscoverVideo ?? false,
    } as UserSettings;
}

const token = localStorage.getItem('token');

const initialState: AuthState = {
    user: null,
    settings: null,
    isAuthenticated: false,
    isLoading: !!token, // Start loading if likely authenticated to prevent redirect
    error: null,
};

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: LoginFormData, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials),
            });
            const data = await response.json();
            if (!response.ok) {
                return rejectWithValue(data.message || 'Login failed');
            }
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const signUp = createAsyncThunk(
    'auth/signUp',
    async (userData: SignUpFormData, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });
            const data = await response.json();
            if (!response.ok) {
                return rejectWithValue(data.message || 'Registration failed');
            }
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const getMe = createAsyncThunk(
    'auth/getMe',
    async (_, { rejectWithValue, dispatch }) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return rejectWithValue('No token found');

            if (isTokenExpired(token)) {
                dispatch(logoutAsync());
                return rejectWithValue('Token expired');
            }

            const response = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                }
                return rejectWithValue(data.message || 'Failed to fetch user');
            }
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const logoutAsync = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            // Fire and forget logout request
            if (refreshToken) {
                fetch(`${API_URL}/auth/logout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(refreshToken),
                    keepalive: true // Ensure request completes even if page unloads
                }).catch(err => console.error('Logout failed', err));
            }
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('home_active_tab');
            return null;
        } catch (error: any) {
            // Even if logout fails on BE, we should clear local state
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('home_active_tab');
            return null;
        }
    }
);

export const updateUserProfile = createAsyncThunk(
    'auth/updateProfile',
    async (formData: FormData, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });
            const data = await response.json();
            if (!response.ok) {
                return rejectWithValue(data.message || 'Update failed');
            }
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const updateUserAccount = createAsyncThunk(
    'auth/updateAccount',
    async (accountData: any, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/account`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(accountData),
            });
            const data = await response.json();
            if (!response.ok) {
                return rejectWithValue(data.message || 'Update failed');
            }
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const updateNotificationSettings = createAsyncThunk(
    'auth/updateSettings',
    async (settings: Partial<UserSettings>, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/settings`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings),
            });
            const data = await response.json();
            if (!response.ok) {
                return rejectWithValue(data.message || 'Update failed');
            }
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);


const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },
        updateSettings: (state, action: PayloadAction<Partial<UserSettings>>) => {
            if (state.settings) {
                state.settings = { ...state.settings, ...action.payload };
            }
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; settings: UserSettings; token?: string; refreshToken?: string }>) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.settings = normalizeSettings(action.payload.settings);
                state.error = null;
                if (action.payload.token) {
                    localStorage.setItem('token', action.payload.token);
                }
                if (action.payload.refreshToken) {
                    localStorage.setItem('refreshToken', action.payload.refreshToken);
                }
            })
            .addCase(login.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Sign Up
            .addCase(signUp.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(signUp.fulfilled, (state, action: PayloadAction<{ user: User; settings: UserSettings; token?: string; refreshToken?: string }>) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.settings = normalizeSettings(action.payload.settings);
                state.error = null;
                if (action.payload.token) {
                    localStorage.setItem('token', action.payload.token);
                }
                if (action.payload.refreshToken) {
                    localStorage.setItem('refreshToken', action.payload.refreshToken);
                }
            })
            .addCase(signUp.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Get Me
            .addCase(getMe.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(getMe.fulfilled, (state, action: PayloadAction<{ user: User; settings: UserSettings }>) => {
                state.isLoading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.settings = normalizeSettings(action.payload.settings);
                state.error = null;
            })
            .addCase(getMe.rejected, (state) => {
                state.isLoading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.settings = null;
            })
            // Logout
            .addCase(logoutAsync.fulfilled, (state) => {
                state.user = null;
                state.settings = null;
                state.isAuthenticated = false;
                state.isLoading = false;
                state.error = null;
            })
            // Update Profile
            .addCase(updateUserProfile.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateUserProfile.fulfilled, (state, action: PayloadAction<User>) => {
                state.isLoading = false;
                state.user = action.payload; // Update user key with returned DTO
            })
            .addCase(updateUserProfile.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update Account
            .addCase(updateUserAccount.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(updateUserAccount.fulfilled, (state, action: PayloadAction<User>) => {
                state.isLoading = false;
                state.user = action.payload;
                state.error = null;
            })
            .addCase(updateUserAccount.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            // Update Settings
            .addCase(updateNotificationSettings.fulfilled, (state, action: PayloadAction<UserSettings>) => {
                state.settings = normalizeSettings({ ...state.settings, ...action.payload });
            });
    },
});

export const { updateUser, updateSettings, clearError } = authSlice.actions;
export default authSlice.reducer;
