import { Post } from '../types';

/**
 * Robustly checks if two post objects refer to the same post using multiple identification strategies.
 */
export const matchesPost = (
    a: Partial<Post> | null | undefined, 
    b: string | Partial<Post> | null | undefined
): boolean => {
    if (!a || !b) return false;

    const target: Partial<Post> = typeof b === 'string' ? { uri: b } : b;

    // 1. Direct URI match (Gold Standard)
    if (a.uri && target.uri && a.uri === target.uri) return true;

    // 2. Database ID match (Silver Standard)
    if (a.id && target.id && a.id === target.id) return true;

    // 3. ATProto CID match (Metadata Standard)
    if (a.cid && target.cid && a.cid === target.cid) return true;

    // 4. Bluesky TID match (Alternative ID)
    if (a.tid && target.tid && a.tid === target.tid) return true;

    // 5. Cross-reference URI with ID/TID (Common for mapped posts)
    if (a.uri && target.id && a.uri.endsWith(`/${target.id}`)) return true;
    if (target.uri && a.id && target.uri.endsWith(`/${a.id}`)) return true;
    if (a.uri && target.tid && a.uri.endsWith(`/${target.tid}`)) return true;
    if (target.uri && a.tid && target.uri.endsWith(`/${a.tid}`)) return true;

    return false;
};

/**
 * Returns a stable key for a post to be used in maps/dictionaries.
 */
export const getPostKey = (post: Partial<Post>): string => {
    return post.uri || post.id || post.tid || post.cid || `unk-${Math.random()}`;
};
