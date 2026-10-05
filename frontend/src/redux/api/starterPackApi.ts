import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../constants';

export interface StarterPackFeedRef {
    uri: string;
}

export interface StarterPackRecord {
    $type: string;
    name: string;
    description?: string;
    list: string;
    feeds?: StarterPackFeedRef[];
    createdAt: string;
}

export interface StarterPackView {
    uri: string;
    cid: string;
    record: StarterPackRecord;
    creator?: {
        did: string;
        handle: string;
        displayName?: string;
        avatar?: string;
    };
    list?: {
        uri: string;
        cid: string;
        name: string;
        purpose?: string;
        avatar?: string;
        listItemCount?: number;
    };
    listItemsSample?: Array<{
        uri: string;
        subject: {
            did: string;
            handle: string;
            displayName?: string;
            avatar?: string;
            description?: string;
            viewer?: {
                following?: string;
                followedBy?: string;
            };
        };
    }>;
    feeds?: Array<{
        uri: string;
        cid: string;
        displayName: string;
        likeCount?: number;
        avatar?: string;
    }>;
    joinedAllTimeCount?: number;
    joinedWeekCount?: number;
    indexedAt?: string;
}

export interface GetActorStarterPacksResponse {
    starterPacks: StarterPackView[];
    cursor?: string;
}

export interface GetStarterPackResponse {
    starterPack: StarterPackView;
}

export const starterPackApi = createApi({
    reducerPath: 'starterPackApi',
    baseQuery: fetchBaseQuery({
        baseUrl: `${API_BASE_URL}/starterpack`,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('token');
            if (token) {
                headers.set('authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    endpoints: (builder) => ({
        getStarterPack: builder.query<GetStarterPackResponse, { starterPack: string }>({
            query: ({ starterPack }) => `/view?starterPack=${encodeURIComponent(starterPack)}`,
        }),
        getActorStarterPacks: builder.query<GetActorStarterPacksResponse, { actor: string; limit?: number; cursor?: string }>({
            query: ({ actor, limit = 50, cursor }) => {
                let url = `/actor/${encodeURIComponent(actor)}?limit=${limit}`;
                if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
                return url;
            },
        }),
        followAllMembers: builder.mutation<{ successCount: number; total: number }, { targetDids: string[] }>({
            query: ({ targetDids }) => ({
                url: '/follow-all',
                method: 'POST',
                body: targetDids,
            }),
        }),
        getListFeed: builder.query<{ feed: any[]; cursor?: string }, { list: string; limit?: number; cursor?: string }>({
            query: ({ list, limit = 30, cursor }) => {
                let url = `/list-feed?list=${encodeURIComponent(list)}&limit=${limit}`;
                if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
                return url;
            },
        }),
    }),
});

export const {
    useGetStarterPackQuery,
    useGetActorStarterPacksQuery,
    useFollowAllMembersMutation,
    useGetListFeedQuery,
    useLazyGetListFeedQuery,
} = starterPackApi;

