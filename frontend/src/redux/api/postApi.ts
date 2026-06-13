import { apiSlice } from './apiSlice';
import { Post } from '../../types';
import { mapAtProtoPostToPost } from '../../utils/postMapper';
import { hydratePostsWithInteractionStatus } from '../../utils/postHydrator';

export const postApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getTimeline: builder.query<{ posts: Post[]; skip: number; hasMore: boolean }, { skip?: number; take?: number; refresh?: boolean }>({
            query: ({ skip = 0, take = 20, refresh = false }) => ({
                url: '/posts/timeline',
                params: { skip, take, refresh: refresh ? 'true' : undefined },
            }),
            transformResponse: async (rawPosts: any[]) => {
                let posts = rawPosts.map((p: any) => mapAtProtoPostToPost(p));
                posts = await hydratePostsWithInteractionStatus(posts);
                return { posts, skip: 0, hasMore: rawPosts.length >= 20 };
            },
            providesTags: (result) =>
                result
                    ? [
                          ...result.posts.map(({ uri }) => ({ type: 'Post' as const, id: uri })),
                          { type: 'Feed', id: 'TIMELINE' },
                      ]
                    : [{ type: 'Feed', id: 'TIMELINE' }],
        }),
        getUserPosts: builder.query<{ posts: Post[]; cursor: string | null }, { userId: string; type?: string; take?: number; skip?: number; cursor?: string; refresh?: boolean }>({
            query: ({ userId, type, take = 20, skip = 0, cursor, refresh = false }) => ({
                url: `/posts/user/${userId}`,
                params: { type, take, skip, cursor, refresh: refresh ? 'true' : undefined },
            }),
            transformResponse: async (data: any) => {
                const rawPosts: any[] = Array.isArray(data) ? data : (data.posts || []);
                let posts = rawPosts.map((p: any) => mapAtProtoPostToPost(p));
                posts = await hydratePostsWithInteractionStatus(posts);
                return { posts, cursor: data.cursor || null };
            },
            providesTags: (result) =>
                result
                    ? [
                          ...result.posts.map(({ uri }) => ({ type: 'Post' as const, id: uri })),
                          { type: 'Feed', id: 'USER_POSTS' },
                      ]
                    : [{ type: 'Feed', id: 'USER_POSTS' }],
        }),
        getPostDetails: builder.query<{ targetPost: Post | null; allPosts: Post[] }, { uri: string; handle?: string; take?: number }>({
            query: ({ uri, handle, take = 20 }) => {
                const postId = uri.includes('/') ? uri.split('/').pop()! : uri;
                const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
                
                if (uri.startsWith('at://') || isGuid) {
                    return { url: '/posts/details', params: { uri, take } };
                } else if (handle && handle !== 'local') {
                    const fullUri = `at://${handle}/app.bsky.feed.post/${postId}`;
                    return { url: '/xrpc/app.bsky.feed.getPostThread', params: { uri: fullUri } };
                } else {
                    return { url: `/posts/tid/${postId}`, params: { take } };
                }
            },
            transformResponse: async (data: any) => {
                try {
                    let allPosts: Post[] = [];
                    let targetPost: Post | null = null;
    
                    if (data && data.thread) {
                        const postsMap = new Map<string, Post>();
                        // The direct post in the thread response IS the target post
                        if (data.thread.post) {
                            targetPost = mapAtProtoPostToPost(data.thread.post);
                        }
    
                        const extractPosts = (node: any) => {
                            if (!node) return;
                            if (node.post) {
                                const mapped = mapAtProtoPostToPost(node.post);
                                if (mapped.uri) postsMap.set(mapped.uri, mapped);
                            }
                            if (node.parent) extractPosts(node.parent);
                            if (node.replies && Array.isArray(node.replies)) {
                                node.replies.forEach((r: any) => extractPosts(r));
                            }
                        };
                        extractPosts(data.thread);
                        allPosts = Array.from(postsMap.values());
                    } else {
                        allPosts = Array.isArray(data) ? data.map((p: any) => mapAtProtoPostToPost(p)) : [mapAtProtoPostToPost(data)];
                        targetPost = allPosts[0] || null;
                    }
    
                    const hydrated = await hydratePostsWithInteractionStatus(allPosts);
                    
                    // Re-find targetPost in hydrated list to ensure it has interaction status
                    const hydratedTarget = targetPost && targetPost.uri 
                        ? (hydrated.find(p => p.uri === targetPost!.uri) || targetPost)
                        : targetPost;
    
                    return { targetPost: hydratedTarget, allPosts: hydrated };
                } catch (e) {
                    console.error('[postApi] Failed to transform post details:', e);
                    throw e; // Rerising ensures the query enters 'rejected' state instead of hanging
                }
            },
            providesTags: (result) =>
                result
                    ? [
                          ...result.allPosts.map(({ uri }) => ({ type: 'Post' as const, id: uri })),
                          { type: 'Post', id: 'DETAILS' },
                      ]
                    : [{ type: 'Post', id: 'DETAILS' }],
        }),
        toggleLike: builder.mutation<{ uri: string; isLiked: boolean; likeUri?: string }, { uri: string; cid: string; isLiked: boolean; likeUri?: string }>({
            query: ({ uri, isLiked, likeUri }) => {
                const postId = uri.includes('/') ? uri.split('/').pop()! : uri;
                const params: any = { isLiked };
                if (uri.startsWith('at://')) params.uri = uri;
                if (likeUri) params.likeUri = likeUri;
                return {
                    url: `/posts/${postId}/like`,
                    method: 'POST',
                    params,
                };
            },
            // We'll handle optimistic updates in the components or via onQueryStarted
            invalidatesTags: (result, error, { uri }) => [{ type: 'Post', id: uri }],
        }),
        getReplies: builder.query<{ posts: Post[]; hasMore: boolean }, { postId: string; skip?: number; take?: number }>({
            query: ({ postId, skip = 0, take = 20 }) => ({
                url: '/posts/replies',
                params: { uri: postId, skip, take },
            }),
            transformResponse: async (data: any) => {
                let posts: Post[] = Array.isArray(data) ? data : (data.posts || []);
                const hasMore: boolean = Array.isArray(data) ? posts.length >= 20 : (data.hasMore ?? false);
                posts = await hydratePostsWithInteractionStatus(posts);
                return { posts, hasMore };
            },
            providesTags: (result) =>
                result
                    ? [...result.posts.map(({ uri }) => ({ type: 'Post' as const, id: uri })), { type: 'Feed', id: 'REPLIES' }]
                    : [{ type: 'Feed', id: 'REPLIES' }],
        }),
        getTrending: builder.query<Post[], void>({
            query: () => '/posts/trending',
            transformResponse: async (rawPosts: Post[]) => {
                let posts = rawPosts.map((p: any) => mapAtProtoPostToPost(p));
                return await hydratePostsWithInteractionStatus(posts);
            },
            providesTags: (result) =>
                result
                    ? [...result.map(({ uri }) => ({ type: 'Post' as const, id: uri })), { type: 'Feed', id: 'TRENDING' }]
                    : [{ type: 'Feed', id: 'TRENDING' }],
        }),
        getBookmarks: builder.query<{ posts: Post[]; cursor: string | null }, { skip?: number; take?: number }>({
            query: ({ skip = 0, take = 20 }) => ({
                url: '/posts/bookmarks',
                params: { skip, take },
            }),
            transformResponse: async (data: any) => {
                let posts = data.posts.map((p: any) => mapAtProtoPostToPost(p));
                posts = await hydratePostsWithInteractionStatus(posts);
                return { posts, cursor: data.cursor || null };
            },
            providesTags: (result) =>
                result
                    ? [...result.posts.map(({ uri }) => ({ type: 'Post' as const, id: uri })), { type: 'Feed', id: 'BOOKMARKS' }]
                    : [{ type: 'Feed', id: 'BOOKMARKS' }],
        }),
        getDiscover: builder.query<{ posts: Post[]; hasMore: boolean }, { skip?: number; take?: number }>({
            query: ({ skip = 0, take = 20 }) => ({
                url: '/posts/discover',
                params: { skip, take },
            }),
            transformResponse: async (data: any) => {
                const rawPosts: any[] = Array.isArray(data) ? data : (data.posts || []);
                let posts = rawPosts.map((p: any) => mapAtProtoPostToPost(p));
                posts = await hydratePostsWithInteractionStatus(posts);
                const hasMore: boolean = Array.isArray(data) ? posts.length >= 20 : (data.hasMore ?? false);
                return { posts, hasMore };
            },
            providesTags: (result) =>
                result
                    ? [...result.posts.map(({ uri }) => ({ type: 'Post' as const, id: uri })), { type: 'Feed', id: 'DISCOVER' }]
                    : [{ type: 'Feed', id: 'DISCOVER' }],
        }),
        searchPosts: builder.query<{ posts: Post[]; cursor: string | null }, { query: string; skip?: number; take?: number }>({
            query: ({ query, skip = 0, take = 20 }) => ({
                url: '/search/posts',
                params: { q: query, skip, take },
            }),
            transformResponse: async (rawPosts: any[]) => {
                let posts = rawPosts.map((p: any) => mapAtProtoPostToPost(p));
                posts = await hydratePostsWithInteractionStatus(posts);
                return { posts, cursor: null };
            },
            providesTags: (result) =>
                result
                    ? [...result.posts.map(({ uri }) => ({ type: 'Post' as const, id: uri })), { type: 'Feed', id: 'SEARCH' }]
                    : [{ type: 'Feed', id: 'SEARCH' }],
        }),
        repost: builder.mutation<{ uri: string; isReposted: boolean; repostUri?: string }, { uri: string; cid: string; isReposted: boolean; repostUri?: string }>({
            query: ({ uri, isReposted, repostUri }) => {
                const postId = uri.includes('/') ? uri.split('/').pop()! : uri;
                const params: any = { isReposted };
                if (uri.startsWith('at://')) params.uri = uri;
                if (repostUri) params.repostUri = repostUri;
                return {
                    url: `/posts/${postId}/repost`,
                    method: 'POST',
                    params,
                };
            },
            invalidatesTags: (result, error, { uri }) => [{ type: 'Post', id: uri }],
        }),
        deletePost: builder.mutation<string, string>({
            query: (postUri) => {
                const postId = postUri.includes('/') ? postUri.split('/').pop()! : postUri;
                return {
                    url: `/posts/${postId}`,
                    method: 'DELETE',
                    params: { uri: postUri },
                };
            },
            invalidatesTags: (result, error, postUri) => [{ type: 'Post', id: postUri }, { type: 'Feed' }],
        }),
        createPost: builder.mutation<Post, FormData>({
            query: (formData) => ({
                url: '/posts',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: [{ type: 'Feed', id: 'TIMELINE' }],
        }),
    }),
});

export const {
    useGetTimelineQuery,
    useGetUserPostsQuery,
    useGetPostDetailsQuery,
    useToggleLikeMutation,
    useGetRepliesQuery,
    useGetTrendingQuery,
    useGetBookmarksQuery,
    useGetDiscoverQuery,
    useSearchPostsQuery,
    useRepostMutation,
    useDeletePostMutation,
    useCreatePostMutation,
} = postApi;
