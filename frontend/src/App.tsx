import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { useAppSelector } from './hooks/useAppSelector';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppRoutes from './routes/AppRoutes';
import CreatePostModal from './modals/CreatePostModal';
import ReplyModal from './modals/ReplyModal';
import EditProfileModal from './modals/EditProfileModal';
import ImageViewerModal from './modals/ImageViewerModal';
import SharePostModal from './modals/SharePostModal';
import ReportModal from './modals/ReportModal';
import AuthWallModal from './modals/AuthWallModal';
import AddToListModal from './components/modals/AddToListModal';
import MutedWordsModal from './components/modals/MutedWordsModal';
import Toast from './components/common/Toast';
import GlobalDeleteConfirmModal from './components/common/GlobalDeleteConfirmModal';
import ScrollToTop from './components/common/ScrollToTop';
import './index.css';

import { RootState } from './redux/store';

import { useAppDispatch } from './hooks/useAppDispatch';
import { stopLoading, setAuth, logout, sessionExpiredLogout, clearError, resetSessionStatus, startBackgroundSync, startSilentBackgroundSync, completeReverification } from './redux/slices/authSlice';
import { setMutedWords, setMutedWordsInitialized, setHandshakeSettled, updateProfileLocal } from './redux/slices/userSlice';
import { setAppLanguage } from './redux/slices/languageSlice';
import { useGetHandshakeQuery, authApi } from './redux/api/authApi';
import { fetchUnreadCount, fetchNotifications } from './redux/slices/notificationsSlice';
import { fetchConversations } from './redux/slices/messagesSlice';
import { hydrateForAccount as hydrateFeedsForAccount, fetchSubscribedFeeds } from './redux/slices/feedsSlice';
import { hydrateForAccount as hydrateListsForAccount, fetchPinnedLists } from './redux/slices/listsSlice';
import { apiSlice } from './redux/api/apiSlice';
import signalrService, { HubStatus } from './services/signalrService';
import postSignalrService from './services/postSignalrService';
import { closeAllModals } from './redux/slices/modalsSlice';

import { SCROLL_STORAGE_PREFIX } from './hooks/useScrollRestoration';
import LoadingScreen from './components/common/LoadingScreen';
import { SessionKeeper } from './SessionKeeper';
import { NetworkStatusBanner } from './components/common/NetworkStatusBanner';



// [FIX] Reset scroll positions on hard refresh/reload/initial entry
// This MUST happen at module scope to run before any component mounts/effects.
try {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  // Force scroll to top immediately in case the browser natively restored it already
  window.scrollTo(0, 0);

  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith(SCROLL_STORAGE_PREFIX) || key.startsWith('virtuoso_state_full_')) {
      sessionStorage.removeItem(key);
    }
  });
} catch (e) {
  console.warn('[App] Failed to clear scroll positions in module scope:', e);
}

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state: RootState) => state.auth.isLoading);
  const appLanguage = useAppSelector((state: RootState) => state.language.appLanguage);
  const authSettings = useAppSelector((state: RootState) => state.auth.settings);
  const theme = useAppSelector((state: RootState) => state.theme);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { data: handshakeData, error: handshakeError, isFetching: isHandshakeFetching, refetch } = useGetHandshakeQuery(undefined, {
    // Retry with exponential backoff on network errors
    pollingInterval: undefined,
    refetchOnMountOrArgChange: true,
  });
  
  // App Ready is true only when the session check has settled (success or failure)
  const isAppReady = !isHandshakeFetching && (handshakeData !== undefined || handshakeError !== undefined);

  const isFirstRender = React.useRef(true);
  const signalrTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityCheckRef = React.useRef<number>(0);
  const lastHiddenTimeRef = React.useRef<number>(0);
  const isReverifying = useAppSelector((state: RootState) => state.auth.isReverifying);
  const showSyncOverlay = useAppSelector((state: RootState) => state.auth.showSyncOverlay);
  const isInitializing = useAppSelector((state: RootState) => state.auth.isInitializing);
  const authError = useAppSelector((state: RootState) => state.auth.error);


  React.useLayoutEffect(() => {

  }, []);

  // Sync Handshake result to authSlice and other feature slices
  useEffect(() => {
    // [LOGOUT SAFETY] If the user just logged out (auth state cleared), 
    // ignore any late-arriving handshake data to prevent re-saving ghost accounts.
    if (!isAuthenticated && !isLoading && handshakeData) {
        console.log('[App] Handshake arrived after logout/clear. Ignoring to prevent ghost account persistence.');
        return;
    }

    if (handshakeData) {
      dispatch(setAuth({
        user: handshakeData.user,
        settings: handshakeData.settings,
        token: handshakeData.token || '',
        refreshToken: handshakeData.refreshToken || ''
      }));
      
      // IMPORTANT: Also update user.profile if it matches the authenticated user
      // This ensures ProfilePage shows correct data after page refresh
      dispatch(updateProfileLocal(handshakeData.user));
      
        if (handshakeData.mutedWords) {
          dispatch(setMutedWords(handshakeData.mutedWords));
          dispatch(setMutedWordsInitialized(true));
        }

        // Once handshake data is processed, the app is fully hydrated.
        dispatch(setHandshakeSettled(true));
    } else if (handshakeError || (!handshakeData && !isHandshakeFetching)) {
        if ((handshakeError as any)?.status === 401) {
            console.log('[App] Handshake returned 401. Logging out active session due to token expiry.');
            dispatch(sessionExpiredLogout());
        } else {
            dispatch(stopLoading());
        }
        dispatch(setHandshakeSettled(true));
    }
  }, [handshakeData, handshakeError, dispatch, isHandshakeFetching]);

  // [POST-LOGIN FIX] When the user logs in interactively or switches accounts, 
  // auth/setAuth resets handshakeSettled to false.
  // This effect re-settles the flag whenever identity changes, ensuring
  // sidebar widgets (TrendingSection, OnboardingCard) load immediately.
  const user = useAppSelector(state => state.auth.user);
  const prevUserRef = React.useRef<{ did?: string; isAuthenticated: boolean }>({
      did: user?.did,
      isAuthenticated
  });

  useEffect(() => {
    const isNewLogin = isAuthenticated && !prevUserRef.current.isAuthenticated;
    const isAccountSwitch = isAuthenticated && prevUserRef.current.isAuthenticated && user?.did !== prevUserRef.current.did;
    
    prevUserRef.current = { did: user?.did, isAuthenticated };

    if (isNewLogin || isAccountSwitch) {
      // Short delay to let Redux state fully settle after setAuth
      const timer = setTimeout(() => {
        dispatch(setHandshakeSettled(true));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.did, dispatch]);




  // Safety timeout: Ensure the app never stays in "Initializing" state forever
  // Track if we've timed out to show error screen
  const [hasTimedOut, setHasTimedOut] = React.useState(false);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
        // We check current state inside the timeout to avoid unnecessary dispatches
        if (!isHandshakeFetching && !handshakeData && !handshakeError) {
            console.warn('[App] Initialization timed out (18s), forcing settlement.');
            dispatch(stopLoading());
            dispatch(setHandshakeSettled(true));
            // Mark as timed out if not authenticated
            if (!isAuthenticated) {
                setHasTimedOut(true);
            }
        }
    }, 18000); // Increased to 18 seconds (15s handshake + 3s buffer)
    return () => clearTimeout(timeoutId);
  }, [dispatch, isHandshakeFetching, handshakeData, handshakeError, isAuthenticated]);

  // Reset timeout flag when successfully authenticated
  useEffect(() => {
    if (isAuthenticated || handshakeData) {
        setHasTimedOut(false);
    }
  }, [isAuthenticated, handshakeData]);

  useEffect(() => {
    sessionStorage.removeItem('chunk_reload_count');
  }, []);

  // Unified SignalR Lifecycle with Debouncing
  useEffect(() => {
    if (signalrTimerRef.current) {
        clearTimeout(signalrTimerRef.current);
        signalrTimerRef.current = null;
    }

    if (isAuthenticated && isAppReady) {
        const signalrGracePeriod = 3000;
        signalrTimerRef.current = setTimeout(() => {
            console.log('[App] Starting connections after grace period.');
            signalrService.startConnection();
            postSignalrService.startConnection();

            // Monitor SignalR connection status
            const statusCallback = (status: HubStatus) => {
                if (status === HubStatus.Disconnected) {
                    dispatch({
                        type: 'toast/showToast',
                        payload: { message: t('common.signalr.disconnected'), type: 'error' }
                    });
                } else if (status === HubStatus.Reconnecting) {
                    dispatch({
                        type: 'toast/showToast',
                        payload: { message: t('common.signalr.reconnecting'), type: 'info' }
                    });
                }
            };

            signalrService.onStatusChange(statusCallback);
            
            // Initial fetch of background data
            // fetchUnreadCount is now handled by Handshake on startup
            dispatch(fetchConversations());
            signalrTimerRef.current = null;
        }, signalrGracePeriod);
    } else {
        console.log('[App] Unauthenticated: Stopping SignalR in 1s grace period...');
        signalrTimerRef.current = setTimeout(() => {
            console.log('[App] Grace period expired: Stopping SignalR.');
            signalrService.stopConnection();
            postSignalrService.stopConnection();
            signalrTimerRef.current = null;
        }, 1000);
    }

    return () => {
        if (signalrTimerRef.current) {
            clearTimeout(signalrTimerRef.current);
        }
    };
  }, [isAuthenticated, isAppReady, user?.did, user?.id, dispatch, t]);

  // Periodic polling for unread counts (fallback + sync)
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;
    const lastFetchRef = { current: 0 };

    const fetchCounts = () => {
        const isAuthPage = ['/welcome', '/login', '/signup'].includes(window.location.pathname);
        if (isAuthenticated && !isAuthPage) {
            const now = Date.now();
            // Prevent fetches more often than every 10 seconds, even with focus
            if (now - lastFetchRef.current < 10000) return;
            
            lastFetchRef.current = now;
            dispatch(fetchUnreadCount());
            dispatch(fetchConversations());
        }
    };

    // Debounced version: coalesces rapid focus events (e.g. switching to DevTools and back)
    // into a single call. 2s delay is imperceptible to users but prevents request storms.
    const fetchCountsDebounced = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchCounts, 2000);
    };

    if (isAuthenticated) {
        // Poll every 5 minutes as a fallback; SignalR handles real-time badge updates
        pollInterval = setInterval(fetchCounts, 300000);
    }

    // [KEYBOARD ACCESSIBILITY] Global Space/Shift+Space Scrolling
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            const activeElement = document.activeElement as HTMLElement | null;
            const isInput = activeElement?.tagName === 'INPUT' || 
                            activeElement?.tagName === 'TEXTAREA' || 
                            activeElement?.isContentEditable ||
                            activeElement?.closest('[role="textbox"]');

            if (isInput) return;

            e.preventDefault(); // Stop default browser jump, use smooth animation
            const scrollAmount = window.innerHeight * 0.8;
            window.scrollBy({
                top: e.shiftKey ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Fetch on tab/window return — debounced to avoid storms on rapid focus changes
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            fetchCountsDebounced();
        }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchCountsDebounced);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        if (pollInterval) clearInterval(pollInterval);
        if (debounceTimer) clearTimeout(debounceTimer);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', fetchCountsDebounced);
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAuthenticated, dispatch]);

  // Theme Management
  useEffect(() => {
    const root = document.documentElement;
    if (theme.mode === 'dark') {
      root.classList.add('dark');
      if (theme.darkVariant === 'dark') {
        root.classList.add('lights-out');
        root.classList.remove('dim');
      } else {
        root.classList.add('dim');
        root.classList.remove('lights-out');
      }
    } else {
      root.classList.remove('dark');
      root.classList.remove('lights-out');
      root.classList.remove('dim');
    }
    root.setAttribute('data-font-size', theme.fontSize);
  }, [theme.mode, theme.darkVariant, theme.fontSize]);

  // i18n Sync
  useEffect(() => {
    if (appLanguage) {
      i18n.changeLanguage(appLanguage);
    }
  }, [appLanguage, i18n]);

  useEffect(() => {
    if (isAuthenticated && authSettings?.appLanguage && authSettings.appLanguage !== appLanguage) {
      dispatch(setAppLanguage(authSettings.appLanguage));
    }
  }, [isAuthenticated, authSettings?.appLanguage, appLanguage, dispatch]);

  useEffect(() => {
    dispatch(closeAllModals());
  }, [location.pathname, dispatch]);

  // Prevent "Ghost" states: Clear caches when transitioning from logged-in to logged-out
  // OR when switching accounts (did change)
  const prevAuth = React.useRef(isAuthenticated);
  const isHandshakeSettled = useAppSelector((state: RootState) => state.user.handshakeSettled);
  const currentDid = useAppSelector((state: RootState) => state.auth.user?.did);
  const prevDid = React.useRef(currentDid);

  useEffect(() => {
    const authLost = prevAuth.current && !isAuthenticated;
    const accountSwitched = currentDid && prevDid.current && currentDid !== prevDid.current;

    // CRITICAL: We only trigger resetApiState if the account actually changes.
    // If authLost is true, the user just logged out, so we MUST reset.
    // If accountSwitched is true, the DIDs are different, so we MUST reset.
    // However, if we are still settling the handshake, we avoid resetting unless the identity difference is confirmed.
    if (authLost || (accountSwitched && isHandshakeSettled)) {
        console.log(`[App] ${authLost ? 'Auth lost' : 'Account switched'}: Clearing caches to prevent ghost data.`);
        dispatch(apiSlice.util.resetApiState());
        
        // Also clear local non-API slices that might hold account data
        dispatch({ type: 'feeds/clearFeeds' });
        dispatch({ type: 'lists/clearLists' });
        dispatch({ type: 'notifications/clearNotifications' });
        dispatch({ type: 'messages/clearMessages' });
        dispatch({ type: 'user/clearUser' });
        dispatch({ type: 'posts/clearPosts' });
        dispatch({ type: 'posts/clearThreadPosts' });
    }
    
    prevAuth.current = isAuthenticated;
    prevDid.current = currentDid;
  }, [isAuthenticated, currentDid, dispatch]);

  // Handle visibility changes to recover from background throttling
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        
        // 1. Calculate how long the tab was hidden
        const hiddenDuration = lastHiddenTimeRef.current > 0 ? now - lastHiddenTimeRef.current : 0;
        
        // 2. Threshold check: 5 minutes (300,000ms)
        // If the user was away for less than 5 minutes, we don't need a full re-sync.
        const RE_SYNC_THRESHOLD = 300000; 
        
        if (hiddenDuration < RE_SYNC_THRESHOLD && lastHiddenTimeRef.current > 0) {
            console.log(`[App] Visibility change: Short absence (${Math.round(hiddenDuration/1000)}s). Skipping re-sync.`);
            // Still resume SignalR though (it's cheap)
            signalrService.startConnection();
            postSignalrService.startConnection();
            return;
        }

        // 3. Cooldown check: 60s 
        // (Ensures we don't spam if they rapidly toggle visibility after a long absence)
        if (now - lastVisibilityCheckRef.current < 60000) {
            console.log('[App] Visibility change ignored (cooldown)');
            return;
        }
        lastVisibilityCheckRef.current = now;

        if (isAuthenticated && !isHandshakeFetching) {
            console.log('[App] Tab visible: Re-syncing session (silent)...');
            dispatch(startSilentBackgroundSync());
            
            // Fire re-verification and data refreshes in parallel!
            // Handshake will fetch profile, settings, and pins in one go.
            try {
                // unwrap() can throw for cancellations/errors
                await refetch().unwrap();
                console.log('[App] Re-sync successful.');
            } catch (err) {
                console.warn('[App] Re-sync handshake failed or timed out:', err);
                // We don't force a logout here, as the user might still have a partially valid local state.
                // The interceptor will handle subsequent 401s if the session is truly dead.
            }
            const unreadPromise = dispatch(fetchUnreadCount() as any);
            const notifyPromise = dispatch(fetchNotifications({ limit: 40 }) as any);

            Promise.allSettled([unreadPromise, notifyPromise])
                .then(() => {
                    console.log('[App] Parallel background sync complete.');
                })
                .finally(() => {
                    dispatch(completeReverification());
                });

            // Resume real-time connections immediately
            signalrService.startConnection();
            postSignalrService.startConnection();
        }
      } else {
        // Tab hidden: Kill SignalR noise to protect connection slots/battery
        console.log('[App] Tab hidden: Saving hidden time and stopping SignalR...');
        lastHiddenTimeRef.current = Date.now();
        signalrService.stopConnection();
        postSignalrService.stopConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, refetch, dispatch]);

  // Unified loading screen logic to prevent blank screens and guest-sidebar flash.
  // Show loading screen in any of these cases:
  // 1. Still in the initial session-verification phase (isInitializing). This is the most
  //    important gate — it prevents ANY layout from rendering before the handshake settles,
  //    eliminating the "guest sidebar flash on reaccess" issue.
  // 2. Still loading account data from localStorage (isLoading)
  // 3. Actively fetching handshake (isHandshakeFetching)
  // 4. Has timed out or hard error and is not authenticated. Note that 401 is NOT considered
  //    a hard connection error (the server is functional, we are just a guest).
  const hasError = hasTimedOut || (!!handshakeError && (handshakeError as any)?.status !== 401);
  const isExpiredError = (handshakeError as any)?.status === 401 && authError === 'session_expired';
  const shouldShowLoading = isInitializing || isLoading || isHandshakeFetching || isExpiredError || (hasError && !isAuthenticated);

  const handleContinueAsGuest = () => {
    dispatch(clearError());
  };

  if (shouldShowLoading) {
    return (
      <LoadingScreen
        error={hasError && !isAuthenticated && !isExpiredError}
        sessionExpired={isExpiredError}
        onRetry={(hasError && !isAuthenticated && !isExpiredError) ? () => {
          setHasTimedOut(false);
          refetch();
        } : undefined}
        onContinueAsGuest={handleContinueAsGuest}
        message="Connecting to BlueSky..."
      />
    );
  }

    return (
    <>
      <NetworkStatusBanner />
      <ScrollToTop subKey={location.pathname === '/search' ? (new URLSearchParams(location.search).get('q') || '') + '_' + (new URLSearchParams(location.search).get('tab') || 'top') : undefined} />
      <AppRoutes />
      <CreatePostModal />
      <ReplyModal />
      <EditProfileModal />
      <ImageViewerModal />
      <SharePostModal />
      <ReportModal />
      <AuthWallModal />
      <AddToListModal />
      <MutedWordsModal />
      {/* Re-verification Overlay (Non-blocking) */}
      {isReverifying && showSyncOverlay && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 bg-white/5 dark:bg-black/5 backdrop-blur-[1px] animate-in fade-in duration-300 pointer-events-none">
            <div className="bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-200 dark:border-dark-border shadow-xl flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-gray-700 dark:text-dark-text">Re-syncing session...</span>
            </div>
        </div>
      )}

      {/* Global Delete Confirm Modal */}
      <GlobalDeleteConfirmModal />
      <Toast />
      <SessionKeeper />
    </>
  );
};

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
