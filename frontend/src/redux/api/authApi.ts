import { apiSlice } from './apiSlice';
import { User, UserSettings, LoginFormData, SignUpFormData } from '../../types';
import { AccountManager } from '../../utils/accountManager';

export interface AuthResponse {
    user: User;
    settings: any;
    token: string;
    refreshToken: string;
}

export interface HandshakeResponse {
    user: any;
    settings: any;
    pinnedLists: any[];
    unreadCount: number;
    trendingTopics: any[];
    mutedWords: any[];
    token?: string;
    refreshToken?: string;
}

export const authApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<AuthResponse, LoginFormData>({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
            // Populate the getMe cache directly from the login response instead of
            // invalidating 'Auth', which would trigger a redundant GET /auth/me round-trip
            // and could rapidly exhaust the rate-limited /auth/refresh endpoint.
            onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(authApi.util.updateQueryData('getMe', undefined, () => data));
                } catch { /* login error is handled in the component */ }
            },
        }),
        signUp: builder.mutation<AuthResponse, SignUpFormData>({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
            // Same as login — populate cache directly to avoid redundant /auth/me refetch.
            onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(authApi.util.updateQueryData('getMe', undefined, () => data));
                } catch { }
            },
        }),
        getMe: builder.query<AuthResponse, void>({
            query: () => '/auth/me',
            providesTags: ['Auth'],
        }),
        getHandshake: builder.query<HandshakeResponse, void>({
            query: () => '/auth/handshake',
            providesTags: ['Auth'],
            // Extended timeout for slow networks - match the App.tsx safety timeout
            extraOptions: { maxRetries: 0 },
        }),
        refreshSession: builder.mutation<AuthResponse, void>({
            query: () => ({
                url: '/auth/refresh',
                method: 'POST',
            }),
            invalidatesTags: ['Auth'],
            onQueryStarted: async (_arg, { queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    if (data.user?.did && data.token && data.refreshToken) {
                        AccountManager.updateTokens(data.user.did, data.token, data.refreshToken);
                    }
                } catch { }
            },
        }),
        switchAccount: builder.mutation<AuthResponse, { refreshToken: string }>({
            query: (body) => ({
                url: '/auth/switch',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Auth', 'Post', 'User', 'Feed', 'List', 'Notification', 'Trending'],
            onQueryStarted: async (_arg, { dispatch, queryFulfilled }) => {
                try {
                    const { data } = await queryFulfilled;
                    dispatch(authApi.util.updateQueryData('getMe', undefined, () => data));
                } catch { }
            },
        }),
        logout: builder.mutation<{ success: boolean }, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            invalidatesTags: ['Post', 'User', 'Feed', 'List', 'Notification', 'Trending'],
        }),
        updateSettings: builder.mutation<UserSettings, Partial<UserSettings>>({
            query: (settings) => ({
                url: '/User/settings',
                method: 'PATCH',
                body: settings,
            }),
            invalidatesTags: ['Auth'],
        }),
        updateProfile: builder.mutation<User, FormData>({
            query: (formData) => ({
                url: '/User/profile',
                method: 'PATCH',
                body: formData,
            }),
            invalidatesTags: ['Auth'],
        }),
        updateAccount: builder.mutation<User, Partial<User>>({
            query: (accountData) => ({
                url: '/User/account',
                method: 'PATCH',
                body: accountData,
            }),
            invalidatesTags: ['Auth'],
        }),
    }),
});

export const {
    useLoginMutation,
    useSignUpMutation,
    useGetMeQuery,
    useGetHandshakeQuery,
    useRefreshSessionMutation,
    useSwitchAccountMutation,
    useLogoutMutation,
    useUpdateSettingsMutation,
    useUpdateProfileMutation,
    useUpdateAccountMutation,
} = authApi;
