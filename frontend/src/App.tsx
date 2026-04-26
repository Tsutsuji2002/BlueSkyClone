import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { useAppSelector } from './hooks/useAppSelector';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AuthRoutes from './routes/AuthRoutes';
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
import ScrollToTop from './components/common/ScrollToTop';
import GlobalDeleteConfirmModal from './components/common/GlobalDeleteConfirmModal';
import './index.css';

import { RootState } from './redux/store';

import { useAppDispatch } from './hooks/useAppDispatch';
import { getMe, logoutAsync } from './redux/slices/authSlice';
import { fetchUnreadCount } from './redux/slices/notificationsSlice';
import { fetchConversations } from './redux/slices/messagesSlice';
import { isTokenExpired } from './utils/authUtils';
import signalrService, { HubStatus } from './services/signalrService';
import postSignalrService from './services/postSignalrService';
import { closeAllModals } from './redux/slices/modalsSlice';
import { stopLoading } from './redux/slices/authSlice';

import LoadingScreen from './components/common/LoadingScreen';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state: RootState) => state.auth.isLoading);
  const appLanguage = useAppSelector((state: RootState) => state.language.appLanguage);
  const { i18n } = useTranslation();
  const location = useLocation();
  const isFirstRender = React.useRef(true);

  useEffect(() => {
    // Clear chunk reload count on successful mount
    sessionStorage.removeItem('chunk_reload_count');

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        if (isTokenExpired(token)) {
          console.log('DEBUG: Access token expired. Attempting refresh...');
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            try {
              const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');
              const res = await fetch(`${API_BASE}/xrpc/com.atproto.server.refreshSession`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${refreshToken}`,
                  'Content-Type': 'application/json'
                }
              });
              
              if (res.ok) {
                const data = await res.json();
                if (data.accessJwt) {
                  localStorage.setItem('token', data.accessJwt);
                  localStorage.setItem('refreshToken', data.refreshJwt);
                  console.log('DEBUG: Token refreshed successfully');
                  dispatch(getMe());
                  return;
                }
              } else if (res.status === 401 || res.status === 400) {
                console.warn('Refresh token rejected by server. Logging out.');
                dispatch(logoutAsync());
                return;
              } else {
                console.warn(`Token refresh encountered status ${res.status}. Falling back to logout.`);
                dispatch(logoutAsync());
                return;
              }
            } catch (e) {
              console.warn('Token refresh network error:', e);
              dispatch(stopLoading()); // Ensure we don't hang on network error
              return;
            }
          }
          // No refresh token or generic failure
          dispatch(logoutAsync());
          return;
        }

        // Token technically not expired, but let's ensure session is valid
        if (!isAuthenticated) {
          const result = await dispatch(getMe());
          if (getMe.rejected.match(result)) {
             console.warn('getMe failed for initialized user. Logging out.');
             dispatch(logoutAsync());
          }
        }
      } else {
        // No token at all - ensure we're not stuck in loading
        dispatch(stopLoading());
      }
    };

    if (isFirstRender.current) {
        isFirstRender.current = false;
        checkAuth();
    }
    
    // Safety fallback: Clear loading state if it's still true after 10 seconds
    const fallbackTimer = setTimeout(() => {
        dispatch(stopLoading());
    }, 10000);

    // Also check every minute for auto-logout
    const interval = setInterval(checkAuth, 60000);
    return () => {
        clearInterval(interval);
        clearTimeout(fallbackTimer);
    };
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      signalrService.startConnection();
      postSignalrService.startConnection();

      // Monitor SignalR connection status
      signalrService.onStatusChange((status) => {
        if (status === HubStatus.Disconnected) {
          dispatch({
            type: 'toast/showToast',
            payload: {
              message: 'SignalR Disconnected. Real-time updates may be delayed.',
              type: 'error'
            }
          });
        } else if (status === HubStatus.Reconnecting) {
          dispatch({
            type: 'toast/showToast',
            payload: {
              message: 'SignalR Reconnecting...',
              type: 'info'
            }
          });
        }
      });

      dispatch(fetchUnreadCount());
      dispatch(fetchConversations());
    } else {
      signalrService.stopConnection();
      postSignalrService.stopConnection();
    }
  }, [isAuthenticated, dispatch]);

  const theme = useAppSelector((state: RootState) => state.theme);

  useEffect(() => {
    const root = document.documentElement;
    // Apply dark mode and variants
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

    // Apply font size
    root.setAttribute('data-font-size', theme.fontSize);
  }, [theme.mode, theme.darkVariant, theme.fontSize]);

  useEffect(() => {
    if (appLanguage) {
      i18n.changeLanguage(appLanguage);
    }
  }, [appLanguage, i18n]);

  // Close all modals on navigation
  useEffect(() => {
    dispatch(closeAllModals());
  }, [location.pathname, dispatch]);

  if (isLoading && !isAuthenticated) {
    return <LoadingScreen />;
  }

    return (
    <>
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
        <ScrollToTop />
        <AppContent />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
