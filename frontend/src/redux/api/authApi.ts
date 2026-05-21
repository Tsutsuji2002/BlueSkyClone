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
            invalidatesTags: ['Auth'],
        }),
        signUp: builder.mutation<{ user: User; settings: any }, SignUpFormData>({
            query: (userData) => ({
                url: '/auth/register',
                method: 'POST',
                body: userData,
            }),
            invalidatesTags: ['Auth'],
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
    }),
});

export const {
    useLoginMutation,
    useSignUpMutation,
    useGetMeQuery,
    useRefreshSessionMutation,
    useLogoutMutation,
} = authApi;
