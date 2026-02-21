import { store } from '../redux/store';
import { logoutAsync } from '../redux/slices/authSlice';


export const setupFetchInterceptor = () => {
    const { fetch: originalFetch } = window;

    window.fetch = async (...args) => {
        // args[0] is the resource (URL)
        let url = '';
        if (args[0] instanceof Request) {
            url = args[0].url;
        } else {
            url = args[0]?.toString() || '';
        }

        const isLogoutRequest = url.endsWith('/auth/logout');


        const response = await originalFetch(...args);

        // Check if the URL is an external request (starts with http but isn't part of our API)
        const isExternalRequest = url.startsWith('http') && !url.includes('/api/');

        if (response.status === 401 && !isLogoutRequest && !isExternalRequest) {
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
