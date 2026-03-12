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

import LoadingScreen from './components/common/LoadingScreen';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state: RootState) => state.auth.isLoading);
  const appLanguage = useAppSelector((state: RootState) => state.language.appLanguage);
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    // Clear chunk reload count on successful mount
    sessionStorage.removeItem('chunk_reload_count');

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        if (isTokenExpired(token)) {
          // Try to refresh the session before giving up
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
                  // Re-check auth now with new token
                  if (!isAuthenticated) {
                    dispatch(getMe());
                  }
                  return;
                }
              }
            } catch (e) {
              console.warn('Token refresh failed:', e);
            }
          }
          // Refresh failed - logout
          dispatch(logoutAsync());
          return;
        }
        if (!isAuthenticated) {
          dispatch(getMe());
        }
      }
    };

    checkAuth();
    // Also check every minute for auto-logout
    const interval = setInterval(checkAuth, 60000);
    return () => clearInterval(interval);
  }, [dispatch, isAuthenticated]);

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
      {isAuthenticated ? <AppRoutes /> : <AuthRoutes />}
      <CreatePostModal />
      <ReplyModal />
      <EditProfileModal />
      <ImageViewerModal />
      <SharePostModal />
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
