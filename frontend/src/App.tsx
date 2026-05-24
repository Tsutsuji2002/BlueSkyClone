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
import { stopLoading, setAuth, logout } from './redux/slices/authSlice';
import { setAppLanguage } from './redux/slices/languageSlice';
import { useGetMeQuery, authApi } from './redux/api/authApi';
import { fetchUnreadCount } from './redux/slices/notificationsSlice';
import { fetchConversations } from './redux/slices/messagesSlice';
import { hydrateForAccount as hydrateFeedsForAccount, fetchSubscribedFeeds } from './redux/slices/feedsSlice';
import { hydrateForAccount as hydrateListsForAccount, fetchPinnedLists } from './redux/slices/listsSlice';
import signalrService, { HubStatus } from './services/signalrService';
import postSignalrService from './services/postSignalrService';
import { closeAllModals } from './redux/slices/modalsSlice';

import LoadingScreen from './components/common/LoadingScreen';
import { SessionKeeper } from './SessionKeeper';

const VERSION = '1.1.2';
const BUILD_TIME = '19:15:00 22/5/2026';

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

  React.useLayoutEffect(() => {
    console.log(`%c[BlueSky-Deploy] Version: ${VERSION} (Stability + Interaction Sync)`, 'color: #00acee; font-weight: bold; font-size: 14px;');
    console.log(`[BlueSky-Deploy] Build Time: ${BUILD_TIME}`);
    
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
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
  const prevAuth = React.useRef(isAuthenticated);
  useEffect(() => {
    if (prevAuth.current && !isAuthenticated) {
        console.log('[App] Auth lost: Clearing caches to prevent ghost data.');
        dispatch(authApi.util.resetApiState());
        // For other API slices like userApi, postsApi if they have their own cache:
        // dispatch(userApi.util.resetApiState());
        // dispatch(postsApi.util.resetApiState());
    }
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated, dispatch]);

  // Handle visibility changes to recover from background throttling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        console.log('[App] Tab visible: Re-syncing session...');
        // Force refetch the 'me' endpoint to ensure session is still valid.
        // The background fetch of feeds/lists should be handled naturally by the
        // isAppReady change or by explicit dispatches AFTER refetch() settles.
        refetch().unwrap().then(() => {
            console.log('[App] Session re-verified. Poking SignalR.');
            signalrService.startConnection();
            postSignalrService.startConnection();
            dispatch(fetchSubscribedFeeds());
            dispatch(fetchPinnedLists());
        }).catch(() => {
            console.log('[App] Session re-verification failed.');
        });
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
