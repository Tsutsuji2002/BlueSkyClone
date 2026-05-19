import { store } from '../redux/store';
import { logoutAsync } from '../redux/slices/authSlice';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Keep a reference to the native fetch to avoid recursion issues
const nativeFetch = window.fetch;
let isInterceptorSetup = false;

// Mutex to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the session by calling /api/auth/refresh.
 * Returns true if successful, false otherwise.
 * Uses a mutex so only one refresh runs at a time.
 */
async function tryRefreshToken(): Promise<boolean> {
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const res = await nativeFetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            return res.ok;
        } catch {
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

export const setupFetchInterceptor = () => {
    if (isInterceptorSetup) return;
    isInterceptorSetup = true;

    window.fetch = async (...args) => {
        // args[0] is the resource (URL)
        let url = '';
        if (args[0] instanceof Request) {
            url = args[0].url;
        } else {
            url = args[0]?.toString() || '';
        }

        const isLogoutRequest = url.endsWith('/auth/logout');
        const isRefreshRequest = url.endsWith('/auth/refresh');

        // Check if the URL is an external request (starts with http but isn't part of our domain or API)
        // We use window.location.origin to detect same-domain calls (including /xrpc)
        const isSameOrigin = !url.startsWith('http') || url.startsWith(window.location.origin);
        const isExternalRequest = url.startsWith('http') && !isSameOrigin;
        
        // Ensure credentials: 'include' for all same-origin requests to send cookies
        if (isSameOrigin && !isExternalRequest && !isRefreshRequest) {
            if (args[0] instanceof Request) {
               args[1] = { ...args[1], credentials: 'include' };
            } else {
               args[1] = { ...(args[1] as RequestInit), credentials: 'include' };
            }
        }

        // Clone request if it's a POST/PUT/PATCH we might need to retry
        // Request body can only be consumed once, so we need a clone for the first call.
        const firstCallArgs = [...args] as [RequestInfo, RequestInit?];
        if (args[0] instanceof Request && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(args[0].method)) {
            firstCallArgs[0] = args[0].clone();
        }

        const response = await nativeFetch(...firstCallArgs);

        // Handle 401 Unauthorized
        if (response.status === 401 && !isLogoutRequest && !isRefreshRequest && !isExternalRequest) {
            const isAuthPage = window.location.pathname === '/welcome' || window.location.pathname === '/login';
            
            if (!isAuthPage) {
                const state = store.getState();
                // Only attempt refresh if we believe we should be authenticated
                if (state.auth.isAuthenticated) {
                    const refreshed = await tryRefreshToken();

                    if (refreshed) {
                        // Retry the original request with same-origin policy enforced
                        const retryOptions: RequestInit = {
                            ...(args[0] instanceof Request ? {} : (args[1] as RequestInit || {})),
                            credentials: 'include'
                        };

                        // If it was a Request object, we need to handle headers carefully
                        if (args[0] instanceof Request) {
                            const newHeaders = new Headers(args[0].headers);
                            newHeaders.delete('Authorization');
                            retryOptions.headers = newHeaders;
                            return nativeFetch(args[0].url, {
                                method: args[0].method,
                                body: args[0].body,
                                ...retryOptions
                            });
                        } else {
                            const newHeaders = new Headers((args[1] as RequestInit)?.headers || {});
                            newHeaders.delete('Authorization');
                            retryOptions.headers = newHeaders;
                            return nativeFetch(args[0], retryOptions);
                        }
                    } else {
                        // Refresh failed — session expired, perform clean logout
                        store.dispatch(logoutAsync());
                    }
                }
            }
        }

        return response;
    };
};
