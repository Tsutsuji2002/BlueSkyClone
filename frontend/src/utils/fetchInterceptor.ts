import { store } from '../redux/store';
import { logoutAsync } from '../redux/slices/authSlice';
import { isTokenExpired } from './authUtils';

export const setupFetchInterceptor = () => {
    const { fetch: originalFetch } = window;

    window.fetch = async (...args) => {
        // args[0] is the resource (URL)
        const url = args[0]?.toString() || '';
        const isLogoutRequest = url.endsWith('/auth/logout');

        const token = localStorage.getItem('token');

        const response = await originalFetch(...args);

        if (response.status === 401 && !isLogoutRequest) {
            console.warn('Unauthorized detected by global interceptor');
            // Check if we are already logging out to avoid loops
            const state = store.getState();
            if (state.auth.isAuthenticated) {
                store.dispatch(logoutAsync());
            }
        }

        return response;
    };
};
