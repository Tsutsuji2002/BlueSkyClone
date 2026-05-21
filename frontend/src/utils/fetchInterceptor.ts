import { store } from '../redux/store';
import { logout } from '../redux/slices/authSlice';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Mutex to prevent multiple concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Symbol to prevent recursion and double initialization.
 */
const INTERCEPTED = Symbol('fetch-intercepted');

/**
 * Robustly capture the original native fetch once.
 */
const getNativeFetch = (): typeof window.fetch => {
    if ((window as any)._originalFetch) return (window as any)._originalFetch;
    
    // If window.fetch is already intercepted by us, we need to find the real one.
    // In normal cases, we capture it before any interception.
    if ((window.fetch as any)[INTERCEPTED]) {
        console.error('[FetchInterceptor] Native fetch lost! This should not happen.');
        return (window.fetch as any)._original || window.fetch;
    }

    const native = window.fetch;
    (window as any)._originalFetch = native;
    return native;
};

/**
 * Silent session refresh attempt with a safety timeout.
 */
async function tryRefreshToken(): Promise<boolean> {
    const nativeFetch = getNativeFetch();
    if (isRefreshing && refreshPromise) {
        console.log('[FetchInterceptor] Waiting for existing refresh attempt...');
        return refreshPromise;
    }

    console.log('[FetchInterceptor] Starting fresh session refresh...');
    isRefreshing = true;

    // Use a race to ensure we don't hang indefinitely
    const refreshTimeout = new Promise<boolean>((resolve) => {
        setTimeout(() => {
            if (isRefreshing) {
                console.warn('[FetchInterceptor] Refresh attempt TIMED OUT after 30s.');
                resolve(false);
            }
        }, 30000);
    });

    const refreshActual = (async () => {
        try {
            const res = await nativeFetch(`${API_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
            });
            
            console.log(`[FetchInterceptor] Refresh result: ${res.status}`);
            return res.ok;
        } catch (err) {
            console.error('[FetchInterceptor] Refresh network error:', err);
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    refreshPromise = Promise.race([refreshActual, refreshTimeout]);
    return refreshPromise;
}

export const setupFetchInterceptor = () => {
    const nativeFetch = getNativeFetch();

    if ((window.fetch as any)[INTERCEPTED]) {
        console.warn('[FetchInterceptor] Already initialized.');
        return;
    }

    const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        let url = '';
        if (input instanceof Request) {
            url = input.url;
        } else {
            url = input.toString();
        }

        const isLogoutRequest = url.endsWith('/auth/logout');
        const isRefreshRequest = url.endsWith('/auth/refresh');
        const isLoginRequest = url.endsWith('/auth/login') || url.endsWith('/auth/register');

        const isSameOrigin = !url.startsWith('http') || url.startsWith(window.location.origin);
        const isExternalRequest = url.startsWith('http') && !isSameOrigin;

        // Force credentials: 'include' for same-origin
        if (isSameOrigin && !isExternalRequest && !isRefreshRequest) {
            if (init) {
                init.credentials = 'include';
            } else if (!(input instanceof Request)) {
                init = { credentials: 'include' };
            }
            // If input is a Request, we'll handle it in the clone logic below
        }

        // Clone request body if it's potentially retryable
        let firstCallArgs: [RequestInfo | URL, RequestInit?] = [input, init];
        if (input instanceof Request) {
            // If it's a request object, we must clone it to reuse it later
            firstCallArgs = [input.clone(), init];
        }

        const response = await (nativeFetch as any)(...firstCallArgs);

        // Handle 401 Unauthorized
        if (response.status === 401 && !isLogoutRequest && !isRefreshRequest && !isExternalRequest && !isLoginRequest) {
            const isAuthPage = window.location.pathname === '/welcome' || window.location.pathname === '/login';
            
            if (!isAuthPage) {
                // ALWAYS attempt refresh on 401 same-origin if not on auth pages.
                // This handles the "expired access token but valid refresh cookie" case during startup.
                const refreshed = await tryRefreshToken();

                if (refreshed) {
                    // Successful refresh! Now retry the original request.
                    const retryOptions: RequestInit = {
                        ...(init || {}),
                        credentials: 'include'
                    };

                    if (input instanceof Request) {
                        const newHeaders = new Headers(input.headers);
                        newHeaders.delete('Authorization'); // Remove stale bearer token if any
                        
                        const retryReq = new Request(input.url, {
                            method: input.method,
                            headers: newHeaders,
                            body: input.body, // The original body is still available because we cloned it for the first call
                            credentials: 'include'
                        });
                        return nativeFetch(retryReq);
                    } else {
                        return nativeFetch(input, retryOptions);
                    }
                } else {
                    // Refresh failed - session really is dead.
                    const state = store.getState();
                    if (state.auth.isAuthenticated) {
                        store.dispatch(logout());
                    }
                }
            }
        }

        return response;
    };

    (interceptedFetch as any)[INTERCEPTED] = true;
    (interceptedFetch as any)._original = nativeFetch;
    window.fetch = interceptedFetch as any;
};
