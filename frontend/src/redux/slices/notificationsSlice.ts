import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { NotificationsState, Notification } from '../../types';

import agent from '../../services/atpAgent';

export const fetchNotifications = createAsyncThunk<Notification[], void, { rejectValue: string }>(
    'notifications/fetchNotifications',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await agent.listNotifications();
            return data.notifications.map(n => ({
                id: n.cid,
                uri: n.uri,
                cid: n.cid,
                type: n.reason as any,
                reason: n.reason,
                reasonSubject: n.reasonSubject,
                sender: {
                    id: n.author.did,
                    did: n.author.did,
                    handle: n.author.handle,
                    username: n.author.handle,
                    displayName: n.author.displayName || n.author.handle,
                    avatarUrl: n.author.avatar,
                } as any,
                isRead: n.isRead,
                createdAt: n.indexedAt,
                record: n.record,
                subjectUri: n.reasonSubject,
                postId: n.reasonSubject ? n.reasonSubject.split('/').pop() : undefined
            }));
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch notifications');
        }
    }
);

export const markNotificationAsRead = createAsyncThunk<string, string, { rejectValue: string }>(
    'notifications/markAsRead',
    async (id: string, { rejectWithValue }) => {
        try {
            // In AT Protocol, we usually mark all unread as seen up to a certain time
            // For a single notification, we might just update the local state or call updateSeen
            await agent.app.bsky.notification.updateSeen({
                seenAt: new Date().toISOString()
            });
            return id;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to mark as read');
        }
    }
);

export const markAllNotificationsAsRead = createAsyncThunk<void, void, { rejectValue: string }>(
    'notifications/markAllAsRead',
    async (_, { rejectWithValue }) => {
        try {
            await agent.app.bsky.notification.updateSeen({
                seenAt: new Date().toISOString()
            });
            return;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to mark all as read');
        }
    }
);

export const fetchUnreadCount = createAsyncThunk<number, void, { rejectValue: string }>(
    'notifications/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await agent.countUnreadNotifications();
            return data.count;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch unread count');
        }
    }
);

const initialState: NotificationsState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification: (state, action: PayloadAction<Notification>) => {
            state.notifications.unshift(action.payload);
            if (!action.payload.isRead) {
                state.unreadCount += 1;
            }
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchNotifications.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchNotifications.fulfilled, (state, action) => {
                state.isLoading = false;
                state.notifications = action.payload;
                state.unreadCount = action.payload.filter((n: Notification) => !n.isRead).length;
            })
            .addCase(fetchNotifications.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(markNotificationAsRead.fulfilled, (state, action) => {
                const notification = state.notifications.find(n => n.id === action.payload);
                if (notification && !notification.isRead) {
                    notification.isRead = true;
                    state.unreadCount = Math.max(0, state.unreadCount - 1);
                }
            })
            .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
                state.notifications.forEach(n => n.isRead = true);
                state.unreadCount = 0;
            })
            .addCase(fetchUnreadCount.fulfilled, (state, action) => {
                state.unreadCount = action.payload;
            });
    },
});

export const { addNotification, clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
