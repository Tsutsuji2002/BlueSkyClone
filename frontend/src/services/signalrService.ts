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
    private isConnecting: boolean = false;
    private stopRequested: boolean = false;
    private retryCount: number = 0;
    private retryTimer: NodeJS.Timeout | null = null;

    public onStatusChange(callback: (status: HubStatus) => void) {
        this.statusListeners.push(callback);
    }

    private updateStatus(status: HubStatus) {
        this.hubStatus = status;
        this.statusListeners.forEach(fn => fn(status));
    }

    private getRetryDelay(retryCount: number): number {
        // More resilient exponential backoff: 2s, 4s, 8s, 15s, 30s
        return Math.min(2000 * Math.pow(2, retryCount - 1), 30000);
    }

    private setupHandlers() {
        if (!this.connection) return;

        this.connection.onreconnecting((error) => {
            console.warn('[SignalR] reconnecting due to error:', error);
            this.updateStatus(HubStatus.Reconnecting);
        });

        this.connection.onreconnected((connectionId) => {
            console.log('[SignalR] reconnected. New ConnectionId:', connectionId);
            this.updateStatus(HubStatus.Connected);
        });

        this.connection.onclose((error) => {
            console.error('[SignalR] connection closed:', error);
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

        this.connection.on('ReceiveNotification', (notification) => {
            if (notification.type !== 'message') {
                store.dispatch(addNotification(notification));
            }
            const message = notification.title || 'New notification received';
            // @ts-ignore
            store.dispatch({
                type: 'toast/showToast',
                payload: { message, type: 'info' }
            });
        });
    }

    public async startConnection() {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            console.log('[SignalR] Already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('[SignalR] Connection attempt already in progress');
            return;
        }

        this.isConnecting = true;
        this.stopRequested = false;
        this.updateStatus(HubStatus.Connecting);

        try {
            this.connection = new signalR.HubConnectionBuilder()
                .withUrl(HUB_URL, {
                    accessTokenFactory: () => {
                        // Rely on HttpOnly cookies instead of localStorage tokens
                        return '';
                    }
                })
                .withAutomaticReconnect({
                    nextRetryDelayInMilliseconds: retryContext => {
                        if (retryContext.elapsedMilliseconds > 60000) return null;
                        return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
                    }
                })
                .configureLogging(signalR.LogLevel.Information)
                .build();

            this.setupHandlers();
            await this.connection.start();
            this.updateStatus(HubStatus.Connected);
            this.retryCount = 0;
            console.log('[SignalR] Connected successfully');
        } catch (err: any) {
            console.error('[SignalR] Connection failed:', err);
            this.updateStatus(HubStatus.Disconnected);
            
            const errorMessage = err?.toString() || '';
            if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.toLowerCase().includes('unauthorized')) {
                console.warn('[SignalR] Unauthorized. Stopping retries.');
                this.isConnecting = false;
                return;
            }

            if (!this.stopRequested) {
                this.retryCount++;
                const delay = this.getRetryDelay(this.retryCount);
                console.log(`[SignalR] Retrying in ${delay}ms... (attempt ${this.retryCount})`);
                this.retryTimer = setTimeout(() => {
                    this.isConnecting = false;
                    this.startConnection();
                }, delay);
            }
        } finally {
            if (!this.retryTimer) {
                this.isConnecting = false;
            }
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
        this.stopRequested = true;
        this.isConnecting = false;
        if (this.retryTimer) {
            clearTimeout(this.retryTimer);
            this.retryTimer = null;
        }
        
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
        }
        this.updateStatus(HubStatus.Disconnected);
        this.retryCount = 0;
    }
}

const signalrService = new SignalRService();
export default signalrService;
