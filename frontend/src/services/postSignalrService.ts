import * as signalR from '@microsoft/signalr';
import { updatePostStats, updateUserPostStatus, removePost, receiveNewPost } from '../redux/slices/postsSlice';
import { store } from '../redux/store';
import { API_BASE_URL } from '../constants';

const HUB_URL = API_BASE_URL.replace('/api', '/hubs/posts');

class PostSignalRService {
    private connection: signalR.HubConnection | null = null;
    private listeners: Set<(type: string, data: any) => void> = new Set();
    private isConnecting: boolean = false;
    private stopRequested: boolean = false;
    private retryCount: number = 0;
    private retryTimer: NodeJS.Timeout | null = null;

    public onEvent(callback: (type: string, data: any) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private emit(type: string, data: any) {
        this.listeners.forEach(l => l(type, data));
    }

    private setupHandlers() {
        if (!this.connection) return;

        this.connection.on('UpdatePostStats', (stats: any) => {
            const data = { ...stats, uri: stats.uri || stats.postId };
            store.dispatch(updatePostStats(data));
            this.emit('stats', data);
        });

        this.connection.on('UpdateUserPostStatus', (status: any) => {
            const data = { ...status, uri: status.uri || status.postId };
            store.dispatch(updateUserPostStatus(data));
            this.emit('status', data);
        });

        this.connection.on('PostDeleted', (postId: string) => {
            store.dispatch(removePost(postId));
            this.emit('deleted', postId);
        });
        
        this.connection.on('newPost', (post: any) => {
            store.dispatch(receiveNewPost(post));
            this.emit('created', post);
        });

        this.connection.on('newGlobalPost', (post: any) => {
            store.dispatch(receiveNewPost(post));
            this.emit('created', post);
        });
    }

    private getRetryDelay(retryCount: number) {
        // More resilient exponential backoff: 2s, 4s, 8s, 15s, 30s
        return Math.min(2000 * Math.pow(2, retryCount - 1), 30000);
    }

    public async startConnection() {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            console.log('[PostSignalR] Already connected');
            return;
        }

        if (this.isConnecting) {
            console.log('[PostSignalR] Connection attempt already in progress');
            return;
        }

        this.isConnecting = true;
        this.stopRequested = false;

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
            console.log('[PostSignalR] Connected successfully');
            this.retryCount = 0;
        } catch (err: any) {
            console.error('[PostSignalR] Connection failed:', err);
            
            const errorMessage = err?.toString() || '';
            if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.toLowerCase().includes('unauthorized')) {
                console.warn('[PostSignalR] Unauthorized. Stopping retries.');
                this.isConnecting = false;
                return;
            }

            if (!this.stopRequested) {
                this.retryCount++;
                const delay = this.getRetryDelay(this.retryCount);
                console.log(`[PostSignalR] Retrying in ${delay}ms... (attempt ${this.retryCount})`);
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

    public async joinPost(postId: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('JoinPost', postId);
            } catch (err) {
                console.error('Failed to join post group:', err);
            }
        }
    }

    public async leavePost(postId: string) {
        if (this.connection?.state === signalR.HubConnectionState.Connected) {
            try {
                await this.connection.invoke('LeavePost', postId);
            } catch (err) {
                console.error('Failed to leave post group:', err);
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
        this.retryCount = 0;
    }
}

const postSignalRService = new PostSignalRService();
export default postSignalRService;
