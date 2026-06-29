import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../constants';

/**
 * Custom fetch with guaranteed timeout
 * Ensures requests don't hang indefinitely on slow/bad networks
 */
const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout: number = 15000
): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error: any) {
        clearTimeout(timeoutId);
        // Convert AbortError to more user-friendly timeout error
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - please check your network connection');
        }
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
        credentials: 'include',
        prepareHeaders: (headers) => {
            return headers;
        },
        // Use our custom fetch with guaranteed timeout for ALL requests
        fetchFn: async (input, init) => {
            const url = typeof input === 'string' ? input : input.url;
            const timeout = url.includes('/auth/handshake') ? 15000 : 15000; // 15s for all requests
            return fetchWithTimeout(url, init, timeout);
        },
    }),
    tagTypes: ['Auth', 'Post', 'User', 'Feed', 'List', 'Notification', 'Trending'],
    endpoints: () => ({}),
});
