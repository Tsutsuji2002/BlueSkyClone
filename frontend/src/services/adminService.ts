import { API_BASE_URL } from '../constants';
import { AdminStats, AdminList, AdminConversation, AdminBlock, AdminMute, BroadcastNotificationRequest, PaginatedResult, AdminUser, AdminPost, AdminFeed, AdminInterest, AdminHashtag } from '../types/admin';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const adminService = {
    getUsers: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminUser>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/users?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        return response.json();
    },

    banUser: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/ban`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to ban user');
    },

    unbanUser: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/unban`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to unban user');
    },

    toggleVerify: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/verify`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to toggle verification');
    },

    changeUserRole: async (id: string, role: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/users/${id}/role`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ role })
        });
        if (!response.ok) throw new Error('Failed to change user role');
    },

    getStats: async (): Promise<AdminStats> => {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch stats');
        return response.json();
    },

    getLists: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminList>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/lists?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch lists');
        return response.json();
    },

    deleteList: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/lists/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete list');
    },

    getListMembers: async (listId: string, skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminUser>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/lists/${listId}/members?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch list members');
        return response.json();
    },

    getConversations: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminConversation>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/conversations?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch conversations');
        return response.json();
    },

    deleteConversation: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/conversations/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete conversation');
    },

    getBlocks: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminBlock>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/moderation/blocks?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch blocks');
        return response.json();
    },

    getMutes: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminMute>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/moderation/mutes?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch mutes');
        return response.json();
    },

    getPosts: async (skip = 0, take = 20, search?: string, includeDeleted = false, onlyDeleted = false): Promise<PaginatedResult<AdminPost>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString(),
            includeDeleted: includeDeleted.toString(),
            onlyDeleted: onlyDeleted.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/posts?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch posts');
        return response.json();
    },

    deletePost: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/posts/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete post');
    },

    hidePost: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/posts/${id}/hide`, {
            method: 'POST',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to hide post');
    },

    deletePostPermanent: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/posts/${id}/permanent`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to permanently delete post');
    },

    getFeeds: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminFeed>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/feeds?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch feeds');
        return response.json();
    },

    getFeedSubscribers: async (feedId: string, skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminUser>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/feeds/${feedId}/subscribers?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch subscribers');
        return response.json();
    },

    deleteFeed: async (id: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/feeds/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete feed');
    },

    // ... create/update feed omitted for brevity (existing) ...

    getInterests: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminInterest>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/interests?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch interests');
        return response.json();
    },

    getInterestUsers: async (interest: string, skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminUser>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/interests/${encodeURIComponent(interest)}/users?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch interest users');
        return response.json();
    },

    deleteInterest: async (interest: string): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/interests/${encodeURIComponent(interest)}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete interest');
    },

    broadcastNotification: async (request: BroadcastNotificationRequest): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/notifications/broadcast`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(request)
        });
        if (!response.ok) throw new Error('Failed to broadcast notification');
    },

    getHashtags: async (skip = 0, take = 20, search?: string): Promise<PaginatedResult<AdminHashtag>> => {
        const query = new URLSearchParams({
            skip: skip.toString(),
            take: take.toString()
        });
        if (search) query.append('search', search);

        const response = await fetch(`${API_BASE_URL}/admin/hashtags?${query.toString()}`, {
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to fetch hashtags');
        return response.json();
    },

    deleteHashtag: async (id: number): Promise<void> => {
        const response = await fetch(`${API_BASE_URL}/admin/hashtags/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (!response.ok) throw new Error('Failed to delete hashtag');
    }
};
