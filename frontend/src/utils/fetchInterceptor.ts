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
            } else if (input instanceof Request) {
                // If input is a Request, we need to ensure its credentials property is set.
                // Request objects are immutable, so we must clone and replace.
                if (input.credentials !== 'include') {
                    input = new Request(input, { credentials: 'include' });
                }
            } else {
                init = { credentials: 'include' };
            }
        }

        // Clone request body if it's potentially retryable
        let firstCallArgs: [RequestInfo | URL, RequestInit?] = [input, init];
        if (input instanceof Request) {
            // If it's a request object, we must clone it to reuse it later
            firstCallArgs = [input.clone(), init];
        }

        const response = await (nativeFetch as any)(...firstCallArgs);

        // Avoid infinite loops: if a request marked as a retry still returns 401, don't try to refresh again.
        const isRetry = input instanceof Request ? input.headers.has('X-Retry-Attempt') : (init?.headers as any)?.['X-Retry-Attempt'];

        // Handle 401 Unauthorized
        if (response.status === 401 && !isLogoutRequest && !isRefreshRequest && !isExternalRequest && !isLoginRequest && !isRetry) {
            const isAuthPage = window.location.pathname === '/welcome' || window.location.pathname === '/login';
            
            if (!isAuthPage) {
                // ALWAYS attempt refresh on 401 same-origin if not on auth pages.
                const refreshed = await tryRefreshToken();

                if (refreshed) {
                    // Successful refresh! Now retry the original request.
                    if (input instanceof Request) {
                        const newHeaders = new Headers(input.headers);
                        newHeaders.delete('Authorization');
                        newHeaders.set('X-Retry-Attempt', '1');
                        
                        const retryReq = new Request(input.url, {
                            method: input.method,
                            headers: newHeaders,
                            body: input.body,
                            credentials: 'include'
                        });
                        return nativeFetch(retryReq);
                    } else {
                        const retryHeaders = new Headers(init?.headers || {});
                        retryHeaders.set('X-Retry-Attempt', '1');
                        return nativeFetch(input, {
                            ...(init || {}),
                            headers: retryHeaders,
                            credentials: 'include'
                        });
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

        // Handle 429 Too Many Requests
        if (response.status === 429) {
            store.dispatch({
                type: 'toast/showToast',
                payload: { 
                    message: 'auth.login.too_many_requests', 
                    type: 'error' 
                }
            });
        }

        return response;
    };

    (interceptedFetch as any)[INTERCEPTED] = true;
    (interceptedFetch as any)._original = nativeFetch;
    window.fetch = interceptedFetch as any;
};
