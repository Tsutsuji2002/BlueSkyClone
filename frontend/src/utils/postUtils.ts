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

    // 1. Direct URI match
    if (a.uri && target.uri && a.uri.toLowerCase() === target.uri.toLowerCase()) return true;

    // 2. Canonical DID-based match (Authoritative)
    const getCanonicalUri = (p: Partial<Post>) => {
        if (p.uri && p.uri.startsWith('at://did:')) return p.uri.toLowerCase();
        if (p.author?.did && p.tid) return `at://${p.author.did}/app.bsky.feed.post/${p.tid}`.toLowerCase();
        return null;
    };

    const canonicalA = getCanonicalUri(a);
    const canonicalB = getCanonicalUri(target);
    if (canonicalA && canonicalB && canonicalA === canonicalB) return true;

    // 3. Database ID match
    if (a.id && target.id && a.id === target.id) return true;

    // 4. Bluesky TID match (last segment of URI)
    if (a.tid && target.tid && a.tid.toLowerCase() === target.tid.toLowerCase()) return true;

    // 5. Cross-reference URI with TID (Common for handle vs DID vs local ID)
    const getTid = (p: Partial<Post>) => p.tid || p.id || p.uri?.split('/').pop();
    const tidA = getTid(a)?.toLowerCase();
    const tidB = getTid(target)?.toLowerCase();
    if (tidA && tidB && tidA === tidB) {
        // If TIDs match, we should stay cautious but if authors match too, it's definitely the same post
        if (a.author?.did && target.author?.did && a.author.did === target.author.did) return true;
        if (a.author?.handle && target.author?.handle && a.author.handle === target.author.handle) return true;
        // Fallback: If one has a URI and one has a TID, and the URI ends with that TID
        if (a.uri?.toLowerCase().endsWith(`/${tidB}`)) return true;
        if (target.uri?.toLowerCase().endsWith(`/${tidA}`)) return true;
    }

    return false;
};

/**
 * Returns a stable key for a post to be used in maps/dictionaries.
 */
export const getPostKey = (post: Partial<Post>): string => {
    return post.uri || post.id || post.tid || post.cid || `unk-${Math.random()}`;
};
