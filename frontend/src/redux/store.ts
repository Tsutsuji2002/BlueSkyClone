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
});

const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: AnyAction) => {
    // Check if the logout action was fulfilled
    if (action.type === 'auth/logout/fulfilled') {
        // Reset the state but preserve theme and language
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
        }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
