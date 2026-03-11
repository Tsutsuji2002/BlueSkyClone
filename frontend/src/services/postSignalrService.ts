import * as signalR from '@microsoft/signalr';
import { updatePostStats, updateUserPostStatus, removePost } from '../redux/slices/postsSlice';
import { store } from '../redux/store';
import { API_BASE_URL } from '../constants';

const HUB_URL = API_BASE_URL.replace('/api', '/hubs/posts');

class PostSignalRService {
    private connection: signalR.HubConnection | null = null;

    public async startConnection() {
        if (this.connection) return;

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => localStorage.getItem('token') || ''
            })
            .withAutomaticReconnect()
            .build();

        this.connection.on('UpdatePostStats', (stats: { postId: string; likesCount: number; repostsCount: number; bookmarksCount: number; repliesCount: number; quotesCount: number, timestamp?: string }) => {
            store.dispatch(updatePostStats({ ...stats, uri: stats.postId }));
        });

        this.connection.on('UpdateUserPostStatus', (status: { postId: string; isLiked?: boolean; isReposted?: boolean; isBookmarked?: boolean, timestamp?: string }) => {
            store.dispatch(updateUserPostStatus({ ...status, uri: status.postId }));
        });

        this.connection.on('PostDeleted', (postId: string) => {
            store.dispatch(removePost(postId));
        });

        try {
            await this.connection.start();
            console.log('PostSignalR connected');
        } catch (err) {
            console.error('PostSignalR connection error: ', err);
            setTimeout(() => this.startConnection(), 5000);
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
