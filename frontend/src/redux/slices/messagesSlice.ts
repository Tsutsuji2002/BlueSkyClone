import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Conversation, Message } from '../../types';

const API_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : '/api');

interface MessagesState {
    conversations: Conversation[];
    conversationsCursor: string | null;
    hasMoreConversations: boolean;
    activeConversationMessages: Message[];
    activeConversationId: string | null;
    isConversationsLoading: boolean;
    isMessagesLoading: boolean;
    isLoadingMore: boolean;
    isLoadingMoreConversations: boolean;
    hasMore: boolean;
    error: string | null;
    // Cache
    messagesByConversationId: Record<string, Message[]>;
    hasMoreByConversationId: Record<string, boolean>;
}

const initialState: MessagesState = {
    conversations: [],
    conversationsCursor: null,
    hasMoreConversations: true,
    activeConversationMessages: [],
    activeConversationId: null,
    isConversationsLoading: false,
    isMessagesLoading: false,
    isLoadingMore: false,
    isLoadingMoreConversations: false,
    hasMore: true,
    error: null,
    messagesByConversationId: {},
    hasMoreByConversationId: {},
};

export const fetchConversations = createAsyncThunk(
    'messages/fetchConversations',
    async ({ limit = 50, cursor, isRequest }: { limit?: number; cursor?: string | null; isRequest?: boolean } | undefined = {}, { rejectWithValue }) => {
        try {
            let url = `${API_URL}/chat/conversations?limit=${limit}`;
            if (cursor) url += `&cursor=${cursor}`;
            if (isRequest !== undefined) url += `&isRequest=${isRequest}`;

            const response = await fetch(url, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch conversations');
            return { conversations: data, isLoadMore: !!cursor };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const fetchConversationById = createAsyncThunk(
    'messages/fetchConversationById',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
                credentials: 'include'
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
            let url = `${API_URL}/chat/conversations/${conversationId}/messages?limit=${limit}`;
            if (before) url += `&before=${before}`;

            const response = await fetch(url, {
                credentials: 'include'
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
            const url = `${API_URL}/chat/conversations/${conversationId}/log?cursor=${cursor}`;
            const response = await fetch(url, {
                credentials: 'include'
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
            const response = await fetch(`${API_URL}/chat/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ participantIds }),
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to start conversation');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const acceptConversation = createAsyncThunk(
    'messages/acceptConversation',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/accept`, {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to accept conversation');
            }
            return conversationId;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const markAsRead = createAsyncThunk(
    'messages/markAsRead',
    async ({ conversationId, messageId }: { conversationId: string; messageId?: string }, { rejectWithValue }) => {
        try {
            let url = `${API_URL}/chat/conversations/${conversationId}/read`;
            if (messageId) url += `?messageId=${messageId}`;
            
            const response = await fetch(url, {
                method: 'POST',
                credentials: 'include'
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
            const response = await fetch(`${API_URL}/chat/settings`, {
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch settings');
            // data is now ChatSettingsDto: { allowIncoming, allowGroupInvites }
            return data as { allowIncoming: string; allowGroupInvites?: string };
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const updateChatSettings = createAsyncThunk(
    'messages/updateSettings',
    async (settings: { allowIncoming: string; allowGroupInvites?: string }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings),
                credentials: 'include'
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to update settings');
            }
            return settings;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const deleteConversation = createAsyncThunk(
    'messages/deleteConversation',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (!response.ok) {
                const data = await response.json();
                return rejectWithValue(data.message || 'Failed to delete conversation');
            }
            return conversationId;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const addMembers = createAsyncThunk(
    'messages/addMembers',
    async ({ conversationId, members }: { conversationId: string; members: string[] }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ members }),
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to add members');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const createInviteLink = createAsyncThunk(
    'messages/createInviteLink',
    async ({ conversationId, requireApproval, joinRule }: { conversationId: string; requireApproval: boolean; joinRule: string }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/invite-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requireApproval, joinRule }),
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to create invite link');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const updateInviteLink = createAsyncThunk(
    'messages/updateInviteLink',
    async ({ conversationId, requireApproval, joinRule }: { conversationId: string; requireApproval?: boolean; joinRule?: string }, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/invite-link`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requireApproval, joinRule }),
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to update invite link');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const disableInviteLink = createAsyncThunk(
    'messages/disableInviteLink',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/invite-link`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to disable invite link');
            return data;
        } catch (error: any) {
            return rejectWithValue(error.message || 'Something went wrong');
        }
    }
);

export const fetchInviteLink = createAsyncThunk(
    'messages/fetchInviteLink',
    async (conversationId: string, { rejectWithValue }) => {
        try {
            const response = await fetch(`${API_URL}/chat/conversations/${conversationId}/invite-link`, {
                credentials: 'include'
            });
            if (response.status === 404) return null; // No link exists yet
            const data = await response.json();
            if (!response.ok) return rejectWithValue(data.message || 'Failed to fetch invite link');
            return data;
        } catch (error: any) {
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
            
            if (action.payload) {
                // Instantly hydrate from cache for "immediate" feel
                state.activeConversationMessages = state.messagesByConversationId[action.payload] || [];
                state.hasMore = state.hasMoreByConversationId[action.payload] ?? true;
                
                const conv = state.conversations.find(c => c.id === action.payload);
                if (conv) conv.unreadCount = 0;
            } else {
                state.activeConversationMessages = [];
            }
        },
        addMessage: (state, action: PayloadAction<{ message: Message; currentUserId: string | null; currentUserDid?: string | null }>) => {
            const { message, currentUserId, currentUserDid } = action.payload;
            // Update Cache
            if (!state.messagesByConversationId[message.conversationId]) {
                state.messagesByConversationId[message.conversationId] = [];
            }
            const cache = state.messagesByConversationId[message.conversationId];
            if (!cache.find(m => m.id === message.id || (m.tid && message.tid && m.tid === message.tid))) {
                if (message.replyTo) {
                    // Ensure replyTo has a sender object for consistent rendering if possible
                    if (typeof message.replyTo === 'object' && !message.replyTo.sender) {
                        const existingMsg = cache.find(m => m.id === message.replyTo?.id);
                        if (existingMsg) {
                            message.replyTo.sender = existingMsg.sender;
                            if (!message.replyTo.content) message.replyTo.content = existingMsg.content;
                        }
                    }
                }
                cache.push(message);
                cache.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }

            // Sync with active conversation messages if applicable
            if (state.activeConversationId === message.conversationId) {
                state.activeConversationMessages = [...cache];
            }

            // Update the conversation's last message in the list and move to top
            const convIndex = state.conversations.findIndex(c => c.id === message.conversationId);
            if (convIndex !== -1) {
                const conv = state.conversations[convIndex];
                conv.lastMessage = message;

                // Only increment unread if it's from someone else AND not the active chat
                const isMsgFromMe = 
                    (currentUserId && message.senderId === currentUserId) || 
                    (currentUserDid && message.sender?.did === currentUserDid) ||
                    (currentUserDid && message.senderId === currentUserDid);

                if (state.activeConversationId !== message.conversationId && !isMsgFromMe) {
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
        replaceOptimisticMessage: (state, action: PayloadAction<{ tempId: string; realMessage: Message }>) => {
            const { tempId, realMessage } = action.payload;
            const idx = state.activeConversationMessages.findIndex(m => m.id === tempId);
            if (idx !== -1) {
                state.activeConversationMessages[idx] = realMessage;
            } else if (!state.activeConversationMessages.find(m => m.id === realMessage.id)) {
                // If temp was already removed / replaced, just push real if not present
                state.activeConversationMessages.push(realMessage);
            }
            // Update lastMessage in conversation list
            const conv = state.conversations.find(c => c.id === realMessage.conversationId);
            if (conv && conv.lastMessage?.id === tempId) {
                conv.lastMessage = realMessage;
            }
        },
        clearMessages: (state) => {
            state.conversations = [];
            state.conversationsCursor = null;
            state.hasMoreConversations = true;
            state.activeConversationMessages = [];
            state.activeConversationId = null;
            state.isConversationsLoading = false;
            state.isMessagesLoading = false;
            state.isLoadingMore = false;
            state.isLoadingMoreConversations = false;
            state.hasMore = true;
            state.error = null;
            state.messagesByConversationId = {};
            state.hasMoreByConversationId = {};
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchConversations.pending, (state, action) => {
                if (action.meta.arg?.cursor) {
                    state.isLoadingMoreConversations = true;
                } else {
                    state.isConversationsLoading = true;
                }
            })
            .addCase(fetchConversations.fulfilled, (state, action) => {
                state.isConversationsLoading = false;
                state.isLoadingMoreConversations = false;
                const { conversations, isLoadMore } = action.payload;
                
                if (isLoadMore) {
                    state.conversations = [...state.conversations, ...conversations];
                } else {
                    state.conversations = conversations;
                }

                state.hasMoreConversations = conversations.length >= (action.meta.arg?.limit || 50);
                state.conversationsCursor = conversations.length > 0 ? conversations[conversations.length - 1].id : state.conversationsCursor;
            })
            .addCase(fetchConversations.rejected, (state, action) => {
                state.isConversationsLoading = false;
                state.isLoadingMoreConversations = false;
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
                const { conversationId, before } = action.meta.arg;
                if (before) {
                    state.isLoadingMore = true;
                } else {
                    state.isMessagesLoading = true;
                    // Switch to cached messages immediately to avoid blank screen if we already have some
                    state.activeConversationMessages = state.messagesByConversationId[conversationId] || [];
                    state.hasMore = state.hasMoreByConversationId[conversationId] ?? true;
                }
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.isMessagesLoading = false;
                state.isLoadingMore = false;
                const { messages, isLoadMore } = action.payload;
                const conversationId = action.meta.arg.conversationId;

                let finalMessages: Message[] = [];
                if (isLoadMore) {
                    const currentMessages = state.messagesByConversationId[conversationId] || [];
                    const combined = [...messages, ...currentMessages];
                    // Unique by id
                    finalMessages = Array.from(new Map(combined.map(m => [m.id, m])).values())
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                } else {
                    finalMessages = [...messages].sort((a, b) => 
                        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                    );
                }

                // Update Cache
                state.messagesByConversationId[conversationId] = finalMessages;
                state.hasMoreByConversationId[conversationId] = messages.length >= (action.meta.arg.limit || 50);

                // Sync active if applicable
                if (state.activeConversationId === conversationId) {
                    state.activeConversationMessages = finalMessages;
                    state.hasMore = state.hasMoreByConversationId[conversationId];
                }
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.isMessagesLoading = false;
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
                const conversationId = action.meta.arg.conversationId;

                if (logs && logs.length > 0) {
                    const currentMessages = state.messagesByConversationId[conversationId] || [];
                    const existingIds = new Set(currentMessages.map(m => m.id));
                    const newMessages = logs.filter((m: Message) => !existingIds.has(m.id));
                    
                    if (newMessages.length > 0) {
                        const finalMessages = [...currentMessages, ...newMessages].sort((a, b) => 
                            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                        );
                        
                        state.messagesByConversationId[conversationId] = finalMessages;
                        
                        if (state.activeConversationId === conversationId) {
                            state.activeConversationMessages = finalMessages;
                        }
                    }
                }
            });
        builder.addCase(acceptConversation.fulfilled, (state, action) => {
            const conv = state.conversations.find(c => c.id === action.payload);
            if (conv) {
                conv.isAccepted = true;
            }
        });
        builder.addCase(deleteConversation.fulfilled, (state, action) => {
            state.conversations = state.conversations.filter(c => c.id !== action.payload);
            if (state.activeConversationId === action.payload) {
                state.activeConversationId = null;
                state.activeConversationMessages = [];
            }
        });
    }
});

export const { setActiveConversation, addMessage, updateMessageInStore, removeMessageFromStore, clearMessages, replaceOptimisticMessage } = messagesSlice.actions;
export default messagesSlice.reducer;
