import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { NotificationsState, Notification } from '../../types';

const getXrpcBase = () => '/xrpc';


export const fetchNotifications = createAsyncThunk<Notification[], void, { rejectValue: string }>(
    'notifications/fetchNotifications',
    async (_, { rejectWithValue }) => {
        try {
            const res = await fetch(`${getXrpcBase()}/app.bsky.notification.listNotifications?limit=50`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                return rejectWithValue(err.message || `Error ${res.status}`);
            }
            const data = await res.json();
            console.log('DEBUG: Notifications raw data:', data);
            const notifications: any[] = data.notifications || [];
            const mapped: Notification[] = notifications.map(n => {
                const author = n.author || {};
                const reason = (n.reason || 'unknown').toLowerCase();
                return {
                    id: n.cid || n.uri || Math.random().toString(36).substring(7),
                    uri: n.uri || '',
                    cid: n.cid || '',
                    type: reason as any,
                    reason: reason,
                    reasonSubject: n.reasonSubject,
                    sender: {
                        id: author.did || 'unknown',
                        did: author.did || 'unknown',
                        handle: author.handle || 'unknown',
                        username: author.handle || 'unknown',
                        displayName: author.displayName || author.handle || 'Unknown',
                        avatarUrl: author.avatar,
                    } as any,
                    isRead: !!n.isRead,
                    createdAt: n.indexedAt || new Date().toISOString(),
                    record: n.record,
                    content: n.content || n.record?.text || '',
                    title: n.title,
                    listId: n.listId,
                    invitationStatus: n.invitationStatus,
                    subjectUri: n.reasonSubject,
                    postAuthorHandle: n.postAuthorHandle,
                    postId: n.reasonSubject ? n.reasonSubject.split('/').pop() : undefined
                };
            });
            console.log('DEBUG: Mapped notifications:', mapped);
            return mapped;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to fetch notifications');
        }
    }
);

export const markNotificationAsRead = createAsyncThunk<string, string, { rejectValue: string }>(
    'notifications/markAsRead',
    async (id: string, { rejectWithValue }) => {
        try {
            await fetch(`${getXrpcBase()}/app.bsky.notification.updateSeen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seenAt: new Date().toISOString() })
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
            await fetch(`${getXrpcBase()}/app.bsky.notification.updateSeen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ seenAt: new Date().toISOString() })
            });
        } catch (error: any) {
            return rejectWithValue(error.message || 'Failed to mark all as read');
        }
    }
);

export const fetchUnreadCount = createAsyncThunk<number, void, { rejectValue: string }>(
    'notifications/fetchUnreadCount',
    async (_, { rejectWithValue }) => {
        try {
            const res = await fetch(`${getXrpcBase()}/app.bsky.notification.getUnreadCount`);
            if (!res.ok) return rejectWithValue('Failed to fetch unread count');
            const data = await res.json();
            return data.count ?? 0;
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
