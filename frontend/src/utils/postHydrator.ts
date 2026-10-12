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

// In-memory cache for interaction statuses: URI -> { status: InteractionStatus, expiresAt: number }
const statusCache = new Map<string, { status: InteractionStatus; expiresAt: number }>();
// In-flight request deduplication map: URI -> Promise<InteractionStatus | null>
const inFlightRequests = new Map<string, Promise<InteractionStatus | null>>();

const CACHE_TTL_MS = 30000; // 30 seconds TTL

export const updateCachedInteractionStatus = (uri: string, patch: Partial<InteractionStatus>) => {
    const key = normalizeUri(uri);
    if (!key) return;
    const existing = statusCache.get(key);
    if (existing) {
        statusCache.set(key, {
            status: { ...existing.status, ...patch },
            expiresAt: Date.now() + CACHE_TTL_MS
        });
    }
};

export const clearInteractionStatusCache = () => {
    statusCache.clear();
    inFlightRequests.clear();
};

export const fetchInteractionStatuses = async (uris: string[]): Promise<InteractionStatus[]> => {
    if (uris.length === 0) return [];

    const normalizedUnique = Array.from(new Set(uris.map(normalizeUri).filter(Boolean)));
    if (normalizedUnique.length === 0) return [];

    const now = Date.now();
    const results: InteractionStatus[] = [];
    const missingUris: string[] = [];
    const waitingPromises: Promise<InteractionStatus | null>[] = [];

    // 1. Check cache and in-flight deduplication map
    for (const key of normalizedUnique) {
        const cached = statusCache.get(key);
        if (cached && cached.expiresAt > now) {
            results.push(cached.status);
            continue;
        }

        const inFlight = inFlightRequests.get(key);
        if (inFlight) {
            waitingPromises.push(inFlight);
            continue;
        }

        missingUris.push(key);
    }

    // Fast-path: if all requested URIs are freshly cached, return immediately with zero network requests
    if (missingUris.length === 0 && waitingPromises.length === 0) {
        return results;
    }

    // Await any in-flight requests that were already initiated by another caller
    if (waitingPromises.length > 0) {
        const awaited = await Promise.all(waitingPromises);
        for (const s of awaited) {
            if (s) results.push(s);
        }
    }

    // If no URIs left to fetch across the network, return
    if (missingUris.length === 0) {
        return results;
    }

    // 2. Set up deferred resolution for the batch to share with concurrent requests
    let resolveBatch: (res: Map<string, InteractionStatus>) => void;
    let rejectBatch: (err: any) => void;
    const batchPromise = new Promise<Map<string, InteractionStatus>>((resolve, reject) => {
        resolveBatch = resolve;
        rejectBatch = reject;
    });

    for (const key of missingUris) {
        inFlightRequests.set(key, batchPromise.then(map => map.get(key) || null).catch(() => null));
    }

    const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second hard cap

    try {
        const [localRes, viewerRes] = await Promise.allSettled([
            // (1) Local DB: authoritative for interactions done through this app
            (async (): Promise<InteractionStatus[]> => {
                try {
                    const response = await fetch(`${API_BASE_URL}/posts/interactions/status`, {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({ uris: missingUris }),
                        credentials: 'include',
                        signal: controller.signal
                    });
                    if (!response.ok) return [];
                    return await response.json() as InteractionStatus[];
                } catch (e) {
                    console.warn('[postHydrator] LocalDB status check failed or timed out:', e);
                    return [];
                }
            })(),
            // (2) Bluesky AppView: authoritative for native Bluesky likes/reposts
            (async (): Promise<InteractionStatus[]> => {
                const remoteUris = missingUris.filter(u => u.startsWith('at://') && !u.includes('local'));
                if (!remoteUris.length) return [];
                try {
                    const response = await fetch(`${API_BASE_URL}/posts/interactions/viewer-state`, {
                        method: 'POST',
                        headers: authHeaders,
                        body: JSON.stringify({ uris: remoteUris }),
                        credentials: 'include',
                        signal: controller.signal
                    });
                    if (!response.ok) return [];
                    return await response.json() as InteractionStatus[];
                } catch (e) {
                    console.warn('[postHydrator] AppView status check failed or timed out:', e);
                    return [];
                }
            })(),
        ]);

        const localStatuses = localRes.status === 'fulfilled' ? localRes.value : [];
        const viewerStatuses = viewerRes.status === 'fulfilled' ? viewerRes.value : [];
        
        // Merge both sources with prefer-true: if either source says liked/reposted, it wins
        const merged = new Map<string, InteractionStatus>();
        const addStatus = (s: InteractionStatus) => {
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
        localStatuses.forEach(addStatus);
        viewerStatuses.forEach(addStatus);

        // Populate cache with results
        const expiresAt = Date.now() + CACHE_TTL_MS;
        merged.forEach((status, key) => {
            statusCache.set(key, { status, expiresAt });
        });

        // Also ensure any missing URIs that returned no status are cached as false to prevent immediate re-querying
        for (let i = 0; i < missingUris.length; i++) {
            const key = missingUris[i];
            if (!merged.has(key)) {
                const emptyStatus: InteractionStatus = {
                    uri: key,
                    isLiked: false,
                    isReposted: false,
                    isBookmarked: false
                };
                merged.set(key, emptyStatus);
                statusCache.set(key, { status: emptyStatus, expiresAt });
            }
        }

        resolveBatch!(merged);
        const fetchedStatuses = Array.from(merged.values());
        results.push(...fetchedStatuses);
        return results;
    } catch (e) {
        console.error('[postHydrator] Error fetching interaction statuses:', e);
        rejectBatch!(e);
        return results;
    } finally {
        clearTimeout(timeoutId);
        for (const key of missingUris) {
            inFlightRequests.delete(key);
        }
    }
};

export const hydratePostsWithInteractionStatus = async (posts: Post[]): Promise<Post[]> => {
    if (!posts.length) return posts;

    const collectUris = (post?: Post | null, set: Set<string> = new Set(), seen: Set<string> = new Set()): Set<string> => {
        if (!post || !post.uri || seen.has(post.uri)) return set;
        seen.add(post.uri);
        set.add(post.uri);
        collectUris(post.parentPost, set, seen);
        collectUris(post.quotePost, set, seen);
        return set;
    };

    const uriSet = new Set<string>();
    posts.forEach(post => collectUris(post, uriSet));
    const uris = Array.from(uriSet);

    if (uris.length === 0) return posts;

    const statuses = await fetchInteractionStatuses(uris);
    return applyInteractionStatuses(posts, statuses);
};
