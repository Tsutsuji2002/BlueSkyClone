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
    // 'auth/logout' is a synchronous reducer action (not a thunk), so no '/fulfilled' suffix.
    if (action.type === 'auth/logout') {
        // Reset all slices on logout, but keep theme and language preferences.
        const { theme, language } = state || {};
        state = {
            theme,
            language,
        } as any;
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
