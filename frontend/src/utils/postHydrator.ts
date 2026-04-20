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
            // Prefer-true: local DB confirmation (true) wins, but local DB absence (false) never
            // downgrades a value that the backend already confirmed. This handles the case where a
            // native Bluesky like/repost isn't in the local Likes/Reposts table yet but the backend
            // already set isLiked:true via the AppView viewer state.
            isLiked: status ? (status.isLiked || post.isLiked) : post.isLiked,
            isReposted: status ? (status.isReposted || post.isReposted) : post.isReposted,
            isBookmarked: status ? (status.isBookmarked || post.isBookmarked) : post.isBookmarked,
            viewer: status ? {
                ...(post.viewer || {}),
                like: status.likeUri ?? post.viewer?.like,
                repost: status.repostUri ?? post.viewer?.repost,
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

    // Run local-DB status and remote AppView viewer-state in parallel
    const [localStatuses, viewerStatuses] = await Promise.all([
        // (1) Local DB: authoritative for interactions done through this app
        (async (): Promise<InteractionStatus[]> => {
            try {
                const response = await fetch(`${API_BASE_URL}/posts/interactions/status`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ uris })
                });
                if (!response.ok) return [];
                return await response.json() as InteractionStatus[];
            } catch {
                return [];
            }
        })(),
        // (2) Bluesky AppView: authoritative for native Bluesky likes/reposts
        (async (): Promise<InteractionStatus[]> => {
            const remoteUris = uris.filter(u => u.startsWith('at://') && !u.includes('local'));
            if (!remoteUris.length) return [];
            try {
                const response = await fetch(`${API_BASE_URL}/posts/interactions/viewer-state`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ uris: remoteUris })
                });
                if (!response.ok) return [];
                return await response.json() as InteractionStatus[];
            } catch {
                return [];
            }
        })(),
    ]);

    // Merge both sources with prefer-true: if either source says liked/reposted, it wins
    const merged = new Map<string, InteractionStatus>();
    const add = (s: InteractionStatus) => {
        const key = normalizeUri(s.uri);
        if (!key) return;
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, { ...s });
        } else {
            if (s.isLiked) existing.isLiked = true;
            if (s.isReposted) existing.isReposted = true;
            if (s.isBookmarked) existing.isBookmarked = true;
            if (s.likeUri) existing.likeUri = s.likeUri;
            if (s.repostUri) existing.repostUri = s.repostUri;
        }
    };
    localStatuses.forEach(add);
    viewerStatuses.forEach(add);

    return applyInteractionStatuses(posts, Array.from(merged.values()));
};
