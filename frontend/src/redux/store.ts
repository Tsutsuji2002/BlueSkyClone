import { configureStore, combineReducers, AnyAction } from '@reduxjs/toolkit';
import themeReducer from './slices/themeSlice';
import authReducer from './slices/authSlice';
import postsReducer from './slices/postsSlice';
import userReducer from './slices/userSlice';
import notificationsReducer from './slices/notificationsSlice';
import messagesReducer from './slices/messagesSlice';
import modalsReducer from './slices/modalsSlice';
import languageReducer from './slices/languageSlice';
import toastReducer from './slices/toastSlice';
import feedsReducer from './slices/feedsSlice';
import trendingReducer from './slices/trendingSlice';
import listsReducer from './slices/listsSlice';
import supportReducer from './slices/supportSlice';
import suggestionsReducer from './slices/suggestionsSlice';
import { apiSlice } from './api/apiSlice';

const crashReporterMiddleware = (store: any) => (next: any) => (action: any) => {
    try {
        if (action.type.includes('getPostDetails')) {
            console.log('[Redux Crash Reporter] Dispatching action:', action.type);
        }
        return next(action);
    } catch (err) {
        console.error('[Redux Crash Reporter] Caught an exception during action:', action.type, err);
        throw err;
    }
};

const appReducer = combineReducers({
    theme: themeReducer,
    auth: authReducer,
    posts: postsReducer,
    user: userReducer,
    notifications: notificationsReducer,
    messages: messagesReducer,
    modals: modalsReducer,
    language: languageReducer,
    toast: toastReducer,
    feeds: feedsReducer,
    trending: trendingReducer,
    lists: listsReducer,
    support: supportReducer,
    suggestions: suggestionsReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
});

const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
    // 'auth/logout' is a synchronous reducer action (not a thunk), so no '/fulfilled' suffix.
    const isLoggingIn = action.type === 'auth/setAuth' || action.type?.endsWith('switchAccount/fulfilled');
    
    if (action.type === 'auth/logout' || isLoggingIn) {
        // Reset all slices, but keep theme and language.
        // For login/switch, we ALSO keep the auth slice because it was just updated by the child reducer.
        const { theme, language, auth } = state || {};
        const newState = {
            theme,
            language,
            ...(isLoggingIn ? { auth } : {})
        } as any;
        
        // If we are logging out, we also want to clear the API state.
        // The rootReducer reset handles most of it by setting state to undefined for other slices.
        return appReducer(newState, action);
    }
    return appReducer(state, action);
};

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types for serialization check
                ignoredActions: ['modals/openConfirmation'],
                // Ignore these field paths in all actions
                ignoredActionPaths: ['payload.onConfirm'],
                // Ignore these paths in the state
                ignoredPaths: ['modals.confirmation.onConfirm'],
            },
        }).concat(apiSlice.middleware, crashReporterMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
