import { store } from '../redux/store';
import { logout } from '../redux/slices/authSlice';
import { AccountManager } from './accountManager';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

// Global safety flags
let lastSwitchFailureTime = 0;
const SWITCH_FAILURE_SAFETY_MS = 3000; // 3s window to block cascading logouts on switch fail

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
    } catch (err: any) {
        if (err.name === 'AbortError') {
            const url = input instanceof Request ? input.url : input.toString();
            console.warn(`[FetchInterceptor] Request TIMED OUT after ${timeoutMs}ms: ${url}`);
        } else if (err instanceof TypeError || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
            // This is a network-level failure (offline, DNS fail, etc)
            console.error('[FetchInterceptor] Network failure detected:', err);
            store.dispatch({
                type: 'toast/showToast',
                payload: { 
                    message: 'common.network.error', 
                    type: 'error' 
                }
            });
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

            const refreshReqPromise = fetchWithTimeout(`${API_URL}/auth/refresh`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' }
            }, 14000);

            const res = await Promise.race([refreshReqPromise, timeoutPromise]) as Response;
            
            console.log(`[FetchInterceptor] Refresh result: ${res.status}`);
            
            if (res.ok) {
                try {
                    const data = await res.json();
                    if (data.user?.did && data.token && data.refreshToken) {
                        console.log(`[FetchInterceptor] Syncing updated tokens to AccountManager for DID: ${data.user.did}`);
                        AccountManager.updateTokens(data.user.did, data.token, data.refreshToken);
                    }
                } catch (e) {
                    console.warn('[FetchInterceptor] Successfully refreshed but failed to parse response for AccountManager sync', e);
                }
                return true;
            }
            return false;
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
        const isSignalRRequest = url.includes('/negotiate');
        // Metadata requests are cheap and help the UI feel alive during init
        const isMetadataRequest = url.includes('/status') || url.includes('/viewer-state') || url.includes('/presence');

        const isEssential = url.includes('/posts/') || url.includes('/profile/') || url.includes('/timeline') || 
                            url.includes('/unified-feed') || url.includes('/notification.listNotifications') ||
                            url.includes('/app.bsky.feed.getFeed') || url.includes('/app.bsky.feed.getActorFeeds') ||
                            url.includes('/feeds/subscribed') || url.includes('/lists/pinned') ||
                            url.includes('/auth/me') || isLoginRequest || isRefreshRequest || isHandshakeRequest || isVerifyDomainRequest;

        // INITIALIZATION FLOODGATE (First Load Protection):
        // Hold all requests until the first session verification (isInitializing) is complete.
        const state = store.getState();
        const authState = state.auth as any;

        const isInitExempt = isRefreshRequest || url.includes('/auth/me') || isLoginRequest || isHandshakeRequest || 
                             isVerifyDomainRequest || isSignalRRequest || isMetadataRequest;

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

            // [FIX] Allow guest-friendly endpoints to proceed even if not authenticated.
            // These endpoints are marked as 'essential' for UI performance (buffering), 
            // but they don't strictly require a session for public data (Discover feed, Profiles, etc).
            const isPublicEndpoint = 
                url.includes('/unified-feed') || 
                url.includes('/trending') || 
                url.includes('/users/profile/') || 
                (url.includes('/posts/') && !url.includes('/timeline') && !url.includes('/bookmarks')) ||
                url.includes('/followers') ||
                url.includes('/following');

            if (!updatedState.auth.isAuthenticated && isEssential && !isPublicEndpoint) {
                console.warn(`[FetchInterceptor] Auth failed during init. Rejecting authenticated-only request: ${url}`);
                return new Response(JSON.stringify({ error: 'Auth failed during initialization' }), { 
                    status: 401, 
                    headers: { 'Content-Type': 'application/json' } 
                });
            }

            // Stagger released requests to prevent connection pool exhaustion.
            // Reduced stagger for better perceived performance.
            const floodgateStagger = Math.floor(Math.random() * 50) + 10; 
            await new Promise(resolve => setTimeout(resolve, floodgateStagger));
        }

        // RE-VERIFICATION & CONCURRENT REFRESH STAGGERING:
        // Only queue requests when a real token refresh is in progress (not just a background re-sync check).
        // Previously, we would skip non-essential requests during re-verification (returning 409), which caused
        // feed pages to show "No posts yet" when navigating back. Now all requests proceed normally.
        if (isRefreshing && refreshPromise && !isRefreshRequest && !authState.isReverifying) {
            console.log(`[FetchInterceptor] Queuing request until refresh completes: ${url}`);
            try {
                // Increased wait timeout to 40s to ensure we don't cancel before the refresh itself finishes
                const refreshedResult = await Promise.race([
                    refreshPromise,
                    new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error('Refresh wait timeout')), 40000))
                ]);

                if (!refreshedResult) {
                    return new Response(JSON.stringify({ error: 'Auth refresh failed' }), { 
                        status: 401, 
                        headers: { 'Content-Type': 'application/json' } 
                    });
                }
            } catch (err) {
                console.warn(`[FetchInterceptor] Request wait for refresh failed or timed out: ${url}`);
                return new Response(JSON.stringify({ error: 'Auth wait timeout' }), { 
                    status: 408, 
                    headers: { 'Content-Type': 'application/json' } 
                });
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

        // Clone/capture request for potential retry (currently unused but kept for future retry logic)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let retryArgs: [RequestInfo | URL, RequestInit?] = [input, fetchOptions];
        if (input instanceof Request) {
            // Re-clone request if needed for retry
            retryArgs = [input.clone(), fetchOptions];
        }

        const finalTimeout = 25000; // Standardize on 25s to allow for cold starts on VPS
        const response = await fetchWithTimeout(input, fetchOptions, finalTimeout);

        // Avoid infinite loops: if a request marked as a retry still returns 401, don't try to refresh again.
        const isRetry = input instanceof Request ? input.headers.has('X-Retry-Attempt') : (init?.headers as any)?.['X-Retry-Attempt'];

        // Handle 401 Unauthorized
        const isSwitchRequest = url.includes('/auth/switch');
        const isWithinSafetyWindow = (Date.now() - lastSwitchFailureTime) < SWITCH_FAILURE_SAFETY_MS;

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
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const activeDid = state.auth.user?.did;
                    
                    if (state.auth.isAuthenticated && !isSwitchRequest && !isLoginRequest && !isWithinSafetyWindow) {
                        console.error('[FetchInterceptor] Session definitively dead. Logging out.');
                        store.dispatch(logout());
                    }

                    // If we are within segments of a switch failure, mark the current failed attempt as handled 
                    // so it doesn't trigger logout.
                    if (isSwitchRequest) {
                        lastSwitchFailureTime = Date.now();
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
