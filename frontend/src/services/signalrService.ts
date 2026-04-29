import * as signalR from '@microsoft/signalr';
import { addMessage, fetchConversationById, updateMessageInStore, removeMessageFromStore } from '../redux/slices/messagesSlice';
import { addNotification } from '../redux/slices/notificationsSlice';
import { store } from '../redux/store';
import { Message } from '../types';

const HUB_URL = process.env.REACT_APP_HUB_URL || 'http://localhost:5000/hubs/chat';

export enum HubStatus {
    Disconnected = 'Disconnected',
    Connecting = 'Connecting',
    Connected = 'Connected',
    Reconnecting = 'Reconnecting'
}

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    public hubStatus: HubStatus = HubStatus.Disconnected;
    private statusListeners: ((status: HubStatus) => void)[] = [];

    public onStatusChange(callback: (status: HubStatus) => void) {
        this.statusListeners.push(callback);
    }

    private updateStatus(status: HubStatus) {
        this.hubStatus = status;
        this.statusListeners.forEach(fn => fn(status));
    }

    public async startConnection() {
        if (this.connection) return;

        this.updateStatus(HubStatus.Connecting);

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => localStorage.getItem('token') || ''
            })
            .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Custom retry intervals
            .build();

        this.connection.onreconnecting((error) => {
            console.warn('SignalR reconnecting due to error:', error);
            this.updateStatus(HubStatus.Reconnecting);
        });
        this.connection.onreconnected((connectionId) => {
            console.log('SignalR reconnected. New ConnectionId:', connectionId);
            this.updateStatus(HubStatus.Connected);
        });
        this.connection.onclose((error) => {
            console.error('SignalR connection closed:', error);
            this.updateStatus(HubStatus.Disconnected);
        });

        this.connection.on('ReceiveMessage', (message: Message) => {
            const state = store.getState();
            const currentUserId = state.auth.user?.id || null;
            const exists = state.messages.conversations.find(c => c.id === message.conversationId);

            if (!exists) {
                // @ts-ignore
                store.dispatch(fetchConversationById(message.conversationId)).then((action: any) => {
                    if (action.payload) {
                        store.dispatch(addMessage({ message, currentUserId }));
                    }
                });
            } else {
                store.dispatch(addMessage({ message, currentUserId }));
            }
        });

        this.connection.on('UpdateMessage', (message: Message) => {
            store.dispatch(updateMessageInStore(message));
        });

        this.connection.on('RemoveMessage', (messageId: string) => {
            store.dispatch(removeMessageFromStore(messageId));
        });

        // Add handler for notifications
        this.connection.on('ReceiveNotification', (notification) => {
            // Chat messages should only be handled in the chat section, not in the general notification feed
            if (notification.type !== 'message') {
                store.dispatch(addNotification(notification));
            }
            // Show a toast for instant feedback
            const message = notification.title || 'New notification received';
            // @ts-ignore
            store.dispatch({
                type: 'toast/showToast',
                payload: { message, type: 'info' }
            });
        });

        try {
            await this.connection.start();
            this.updateStatus(HubStatus.Connected);
            console.log('SignalR connected');
        } catch (err) {
            this.updateStatus(HubStatus.Disconnected);
            console.error('SignalR connection error: ', err);
            setTimeout(() => this.startConnection(), 5000);
        }
    }

    public async joinConversation(conversationId: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('JoinConversation', conversationId);
            } catch (err) {
                console.error('Failed to join conversation:', err);
            }
        }
    }

    public async leaveConversation(conversationId: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('LeaveConversation', conversationId);
            } catch (err) {
                console.error('Failed to leave conversation:', err);
            }
        }
    }

    public async sendMessage(conversationId: string, content?: string | null, imageUrl?: string | null, replyToId?: string | null, linkPreview?: any | null) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('SendMessage', conversationId, content, imageUrl, replyToId, linkPreview);
            } catch (err) {
                console.error('Failed to send message:', err);
                throw err;
            }
        } else {
            throw new Error('SignalR not connected');
        }
    }

    public async editMessage(messageId: string, newContent: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('EditMessage', messageId, newContent);
            } catch (err) {
                console.error('Failed to edit message:', err);
                throw err;
            }
        }
    }

    public async recallMessage(messageId: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('RecallMessage', messageId);
            } catch (err) {
                console.error('Failed to recall message:', err);
                throw err;
            }
        }
    }

    public async addReaction(conversationId: string, messageId: string, emoji: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('AddReaction', conversationId, messageId, emoji);
            } catch (err) {
                console.error('Failed to add reaction:', err);
                throw err;
            }
        }
    }

    public async deleteMessageForSelf(conversationId: string, messageId: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('DeleteMessageForSelf', conversationId, messageId);
            } catch (err) {
                console.error('Failed to delete message for self:', err);
                throw err;
            }
        }
    }

    public stopConnection() {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
        }
    }
}

const signalrService = new SignalRService();
export default signalrService;
