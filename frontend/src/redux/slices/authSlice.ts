import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, UserSettings, LoginFormData, SignUpFormData } from '../../types';
import { isTokenExpired } from '../../utils/authUtils';
import agent from '../../services/atpAgent';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Normalizes settings from the backend (PascalCase / different field names)
 * to the frontend camelCase UserSettings shape.
 */
function normalizeSettings(raw: any): UserSettings {
    let parsedProviders: string[] = [];
    try {
        if (typeof raw.enabledMediaProviders === 'string') parsedProviders = JSON.parse(raw.enabledMediaProviders);
        else if (typeof raw.EnabledMediaProviders === 'string') parsedProviders = JSON.parse(raw.EnabledMediaProviders);
        else if (Array.isArray(raw.enabledMediaProviders)) parsedProviders = raw.enabledMediaProviders;
    } catch (e) {
        parsedProviders = [];
    }

    return {
        ...raw,
        // Map backend's enableTreeView -> frontend's treeView
        treeView: raw.treeView ?? raw.enableTreeView ?? false,
        // Map backend's sortReplies (already camelCase) - keep as is
        sortReplies: raw.sortReplies ?? 'top',
        // Map backend's enableDiscoverVideo -> frontend's enableVideoDiscover
        enableVideoDiscover: raw.enableVideoDiscover ?? raw.enableDiscoverVideo ?? raw.EnableDiscoverVideo ?? false,
        openTrendingTopics: raw.openTrendingTopics ?? raw.enableTrending ?? raw.EnableTrending ?? true,
        autoplayVideoGif: raw.autoplayVideoGif ?? raw.AutoplayVideoGif ?? true,
        appLanguage: raw.appLanguage ?? raw.AppLanguage ?? 'en',
        themeMode: raw.themeMode ?? raw.ThemeMode ?? 'system',
        showReplies: raw.showReplies ?? raw.ShowReplies ?? true,
        showReposts: raw.showReposts ?? raw.ShowReposts ?? true,
        showQuotePosts: raw.showQuotePosts ?? raw.ShowQuotePosts ?? true,
        showSampleSavedFeeds: raw.showSampleSavedFeeds ?? raw.ShowSampleSavedFeeds ?? false,
        enabledMediaProviders: parsedProviders,
        defaultReplyRestriction: raw.defaultReplyRestriction ?? raw.DefaultReplyRestriction ?? 'anyone',
        defaultAllowQuotes: raw.defaultAllowQuotes ?? raw.DefaultAllowQuotes ?? true,

        // Notification master toggles
        notifyLikes: raw.notifyLikes ?? raw.NotifyLikes ?? true,
        notifyReposts: raw.notifyReposts ?? raw.NotifyReposts ?? true,
        notifyFollowers: raw.notifyFollowers ?? raw.NotifyFollowers ?? true,
        notifyReplies: raw.notifyReplies ?? raw.NotifyReplies ?? true,
        notifyMentions: raw.notifyMentions ?? raw.NotifyMentions ?? true,
        notifyQuotes: raw.notifyQuotes ?? raw.NotifyQuotes ?? true,
        notifyActivity: raw.notifyActivity ?? raw.NotifyActivity ?? true,
        notifyLikesOfReposts: raw.notifyLikesOfReposts ?? raw.NotifyLikesOfReposts ?? true,
        notifyRepostsOfReposts: raw.notifyRepostsOfReposts ?? raw.NotifyRepostsOfReposts ?? true,
        notifyOthers: raw.notifyOthers ?? raw.NotifyOthers ?? true,

        // Push notification toggles
        pushNotifyLikes: raw.pushNotifyLikes ?? raw.PushNotifyLikes ?? true,
        pushNotifyReposts: raw.pushNotifyReposts ?? raw.PushNotifyReposts ?? true,
        pushNotifyFollowers: raw.pushNotifyFollowers ?? raw.PushNotifyFollowers ?? true,
        pushNotifyReplies: raw.pushNotifyReplies ?? raw.PushNotifyReplies ?? true,
        pushNotifyMentions: raw.pushNotifyMentions ?? raw.PushNotifyMentions ?? true,
        pushNotifyQuotes: raw.pushNotifyQuotes ?? raw.PushNotifyQuotes ?? true,
        pushNotifyActivity: raw.pushNotifyActivity ?? raw.PushNotifyActivity ?? true,
        pushNotifyLikesOfReposts: raw.pushNotifyLikesOfReposts ?? raw.PushNotifyLikesOfReposts ?? true,
        pushNotifyRepostsOfReposts: raw.pushNotifyRepostsOfReposts ?? raw.PushNotifyRepostsOfReposts ?? true,
        pushNotifyOthers: raw.pushNotifyOthers ?? raw.PushNotifyOthers ?? true,

        // In-app notification toggles
        inAppNotifyLikes: raw.inAppNotifyLikes ?? raw.InAppNotifyLikes ?? true,
        inAppNotifyReposts: raw.inAppNotifyReposts ?? raw.InAppNotifyReposts ?? true,
        inAppNotifyFollowers: raw.inAppNotifyFollowers ?? raw.InAppNotifyFollowers ?? true,
        inAppNotifyReplies: raw.inAppNotifyReplies ?? raw.InAppNotifyReplies ?? true,
        inAppNotifyMentions: raw.inAppNotifyMentions ?? raw.InAppNotifyMentions ?? true,
        inAppNotifyQuotes: raw.inAppNotifyQuotes ?? raw.InAppNotifyQuotes ?? true,
        inAppNotifyActivity: raw.inAppNotifyActivity ?? raw.InAppNotifyActivity ?? true,
        inAppNotifyLikesOfReposts: raw.inAppNotifyLikesOfReposts ?? raw.InAppNotifyLikesOfReposts ?? true,
        inAppNotifyRepostsOfReposts: raw.inAppNotifyRepostsOfReposts ?? raw.InAppNotifyRepostsOfReposts ?? true,
        inAppNotifyOthers: raw.inAppNotifyOthers ?? raw.InAppNotifyOthers ?? true
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
            const { data } = await agent.login({
                identifier: credentials.identifier,
                password: credentials.password,
            });

            if (data.accessJwt) {
                localStorage.setItem('token', data.accessJwt);
                localStorage.setItem('refreshToken', data.refreshJwt);
            }

            // Map Lexicon response (with our custom fields) to Redux payload
            return {
                user: (data as any).user,
                settings: (data as any).settings,
                token: data.accessJwt,
                refreshToken: data.refreshJwt
            };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Login failed');
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
            const refreshToken = localStorage.getItem('refreshToken');

            if (!token || !refreshToken) return rejectWithValue('No session found');

            // Resume session with AtpAgent
            const { data } = await agent.resumeSession({
                accessJwt: token,
                refreshJwt: refreshToken,
                handle: '', // Will be populated by resumeSession
                did: '',    // Will be populated by resumeSession
                active: true
            });

            // After resume, we still need the user/settings which are in our custom response
            // For now, assume the backend returns them in getSession or a separate call
            // Or use the data from resumeSession if we modified the backend accordingly

            // To keep legacy code working, we can call /auth/me or similar, 
            // but now using the agent's authorized fetch.
            const response = await fetch(`${API_URL}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });
            const userData = await response.json();
            if (!response.ok) {
                return rejectWithValue(userData.message || 'Failed to fetch user');
            }

            // Return payload that matches the expected reducer type
            return {
                user: userData.user,
                settings: userData.settings
            };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const logoutAsync = createAsyncThunk(
    'auth/logout',
    async (_, { rejectWithValue }) => {
        try {
            // Logout with AtpAgent (clears local session and optionally remote)
            agent.logout();

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
            const payload = {
                ...settings,
                enableTrending: settings.openTrendingTopics,
                enabledMediaProviders: Array.isArray(settings.enabledMediaProviders)
                    ? JSON.stringify(settings.enabledMediaProviders)
                    : settings.enabledMediaProviders
            };

            const response = await fetch(`${API_URL}/user/settings`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
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

export const verifyDomain = createAsyncThunk(
    'auth/verifyDomain',
    async (handle: string | undefined, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/user/verify-domain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ handle })
            });
            const data = await response.json();
            if (!response.ok) {
                return rejectWithValue(data.message || 'Verification failed');
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
            })
            // Verify Domain
            .addCase(verifyDomain.fulfilled, (state, action: PayloadAction<User>) => {
                if (action.payload && state.user) {
                    state.user = action.payload;
                }
            });
    },
});

export const { updateUser, updateSettings, clearError } = authSlice.actions;
export default authSlice.reducer;
