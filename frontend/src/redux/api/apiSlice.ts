import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../constants';

/**
 * Base API service for the entire application.
 * All subsequent tags for cache invalidation should be defined here.
 */
export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        // REQUIRED: Send HttpOnly cookies (access_token, refresh_token) with every request.
        // Without this, the browser won't attach cookies and every API call will 401,
        // which hammers the rate-limited /auth/refresh endpoint and causes 503s.
        credentials: 'include',
        prepareHeaders: (headers) => {
            return headers;
        },
    }),
    tagTypes: ['Auth', 'Post', 'User', 'Feed', 'List', 'Notification', 'Trending'],
    endpoints: () => ({}),
});
