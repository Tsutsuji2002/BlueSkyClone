import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../constants';

// Custom fetch with timeout
const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout: number = 10000
): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

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
        timeout: 15000, // 15 second default timeout (increased from 10s for slow networks)
        fetchFn: async (input, init) => {
            // Use our custom fetch with extended timeout for handshake
            if (typeof input === 'string' && input.includes('/auth/handshake')) {
                return fetchWithTimeout(input, init, 15000); // Increased to 15 seconds
            }
            return fetch(input, init);
        },
    }),
    tagTypes: ['Auth', 'Post', 'User', 'Feed', 'List', 'Notification', 'Trending'],
    endpoints: () => ({}),
});
