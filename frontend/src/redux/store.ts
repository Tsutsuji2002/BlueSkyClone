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
    // We explicitly EXCLUDE 'auth/setAuth' from resetting the store.
    // 'auth/setAuth' is used during initial handshake on page refresh. 
    // If we reset here, any eager queries (like getPostDetails) fired by mounting components 
    // get their state wiped mid-flight, causing infinite loading hangs.
    const isSwitchingAccount = action.type?.endsWith('switchAccount/fulfilled');
    const isLoggingOut = action.type === 'auth/logout';
    
    if (isLoggingOut || isSwitchingAccount) {
        // Reset all slices, but keep theme and language.
        const { theme, language, auth } = state || {};
        const newState = {
            theme,
            language,
            ...(isSwitchingAccount ? { auth } : {})
        } as any;
        
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
        }).concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
