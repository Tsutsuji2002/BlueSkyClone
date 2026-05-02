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
import { getMe, stopLoading } from './redux/slices/authSlice';
import { setAppLanguage } from './redux/slices/languageSlice';
import { fetchUnreadCount } from './redux/slices/notificationsSlice';
import { fetchConversations } from './redux/slices/messagesSlice';
import signalrService, { HubStatus } from './services/signalrService';
import postSignalrService from './services/postSignalrService';
import { closeAllModals } from './redux/slices/modalsSlice';

import LoadingScreen from './components/common/LoadingScreen';

const VERSION = '1.1.1';
const BUILD_TIME = '23:45:00 1/5/2026';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state: RootState) => state.auth.isLoading);
  const appLanguage = useAppSelector((state: RootState) => state.language.appLanguage);
  const authSettings = useAppSelector((state: RootState) => state.auth.settings);
  const theme = useAppSelector((state: RootState) => state.theme);
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const isFirstRender = React.useRef(true);
  const signalrTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useLayoutEffect(() => {
    console.log(`%c[BlueSky-Deploy] Version: ${VERSION} (Stability + Interaction Sync)`, 'color: #00acee; font-weight: bold; font-size: 14px;');
    console.log(`[BlueSky-Deploy] Build Time: ${BUILD_TIME}`);
    
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    sessionStorage.removeItem('chunk_reload_count');

    const checkAuth = async () => {
      if (!isAuthenticated) {
        const result = await dispatch(getMe());
        if (getMe.rejected.match(result)) {
           console.warn('[App] Initial auth check failed.');
           dispatch(stopLoading());
        }
      }
    };

    if (isFirstRender.current) {
        isFirstRender.current = false;
        checkAuth();
    }
    
    const fallbackTimer = setTimeout(() => {
        dispatch(stopLoading());
    }, 10000);

    return () => {
        clearTimeout(fallbackTimer);
    };
}, [dispatch, isAuthenticated]);

  // Unified SignalR Lifecycle with Debouncing
  useEffect(() => {
    if (signalrTimerRef.current) {
        clearTimeout(signalrTimerRef.current);
        signalrTimerRef.current = null;
    }

    if (isAuthenticated) {
        console.log('[App] Authenticated: Starting SignalR...');
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
        dispatch(fetchUnreadCount());
        dispatch(fetchConversations());
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
      <ScrollToTop />
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
