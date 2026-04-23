import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Conversation, Message } from '../../types';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

interface MessagesState {
    conversations: Conversation[];
    activeConversationMessages: Message[];
    activeConversationId: string | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMore: boolean;
    error: string | null;
}

const initialState: MessagesState = {
    conversations: [],
    activeConversationMessages: [],
    activeConversationId: null,
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    error: null,
};

export const fetchConversations = createAsyncThunk(
    'messages/fetchConversations',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/chat/conversations`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch conversations');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const fetchConversationById = createAsyncThunk(
    'messages/fetchConversationById',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch conversation');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const fetchMessages = createAsyncThunk(
    'messages/fetchMessages',
    async ({ conversationId, limit = 50, before }: { conversationId: string; limit?: number; before?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            let url = `${API_URL}/chat/conversations/${conversationId}/messages?limit=${limit}`;
            if (before) url += `&before=${before}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch messages');
            return { messages: data, isLoadMore: !!before };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const fetchChatLog = createAsyncThunk(
    'messages/fetchChatLog',
    async ({ conversationId, cursor }: { conversationId: string; cursor: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const url = `${API_URL}/chat/conversations/${conversationId}/log?cursor=${cursor}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch chat log');
            return data; // { cursor, logs: Message[] }
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const startConversation = createAsyncThunk(
    'messages/startConversation',
    async (participantIds: string[], { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ participantIds })
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to start conversation');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const markAsRead = createAsyncThunk(
    'messages/markAsRead',
    async ({ conversationId, messageId }: { conversationId: string; messageId?: string }, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            let url = `${API_URL}/chat/conversations/${conversationId}/read`;
            if (messageId) url += `?messageId=${messageId}`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to mark as read');
            }
            return conversationId;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const fetchChatSettings = createAsyncThunk(
    'messages/fetchSettings',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/chat/settings`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch settings');
            return data.allowIncoming;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const updateChatSettings = createAsyncThunk(
    'messages/updateSettings',
    async (allowIncoming: string, { rejectWithValue }) => {
        try {
            console.log('Thunk: updateChatSettings starting with:', allowIncoming);
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/chat/settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ allowIncoming })
            });
            console.log('Thunk: response received:', response.status);
            if (!response.ok) {
                const data = await response.json();
                console.error('Thunk: update failed:', data);
                return rejectWithValue(data.message || 'Failed to update settings');
            }
            console.log('Thunk: update success');
            return allowIncoming;
        } catch (error: any) {
            console.error('Thunk: error processing request:', error);
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

const messagesSlice = createSlice({
    name: 'messages',
    initialState,
    reducers: {
        setActiveConversation: (state, action: PayloadAction<string | null>) => {
            state.activeConversationId = action.payload;
            state.hasMore = true;
            // Don't clear messages here - let fetchMessages handle it
            // This prevents messages from disappearing before new ones load
            if (action.payload) {
                const conv = state.conversations.find(c => c.id === action.payload);
                if (conv) conv.unreadCount = 0;
            }
        },
        addMessage: (state, action: PayloadAction<{ message: Message; currentUserId: string | null }>) => {
            const { message, currentUserId } = action.payload;
            // If it's for the active conversation, add to messages list
            if (state.activeConversationId === message.conversationId) {
                // Avoid duplicates if sender also received via SignalR
                if (!state.activeConversationMessages.find(m => m.id === message.id)) {
                    state.activeConversationMessages.push(message);
                }
            }

            // Update the conversation's last message in the list and move to top
            const convIndex = state.conversations.findIndex(c => c.id === message.conversationId);
            if (convIndex !== -1) {
                const conv = state.conversations[convIndex];
                conv.lastMessage = message;

                // Only increment unread if it's from someone else AND not the active chat
                if (state.activeConversationId !== message.conversationId && message.senderId !== currentUserId) {
                    conv.unreadCount = (conv.unreadCount || 0) + 1;
                }
                // Move to top
                state.conversations.splice(convIndex, 1);
                state.conversations.unshift(conv);
            }
        },
        upsertConversation: (state, action: PayloadAction<Conversation>) => {
            const index = state.conversations.findIndex(c => c.id === action.payload.id);
            if (index !== -1) {
                state.conversations[index] = action.payload;
            } else {
                state.conversations.unshift(action.payload);
            }
        },
        updateMessageInStore: (state, action: PayloadAction<Message>) => {
            const updatedMessage = action.payload;
            // Always try to update by message id in active messages (handles conversationId format mismatches)
            const msgIndex = state.activeConversationMessages.findIndex(m => m.id === updatedMessage.id);
            if (msgIndex !== -1) {
                state.activeConversationMessages[msgIndex] = updatedMessage;
            }
            // Update in conversation's lastMessage if matches
            const conv = state.conversations.find(
                c => c.id === updatedMessage.conversationId || c.lastMessage?.id === updatedMessage.id
            );
            if (conv && conv.lastMessage?.id === updatedMessage.id) {
                conv.lastMessage = updatedMessage;
            }
        },
        removeMessageFromStore: (state, action: PayloadAction<string>) => {
            const messageId = action.payload;
            state.activeConversationMessages = state.activeConversationMessages.filter(m => m.id !== messageId);
            
            // Also update in conversations list if it was a lastMessage
            state.conversations.forEach(conv => {
                if (conv.lastMessage?.id === messageId) {
                    conv.lastMessage = null; // Or potentially fetch previous message (complex, so null for now)
                }
            });
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchConversations.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchConversations.fulfilled, (state, action: PayloadAction<Conversation[]>) => {
                state.isLoading = false;
                state.conversations = action.payload;
            })
            .addCase(fetchConversations.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchConversationById.fulfilled, (state, action: PayloadAction<Conversation>) => {
                const index = state.conversations.findIndex(c => c.id === action.payload.id);
                if (index === -1) {
                    state.conversations.unshift(action.payload);
                } else {
                    state.conversations[index] = action.payload;
                }
                // Removed setting activeConversationId from here to avoid unexpected switches
            })
            .addCase(fetchMessages.pending, (state, action) => {
                if (action.meta.arg.before) {
                    state.isLoadingMore = true;
                } else {
                    state.isLoading = true;
                    // Only clear if conversation changed, to prevent flickers on refresh
                    if (state.activeConversationId !== action.meta.arg.conversationId) {
                        state.activeConversationMessages = [];
                    }
                }
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isLoadingMore = false;
                const { messages, isLoadMore } = action.payload;

                if (isLoadMore) {
                    state.activeConversationMessages = [...messages, ...state.activeConversationMessages];
                } else {
                    state.activeConversationMessages = messages;
                }

                state.hasMore = messages.length >= (action.meta.arg.limit || 50);
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.isLoading = false;
                state.isLoadingMore = false;
                state.error = action.payload as string;
            })
            .addCase(startConversation.fulfilled, (state, action: PayloadAction<Conversation>) => {
                if (!state.conversations.find(c => c.id === action.payload.id)) {
                    state.conversations.unshift(action.payload);
                }
                state.activeConversationId = action.payload.id;
            })
            .addCase(markAsRead.fulfilled, (state, action: PayloadAction<string>) => {
                const conv = state.conversations.find(c => c.id === action.payload);
                if (conv) {
                    conv.unreadCount = 0;
                }
            })
            .addCase(fetchChatSettings.fulfilled, (state, action) => {
                // Settings are managed by the component state, but we could store them here if needed
            })
            .addCase(updateChatSettings.fulfilled, (state, action) => {
                // Settings update confirmed
            })
            .addCase(fetchChatLog.fulfilled, (state, action) => {
                const { logs } = action.payload;
                if (logs && logs.length > 0) {
                    const existingIds = new Set(state.activeConversationMessages.map(m => m.id));
                    const newMessages = logs.filter((m: Message) => !existingIds.has(m.id));
                    state.activeConversationMessages = [...state.activeConversationMessages, ...newMessages];
                }
            });
    }
});

export const { setActiveConversation, addMessage, updateMessageInStore, removeMessageFromStore } = messagesSlice.actions;
export default messagesSlice.reducer;
