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
 * Helper to perform fetch with a timeout and robust logging.
 */
async function fetchWithTimeout(
    input: RequestInfo | URL, 
    init: RequestInit = {}, 
    timeoutMs: number = 30000,
    retryCount: number = 0
): Promise<Response> {
    const nativeFetch = getNativeFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Merge existing signal if any
    const existingSignal = init.signal;
    if (existingSignal) {
        existingSignal.addEventListener('abort', () => controller.abort());
        if (existingSignal.aborted) controller.abort();
    }

    try {
        const response = await nativeFetch(input, { ...init, signal: controller.signal });
        return response;
    } catch (err) {
        if ((err as Error).name === 'AbortError') {
            const url = input instanceof Request ? input.url : input.toString();
            console.warn(`[FetchInterceptor] Request TIMED OUT after ${timeoutMs}ms: ${url}`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Silent session refresh attempt with a safety timeout.
 */
async function tryRefreshToken(): Promise<boolean> {
    // If already refreshing, wait for that promise but add a safety fallback
    if (isRefreshing && refreshPromise) {
        console.log('[FetchInterceptor] Waiting for existing refresh attempt...');
        try {
            // Wait for existing, but don't hang forever if the original promise leaked
            const result = await Promise.race([
                refreshPromise,
                new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 20000))
            ]);
            return result === true;
        } catch {
            return false;
        }
    }

    console.log('[FetchInterceptor] Starting fresh session refresh...');
    isRefreshing = true;

    const refreshActual = (async () => {
        try {
            const res = await fetchWithTimeout(`${API_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }, 15000); // Strict 15s for refresh
            
            console.log(`[FetchInterceptor] Refresh result: ${res.status}`);
            return res.ok;
        } catch (err) {
            console.error('[FetchInterceptor] Refresh attempt failed:', err);
            return false;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    refreshPromise = refreshActual;
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

        // DEADLOCK PREVENTION: If a session refresh is already in progress, 
        // we must wait BEFORE calling fetchWithTimeout to preserve limited 
        // browser connection slots (6 per origin).
        if (isRefreshing && refreshPromise && !isRefreshRequest) {
            console.log(`[FetchInterceptor] Queuing request until refresh completes: ${url}`);
            try {
                await Promise.race([
                    refreshPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Refresh wait timeout')), 20000))
                ]);
            } catch (err) {
                console.warn(`[FetchInterceptor] Request wait for refresh failed or timed out: ${url}`);
                // Continue anyway and let it hit its own 401 or timeout
            }
        }

        const isSameOrigin = !url.startsWith('http') || url.startsWith(window.location.origin);
        const isExternalRequest = url.startsWith('http') && !isSameOrigin;

        // Force credentials: 'include' for same-origin
        let fetchOptions: RequestInit = { ...(init || {}) };
        if (isSameOrigin && !isExternalRequest && !isRefreshRequest) {
            fetchOptions.credentials = 'include';
            if (input instanceof Request && input.credentials !== 'include') {
                input = new Request(input, { credentials: 'include' });
            }
        }

        // Clone/capture request for potential retry
        let retryArgs: [RequestInfo | URL, RequestInit?] = [input, fetchOptions];
        if (input instanceof Request) {
            // Re-clone request if needed for retry
            retryArgs = [input.clone(), fetchOptions];
        }

        const response = await fetchWithTimeout(input, fetchOptions, 30000);

        // Avoid infinite loops: if a request marked as a retry still returns 401, don't try to refresh again.
        const isRetry = input instanceof Request ? input.headers.has('X-Retry-Attempt') : (init?.headers as any)?.['X-Retry-Attempt'];

        // Handle 401 Unauthorized
        const isSwitchRequest = url.endsWith('/auth/switch');
        if (response.status === 401 && !isLogoutRequest && !isRefreshRequest && !isExternalRequest && !isLoginRequest && !isRetry && !isSwitchRequest) {
            const isAuthPage = window.location.pathname === '/welcome' || window.location.pathname === '/login';
            
            if (!isAuthPage) {
                // ALWAYS attempt refresh on 401 same-origin if not on auth pages.
                const refreshed = await tryRefreshToken();

                if (refreshed) {
                    console.log(`[FetchInterceptor] Session refreshed. Retrying: ${url}`);
                    // Successful refresh! Now retry the original request with a timeout.
                    const finalOptions: RequestInit = { ...fetchOptions };
                    const finalHeaders = new Headers(finalOptions.headers || {});
                    finalHeaders.set('X-Retry-Attempt', '1');
                    finalOptions.headers = finalHeaders;

                    // If input was a Request object, we need to create a new one to carry the new headers
                    if (input instanceof Request) {
                        const retryReq = new Request(input.url, {
                            method: input.method,
                            headers: finalHeaders,
                            body: input.body,
                            credentials: 'include'
                        });
                        return fetchWithTimeout(retryReq, {}, 30000);
                    } else {
                        return fetchWithTimeout(input, finalOptions, 30000);
                    }
                } else {
                    // Refresh failed - session really is dead.
                    const state = store.getState();
                    const activeDid = state.auth.user?.did;
                    
                    if (state.auth.isAuthenticated) {
                        store.dispatch(logout());
                    }

                    if (activeDid) {
                        const { setSessionExpired } = require('../redux/slices/authSlice');
                        store.dispatch(setSessionExpired(activeDid));
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
