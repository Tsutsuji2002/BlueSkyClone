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
        prepareHeaders: (headers) => {
            // We use HttpOnly cookies for most auth, so credentials: 'include' 
            // is the main requirement. fetchBaseQuery handles this if configured.
            return headers;
        },
    }),
    // Use 'include' to ensure HttpOnly cookies (access_token, refresh_token) 
    // are sent with every RTK Query fetch.
    tagTypes: ['Auth', 'Post', 'User', 'Feed', 'List', 'Notification', 'Trending'],
    endpoints: () => ({}),
});
