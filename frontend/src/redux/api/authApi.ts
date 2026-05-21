import { apiSlice } from './apiSlice';
import { User, UserSettings, LoginFormData, SignUpFormData } from '../../types';

export const authApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation<{ user: User; settings: any }, LoginFormData>({
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
        signUp: builder.mutation<{ user: User; settings: any }, SignUpFormData>({
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
        getMe: builder.query<{ user: User; settings: any }, void>({
            query: () => '/auth/me',
            providesTags: ['Auth'],
        }),
        refreshSession: builder.mutation<{ user: User; settings: any }, void>({
            query: () => ({
                url: '/auth/refresh',
                method: 'POST',
            }),
            invalidatesTags: ['Auth'],
        }),
        logout: builder.mutation<{ success: boolean }, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            invalidatesTags: ['Auth', 'Post', 'User', 'Feed', 'List', 'Notification', 'Trending'],
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
    useRefreshSessionMutation,
    useLogoutMutation,
    useUpdateSettingsMutation,
    useUpdateProfileMutation,
    useUpdateAccountMutation,
} = authApi;
