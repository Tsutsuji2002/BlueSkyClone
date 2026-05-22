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
import { useGetMeQuery } from './redux/api/authApi';
import { fetchUnreadCount } from './redux/slices/notificationsSlice';
import { fetchConversations } from './redux/slices/messagesSlice';
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
  const { data: meData, error: meError, isFetching: isMeFetching } = useGetMeQuery();
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
    } else if (meError) {
      // If error is 401, the fetchInterceptor is currently retrying or refreshing.
      // We only stop the loading screen if it's a "terminal" error (not 401)
      // or if the request is no longer fetching (meaning interceptor retries finished).
      const status = (meError as any)?.status;
      if (status !== 401 && !isMeFetching) {
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

    if (isAuthenticated) {
        console.log('[App] Authenticated: Starting background services in 2s...');
        
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
  }, [isAuthenticated, dispatch, t]);

  // Periodic polling for unread counts (fallback + sync)
  useEffect(() => {
    let pollInterval: NodeJS.Timeout | null = null;
    let debounceTimer: NodeJS.Timeout | null = null;

    const fetchCounts = () => {
        if (isAuthenticated) {
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
        // Poll every 60s as a fallback; SignalR handles real-time badge updates
        pollInterval = setInterval(fetchCounts, 60000);
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
