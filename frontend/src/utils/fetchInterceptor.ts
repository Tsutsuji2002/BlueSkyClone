import { store } from '../redux/store';
import { logoutAsync } from '../redux/slices/authSlice';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Mutex to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempts to refresh the session by calling /api/auth/refresh.
 * Returns true if successful, false otherwise.
 * Uses a mutex so only one refresh runs at a time.
 */
async function tryRefreshToken(originalFetch: typeof window.fetch): Promise<boolean> {
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = (async () => {
        try {
            const res = await originalFetch(`${API_URL}/auth/refresh`, {
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
    // Cleanup legacy tokens from localStorage to prevent them from interfering with cookie-based auth
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');

    const { fetch: originalFetch } = window;

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

        const response = await originalFetch(...args);

        // Check if the URL is an external request (starts with http but isn't part of our API)
        const isExternalRequest = url.startsWith('http') && !url.includes('/api/');
        const isXrpcRequest = url.includes('/xrpc/');

        if (response.status === 401 && !isLogoutRequest && !isRefreshRequest && !isExternalRequest) {
            // Avoid looping if we're already on welcome/login pages
            const isAuthPage = window.location.pathname === '/welcome' || window.location.pathname === '/login';
            
            if (!isAuthPage) {
                const state = store.getState();
                if (state.auth.isAuthenticated) {
                    // Try to refresh the token instead of immediately logging out
                    const refreshed = await tryRefreshToken(originalFetch);

                    if (refreshed) {
                        // Retry the original request with fresh cookies
                        // Strip any existing Authorization header to ensure the backend uses the new cookies
                        const newHeaders = new Headers((typeof args[1] === 'object' && (args[1] as RequestInit).headers) || {});
                        newHeaders.delete('Authorization');

                        const newOptions: RequestInit = {
                            ...(typeof args[1] === 'object' ? args[1] : {}),
                            headers: newHeaders,
                            credentials: 'include'
                        };
                        
                        return originalFetch(args[0], newOptions);
                    } else {
                        // Refresh failed — session is truly expired, log out
                        store.dispatch(logoutAsync());
                    }
                }
            }
        }

        return response;
    };
};
