import api from '../utils/api';
import { CreateListDto, UpdateListDto, ListDto, ListItemDto } from '../types';

export interface AddMemberDto {
    userId: string;
}

const listService = {
    createList: async (data: CreateListDto) => {
        const response = await api.post<ListDto>('/lists', data);
        return response.data;
    },

    getMyLists: async () => {
        const response = await api.get<ListDto[]>('/lists/my');
        return response.data;
    },

    getPinnedLists: async () => {
        const response = await api.get<ListDto[]>('/lists/pinned');
        return response.data;
    },

    getList: async (id: string) => {
        const response = await api.get<ListDto>(`/lists/${id}`);
        return response.data;
    },

    updateList: async (id: string, data: UpdateListDto) => {
        const response = await api.put<ListDto>(`/lists/${id}`, data);
        return response.data;
    },

    deleteList: async (id: string) => {
        await api.delete(`/lists/${id}`);
    },

    pinList: async (id: string) => {
        await api.post(`/lists/${id}/pin`);
    },

    unpinList: async (id: string) => {
        await api.post(`/lists/${id}/unpin`);
    },

    getListFeed: async (id: string) => {
        const response = await api.get<any[]>(`/lists/${id}/feed`); // Use Post[] type if available
        return response.data;
    },

    getMembers: async (id: string) => {
        const response = await api.get<ListItemDto[]>(`/lists/${id}/members`);
        return response.data;
    },

    addMember: async (id: string, userId: string) => {
        await api.post(`/lists/${id}/members`, { userId });
    },

    removeMember: async (id: string, targetId: string) => {
        await api.delete(`/lists/${id}/members/${targetId}`);
    }
};

export default listService;
