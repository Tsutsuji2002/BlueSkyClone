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
        
        // Extract rkey from URI as a common fallback for TID matching
        const parts = status.uri.split('/');
        const rkey = parts[parts.length - 1];
        if (rkey) byTid.set(normalizeUri(rkey), status);
    });

    const patchPost = (post?: Post | null): Post | undefined => {
        if (!post) return undefined;

        const uriKey = normalizeUri(post.uri);
        const rkey = post.uri?.split('/').pop();
        const tidKey = normalizeUri(post.tid || rkey);
        
        // Try matching by full URI first, then by TID/rkey
        const status = (uriKey ? byUri.get(uriKey) : undefined) || 
                       (tidKey ? byTid.get(tidKey) : undefined);

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

    const collectUris = (post?: Post | null, set: Set<string> = new Set()): Set<string> => {
        if (!post || !post.uri) return set;
        set.add(post.uri);
        collectUris(post.parentPost, set);
        collectUris(post.quotePost, set);
        return set;
    };

    const uriSet = new Set<string>();
    posts.forEach(post => collectUris(post, uriSet));
    const uris = Array.from(uriSet);

    if (uris.length === 0) return posts;

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
