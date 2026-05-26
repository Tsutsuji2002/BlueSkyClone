import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User, UserSettings, LoginFormData, SignUpFormData } from '../../types';
import agent from '../../services/atpAgent';
import { authApi } from '../api/authApi';
import { AccountManager, StoredAccount } from '../../utils/accountManager';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

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
        treeView: raw.treeView ?? raw.enableTreeView ?? raw.EnableTreeView ?? false,
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
        logoutVisibility: raw.logoutVisibility ?? raw.LogoutVisibility ?? raw.requireLogoutVisibility ?? raw.RequireLogoutVisibility ?? false,

        // Moderation
        enableAdultContent: raw.enableAdultContent ?? raw.EnableAdultContent ?? false,
        adultContentFilter: raw.adultContentFilter ?? raw.AdultContentFilter ?? 'show',
        sexuallyExplicitFilter: raw.sexuallyExplicitFilter ?? raw.SexuallyExplicitFilter ?? 'warn',
        graphicMediaFilter: raw.graphicMediaFilter ?? raw.GraphicMediaFilter ?? 'warn',
        nonSexualNudityFilter: raw.nonSexualNudityFilter ?? raw.NonSexualNudityFilter ?? 'show',

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

// Removed hydrateAtpSession because the backend handles session via HttpOnly cookies

const initialState: AuthState & { savedAccounts: StoredAccount[] } = (() => {
    const savedAccounts = AccountManager.getAccounts();
    const activeId = AccountManager.getActiveAccountId();
    const activeAccount = activeId ? savedAccounts.find(a => a.id === activeId || a.did === activeId) : null;

    return {
        user: activeAccount ? {
            id: activeAccount.id,
            did: activeAccount.did,
            handle: activeAccount.handle,
            displayName: activeAccount.displayName,
            avatarUrl: activeAccount.avatar,
            avatar: activeAccount.avatar,
            followersCount: 0, // Fallback
            followingCount: 0,
            postsCount: 0
        } as User : null,
        settings: null,
        isAuthenticated: !!activeAccount,
        isLoading: !activeAccount,
        isSessionSettled: false, 
        isReverifying: false, // New flag for background re-verification
        error: null,
        savedAccounts,
    };
})();

// verifyDomain thunk could also be migrated to RTK Query userApi later
export const verifyDomain = createAsyncThunk(
    'auth/verifyDomain',
    async (handle: string | undefined, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/user/verify-domain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ handle })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                return rejectWithValue(data.message || `Verification failed (Status: ${response.status})`);
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
        },
        stopLoading: (state) => {
            state.isLoading = false;
            state.isSessionSettled = true;
        },
        setAuth: (state, action: PayloadAction<{ user: User; settings: any; token: string; refreshToken: string }>) => {
            state.isAuthenticated = true;
            state.user = action.payload.user;
            state.settings = normalizeSettings(action.payload.settings);
            state.isLoading = false;
            state.isSessionSettled = true;
            
            // Save to account manager with tokens and mark as active
            AccountManager.saveAccount(action.payload.user, action.payload.token, action.payload.refreshToken);
            AccountManager.setActiveAccount(action.payload.user);
            state.savedAccounts = AccountManager.getAccounts();
        },
        logout: (state) => {
            state.user = null;
            state.settings = null;
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            localStorage.removeItem('home_active_tab');
            // Clear active session marker but keep saved accounts list
            AccountManager.clearActiveAccount();
            state.savedAccounts = AccountManager.getAccounts();
            
            // We can't dispatch resetApiState directly here, 
            // but we can rely on components or a middleware to react.
            // Actually, the best way is to do it in the App.tsx or use a listener.
        },
        removeSavedAccount: (state, action: PayloadAction<string>) => {
            AccountManager.removeAccount(action.payload);
            state.savedAccounts = AccountManager.getAccounts();
        },
        setSessionExpired: (state, action: PayloadAction<string>) => {
            AccountManager.clearTokens(action.payload);
            state.savedAccounts = AccountManager.getAccounts();
        },
        resetSessionStatus: (state) => {
            state.isReverifying = true;
        },
        completeReverification: (state) => {
            state.isReverifying = false;
            state.isSessionSettled = true;
            state.isLoading = false;
        }
    },
    extraReducers: (builder) => {
        builder
            // verifyDomain
            .addCase(verifyDomain.fulfilled, (state, action: PayloadAction<User>) => {
                if (action.payload && state.user) {
                    state.user = action.payload;
                }
            })
            // RTK Query Sync
            .addMatcher(authApi.endpoints.updateSettings.matchFulfilled, (state, { payload }) => {
                state.settings = normalizeSettings(payload);
            })
            .addMatcher(authApi.endpoints.updateProfile.matchFulfilled, (state, { payload }) => {
                state.user = payload;
            })
            .addMatcher(authApi.endpoints.updateAccount.matchFulfilled, (state, { payload }) => {
                state.user = payload;
            });
    },
});

export const { updateUser, updateSettings, clearError, stopLoading, setAuth, logout, removeSavedAccount, setSessionExpired, resetSessionStatus, completeReverification } = authSlice.actions;
export default authSlice.reducer;
