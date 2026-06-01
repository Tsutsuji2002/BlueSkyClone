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
import { stopLoading, setAuth, logout, resetSessionStatus, completeReverification } from './redux/slices/authSlice';
import { setAppLanguage } from './redux/slices/languageSlice';
import { useGetMeQuery, authApi } from './redux/api/authApi';
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

const VERSION = '1.1.2';
const BUILD_TIME = '19:15:00 22/5/2026';

// [FIX] Reset scroll positions on hard refresh/reload/initial entry
// This MUST happen at module scope to run before any component mounts/effects.
try {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  // Force scroll to top immediately in case the browser natively restored it already
  window.scrollTo(0, 0);

  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith(SCROLL_STORAGE_PREFIX)) {
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
  const { data: meData, error: meError, isFetching: isMeFetching, refetch } = useGetMeQuery();
  
  // App Ready is true only when the session check has settled (success or failure)
  const isAppReady = !isMeFetching && (meData !== undefined || meError !== undefined);

  const isFirstRender = React.useRef(true);
  const signalrTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastVisibilityCheckRef = React.useRef<number>(0);
  const isReverifying = useAppSelector((state: RootState) => state.auth.isReverifying);

  React.useLayoutEffect(() => {
    console.log(`%c[BlueSky-Deploy] Version: ${VERSION} (Stability + Interaction Sync)`, 'color: #00acee; font-weight: bold; font-size: 14px;');
    console.log(`[BlueSky-Deploy] Build Time: ${BUILD_TIME}`);
  }, []);

  // Sync RTK Query result to authSlice for backward compatibility
  useEffect(() => {
    if (meData) {
      dispatch(setAuth({
        user: meData.user,
        settings: meData.settings,
        token: meData.token || '',
        refreshToken: meData.refreshToken || ''
      }));
      
      // Hydrate local state for this specific account
      if (meData.user?.did) {
        dispatch(hydrateFeedsForAccount(meData.user.did));
        dispatch(hydrateListsForAccount(meData.user.did));
        
        // Initiate metadata recovery immediately after session verification
        // This makes discovery of tabs and pins much faster than waiting for SignalR.
        dispatch(fetchSubscribedFeeds());
        dispatch(fetchPinnedLists());
      }
    } else if (meError) {
      // If error occurs, we stop loading once the fetch is complete.
      // This is critical for guest users where meData will be a 401.
      if (!isMeFetching) {
        dispatch(stopLoading());
      }
    }
  }, [meData, meError, dispatch]);

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
        console.log('[App] Authenticated & Ready: Starting background services in 1s...');
        
        // Metadata is now handled immediately in the meData effect for performance.

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
            dispatch(fetchUnreadCount());
            dispatch(fetchConversations());
            signalrTimerRef.current = null;
        }, 2000);
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
  }, [isAuthenticated, isAppReady, dispatch, t]);

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

    // Fetch on tab/window return — debounced to avoid storms on rapid focus changes
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            fetchCountsDebounced();
        }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', fetchCountsDebounced);

    return () => {
        if (pollInterval) clearInterval(pollInterval);
        if (debounceTimer) clearTimeout(debounceTimer);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', fetchCountsDebounced);
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
  const prevDid = React.useRef(useAppSelector((state: RootState) => state.auth.user?.did));
  const currentDid = useAppSelector((state: RootState) => state.auth.user?.did);

  useEffect(() => {
    const authLost = prevAuth.current && !isAuthenticated;
    const accountSwitched = currentDid && prevDid.current && currentDid !== prevDid.current;

    if (authLost || accountSwitched) {
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
        // 30s cooldown to prevent thundering herd on rapid tab switching
        if (now - lastVisibilityCheckRef.current < 30000) {
            console.log('[App] Visibility change ignored (cooldown)');
            return;
        }
        lastVisibilityCheckRef.current = now;

        if (isAuthenticated) {
            console.log('[App] Tab visible: Re-syncing session...');
            dispatch(resetSessionStatus());
            
            // Background verification (non-blocking)
            refetch().unwrap()
                .then(() => {
                    console.log('[App] Session re-verified background check OK.');
                })
                .catch(err => {
                    console.warn('[App] Session re-verification failed or timed out:', err);
                })
                .finally(() => {
                    dispatch(completeReverification());
                });

            console.log('[App] Resuming sync in parallel with verification...');
            
            // Priority 1: Real-time (Resume immediately)
            signalrService.startConnection();
            postSignalrService.startConnection();
            
            // Priority 2: Core Data
            setTimeout(() => {
                dispatch(fetchPinnedLists() as any);
            }, 50);

            // Priority 3: Notifications & Background (Staggered)
            setTimeout(() => {
                dispatch(fetchUnreadCount() as any);
            }, 400);
            setTimeout(() => {
                dispatch(fetchNotifications({ limit: 40 }) as any);
            }, 800);
        }
      } else {
        // Tab hidden: Kill SignalR noise to protect connection slots/battery
        console.log('[App] Tab hidden: Stopping SignalR...');
        signalrService.stopConnection();
        postSignalrService.stopConnection();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isAuthenticated, refetch, dispatch]);

  if (isLoading && !isAuthenticated) {
    return <LoadingScreen />;
  }

    return (
    <>
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
      {isReverifying && (
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
