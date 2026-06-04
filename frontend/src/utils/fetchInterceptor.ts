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
    timeoutMs: number = 15000,
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
            console.log(`[FetchInterceptor] Requesting session refresh...`);
            
            // Hard timeout pattern to bypass browser timer throttling
            const timeoutPromise = new Promise<Response>((_, reject) => 
                setTimeout(() => reject(new Error('REFRESH_HARD_TIMEOUT')), 15000)
            );

            const refreshPromise = fetchWithTimeout(`${API_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }, 14000);

            const res = await Promise.race([refreshPromise, timeoutPromise]) as Response;
            
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

        const isHandshakeRequest = url.includes('/auth/handshake');
        const isVerifyDomainRequest = url.includes('/auth/verify-domain');

        const isEssential = url.includes('/posts/') || url.includes('/profile/') || url.includes('/timeline') || 
                            url.includes('/unified-feed') || url.includes('/notification.listNotifications') ||
                            url.includes('/app.bsky.feed.getFeed') || url.includes('/app.bsky.feed.getActorFeeds') ||
                            url.includes('/feeds/subscribed') || url.includes('/lists/pinned') ||
                            url.includes('/auth/me') || isLoginRequest || isRefreshRequest || isHandshakeRequest || isVerifyDomainRequest;

        // INITIALIZATION FLOODGATE (First Load Protection):
        // Hold all requests until the first session verification (isInitializing) is complete.
        // This prevents parallel "me" and "refresh" calls from clogging the backend during startup.
        const state = store.getState();
        const authState = state.auth as any;

        const isInitExempt = isRefreshRequest || url.includes('/auth/me') || isLoginRequest || isHandshakeRequest || isVerifyDomainRequest;

        if (authState.isInitializing && !isInitExempt) {
            console.log(`[FetchInterceptor] INITIALIZING: Buffering request until session is verified: ${url}`);
            
            await new Promise<void>(resolve => {
                const unsubscribe = store.subscribe(() => {
                    const newState = store.getState() as any;
                    if (!newState.auth.isInitializing) {
                        unsubscribe();
                        resolve();
                    }
                });
                // Safety timeout: don't hang requests forever if init fails silently
                setTimeout(() => { unsubscribe(); resolve(); }, 12000);
            });

            // Re-check state after floodgate opens
            const updatedState = store.getState() as any;
            if (!updatedState.auth.isAuthenticated && isEssential) {
                console.warn(`[FetchInterceptor] Auth failed during init. Rejecting essential request: ${url}`);
                return new Response(JSON.stringify({ error: 'Auth failed during initialization' }), { 
                    status: 401, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }

            // Stagger released requests to prevent connection pool exhaustion.
            // [OPTIMIZATION] Skip jitter completely to ensure rapid startup.
            console.log(`[FetchInterceptor] Releasing initialized request immediately: ${url}`);
        }

        // RE-VERIFICATION & CONCURRENT REFRESH STAGGERING:
        if (isRefreshing && refreshPromise && !isRefreshRequest) {
            const isReverifying = authState.isReverifying;

            // OPTIMISTIC RE-SYNC: 
            // - If it's a re-verification (background check), highly prioritize /me and /refresh.
            // - Other essential requests (like feed hydration) are allowed but with caution.
            if (isReverifying) {
                const isCoreRecovery = url.includes('/auth/me') || url.includes('/auth/handshake') || isRefreshRequest;
                
                if (isCoreRecovery || isEssential) {
                    console.log(`[FetchInterceptor] CRITICAL: Allowing essential request during re-verification: ${url}`);
                    // Proceed to nativeFetch
                } else {
                    // Strictly skip non-essential requests during re-verification to save connections
                    console.log(`[FetchInterceptor] Skipping background request during re-verification: ${url}`);
                    return new Response(JSON.stringify({ error: 'Skipped during re-verification' }), { 
                        status: 409, 
                        headers: { 'Content-Type': 'application/json' } 
                    });
                }
            } else {

                console.log(`[FetchInterceptor] Queuing request until refresh completes: ${url}`);
                try {
                    const refreshedResult = await Promise.race([
                        refreshPromise,
                        new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Refresh wait timeout')), 25000))
                    ]);

                    if (!refreshedResult) {
                        console.warn(`[FetchInterceptor] Refresh failed for queued request: ${url}`);
                        return new Response(JSON.stringify({ error: 'Auth refresh failed' }), { 
                            status: 401, 
                            headers: { 'Content-Type': 'application/json' } 
                        });
                    }
                    
                    // Add a small jittered stagger for background requests to prevent a "thundering herd"
                    if (!isEssential) {
                        const staggerDelay = Math.floor(Math.random() * 1500) + 500; // 500ms-2000ms
                        await new Promise(resolve => setTimeout(resolve, staggerDelay));
                    }
                } catch (err) {
                    console.warn(`[FetchInterceptor] Request wait for refresh failed or timed out: ${url}`);
                    return new Response(JSON.stringify({ error: 'Auth wait timeout' }), { 
                        status: 408, 
                        headers: { 'Content-Type': 'application/json' } 
                    });
                }
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

        // Use a shorter timeout for handshake specifically
        const finalTimeout = isHandshakeRequest ? 10000 : 15000;
        const response = await fetchWithTimeout(input, fetchOptions, finalTimeout);

        // Avoid infinite loops: if a request marked as a retry still returns 401, don't try to refresh again.
        const isRetry = input instanceof Request ? input.headers.has('X-Retry-Attempt') : (init?.headers as any)?.['X-Retry-Attempt'];

        // Handle 401 Unauthorized
        const isSwitchRequest = url.includes('/auth/switch');
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
                    // Refresh failed - but don't logout immediately!
                    // Another tab or request might have just rotated the tokens successfully.
                    console.warn(`[FetchInterceptor] Refresh attempt failed for ${url}. Verifying session before giving up...`);
                    
                    try {
                        // "The Final Try": Perform a clean native fetch to /auth/me
                        // If this succeeds, it means the session is actually alive (fixed by another tab).
                        const meCheck = await nativeFetch('/api/auth/me', { credentials: 'include' });
                        if (meCheck.ok) {
                            console.log('[FetchInterceptor] Local session verification SUCCEEDED despite refresh failure. Retrying original request (FINAL).');
                            
                            // Clone init to add retry header
                            const retryInit: RequestInit = { ...init };
                            const retryHeaders = new Headers(retryInit.headers || {});
                            retryHeaders.set('X-Retry-Attempt', '1');
                            retryInit.headers = retryHeaders;
                            
                            return interceptedFetch(input, retryInit); // Recursive retry once
                        }
                    } catch (checkErr) {
                        console.warn('[FetchInterceptor] Final session verification check failed:', checkErr);
                    }

                    const state = store.getState();
                    const activeDid = state.auth.user?.did;
                    
                    if (state.auth.isAuthenticated && !isSwitchRequest && !isLoginRequest) {
                        console.error('[FetchInterceptor] Session definitively dead. Logging out.');
                        store.dispatch(logout());
                    }

                    if (activeDid && !isSwitchRequest && !isLoginRequest) {
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
