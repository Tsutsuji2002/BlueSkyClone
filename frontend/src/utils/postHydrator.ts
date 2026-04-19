import { Post } from '../types';
import { API_BASE_URL } from '../constants';

export type InteractionStatus = {
    uri: string;
    tid?: string | null;
    isLiked: boolean;
    isReposted: boolean;
    isBookmarked: boolean;
    likeUri?: string | null;
    repostUri?: string | null;
};

const normalizeUri = (value?: string | null): string => value?.trim().toLowerCase() ?? '';

export const applyInteractionStatuses = (posts: Post[], statuses: InteractionStatus[]): Post[] => {
    if (!posts.length || !statuses.length) return posts;

    const byUri = new Map<string, InteractionStatus>();
    const byTid = new Map<string, InteractionStatus>();

    statuses.forEach((status) => {
        const uriKey = normalizeUri(status.uri);
        if (uriKey) byUri.set(uriKey, status);
        const tidKey = normalizeUri(status.tid);
        if (tidKey) byTid.set(tidKey, status);
    });

    const patchPost = (post?: Post | null): Post | undefined => {
        if (!post) return undefined;

        const uriKey = normalizeUri(post.uri);
        const tidKey = normalizeUri(post.tid || post.uri?.split('/').pop());
        const status = (uriKey ? byUri.get(uriKey) : undefined) || (tidKey ? byTid.get(tidKey) : undefined);

        const patchedQuote = patchPost(post.quotePost);
        const patchedParent = patchPost(post.parentPost);

        if (!status && patchedQuote === post.quotePost && patchedParent === post.parentPost) {
            return post;
        }

        return {
            ...post,
            isLiked: status ? status.isLiked : post.isLiked,
            isReposted: status ? status.isReposted : post.isReposted,
            isBookmarked: status ? status.isBookmarked : post.isBookmarked,
            viewer: status ? {
                ...(post.viewer || {}),
                like: status.likeUri ?? undefined,
                repost: status.repostUri ?? undefined,
            } : post.viewer,
            quotePost: patchedQuote,
            parentPost: patchedParent,
        };
    };

    return posts.map((post) => patchPost(post) ?? post);
};

export const hydratePostsWithInteractionStatus = async (posts: Post[], token: string | null): Promise<Post[]> => {
    if (!token || !posts.length) return posts;

    const uris = posts
        .map((post) => post.uri)
        .filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);

    if (!uris.length) return posts;

    try {
        const response = await fetch(`${API_BASE_URL}/posts/interactions/status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ uris })
        });

        if (!response.ok) {
            return posts;
        }

        const statuses = await response.json() as InteractionStatus[];
        return applyInteractionStatuses(posts, statuses);
    } catch {
        return posts;
    }
};
