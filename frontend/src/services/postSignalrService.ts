import * as signalR from '@microsoft/signalr';
import { updatePostStats, updateUserPostStatus, removePost, receiveNewPost } from '../redux/slices/postsSlice';
import { store } from '../redux/store';
import { API_BASE_URL } from '../constants';

const HUB_URL = API_BASE_URL.replace('/api', '/hubs/posts');

class PostSignalRService {
    private connection: signalR.HubConnection | null = null;
    private listeners: Set<(type: string, data: any) => void> = new Set();

    public onEvent(callback: (type: string, data: any) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private emit(type: string, data: any) {
        this.listeners.forEach(l => l(type, data));
    }

    public async startConnection() {
        if (this.connection) return;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => localStorage.getItem('token') || ''
            })
            .withAutomaticReconnect()
            .build();

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

        try {
            await this.connection.start();
            console.log('PostSignalR connected');
        } catch (err: any) {
            console.error('PostSignalR connection error: ', err);
            
            // If it's an auth error (401 or 403), don't spam retries as they will keep failing
            const errorMessage = err?.toString() || '';
            if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.toLowerCase().includes('unauthorized')) {
                console.warn('PostSignalR: Unauthorized (401/403). Stopping connection retries.');
                return;
            }

            setTimeout(() => this.startConnection(), 10000); // Backoff bit more to 10s
        }
    }

    public stopConnection() {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
        }
    }
}

const postSignalRService = new PostSignalRService();
export default postSignalRService;
