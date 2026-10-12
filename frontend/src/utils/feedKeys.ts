/** Stable key for Bluesky-remote feeds (uri) vs local DB feeds (id). */
export type FeedKeyInput = { 
    id: string; 
    uri?: string | null;
    handle?: string | null;
    creator?: { handle?: string | null } | null;
};

const DISCOVER_URI_PREFIX = 'at://did:web:discover.bsky.app/app.bsky.feed.generator/';

export function feedActionKey(feed: FeedKeyInput): string {
    const uri = (feed.uri || '').trim();
    const lower = uri.toLowerCase();
    if (!uri || !lower) return feed.id;

    if (lower === 'following' || lower === 'discover') return lower;
    if (lower.startsWith(DISCOVER_URI_PREFIX)) return 'discover';
    if (uri.startsWith('at://')) return uri;

    return feed.id;
}

export function normalizeRouteFeedKey(routeKey: string): string {
    const key = (routeKey || '').trim().toLowerCase();
    if (!key) return '';
    if (key.startsWith(DISCOVER_URI_PREFIX)) return 'discover';
    return key;
}

export function feedsMatchRouteKey(feed: FeedKeyInput, routeKey: string): boolean {
    if (!routeKey) return false;
    const normalizedRoute = normalizeRouteFeedKey(routeKey);
    const actionKey = feedActionKey(feed).toLowerCase();
    if (actionKey === normalizedRoute) return true;
    
    // Support matching handle-based routeKey with DID-based feed Uri
    if (normalizedRoute.startsWith('at://') && actionKey.startsWith('at://')) {
        const routeParts = normalizedRoute.split('/');
        const feedParts = actionKey.split('/');
        if (routeParts.length >= 5 && feedParts.length >= 5) {
            const routeTid = routeParts[4];
            const feedTid = feedParts[4];
            const routeHost = routeParts[2];
            const feedHost = feedParts[2];
            
            if (routeTid === feedTid) {
                // If Tid matches, one is handle and one is DID, check if feed.handle matches routeHost
                if (feedHost.startsWith('did:') && !routeHost.startsWith('did:')) {
                    if (feed.handle?.toLowerCase() === routeHost || feed.creator?.handle?.toLowerCase() === routeHost) {
                        return true;
                    }
                }
            }
        }
    }

    return (feed.id || '').toLowerCase() === normalizedRoute || (!!feed.uri && feed.uri.toLowerCase() === normalizedRoute);
}

/**
 * Converts a feed URI or feed object to Bluesky's standard canonical web URL path:
 * - at://did:plc:xxx/app.bsky.feed.generator/yyy -> /profile/did:plc:xxx/feed/yyy
 * - For local DB feeds / special feeds: /feeds/<id>
 */
export function getFeedRoute(feedOrUri: FeedKeyInput | string): string {
    const rawUri = typeof feedOrUri === 'string' ? feedOrUri : (feedOrUri.uri || feedOrUri.id || '');
    if (!rawUri) return '/feeds';

    let trimmed = rawUri.trim();
    if (trimmed.startsWith('b64:')) {
        try {
            trimmed = atob(trimmed.slice(4));
        } catch {
            // ignore
        }
    }
    if (trimmed.includes('%')) {
        try {
            trimmed = decodeURIComponent(trimmed);
        } catch {
            // ignore
        }
    }

    const lower = trimmed.toLowerCase();
    if (lower === 'following' || lower === 'discover') {
        return `/feeds/${lower}`;
    }

    if (trimmed.startsWith('at://')) {
        const parts = trimmed.split('/');
        // parts: ['at:', '', 'did:plc:...', 'app.bsky.feed.generator', 'aaajezldzb7nw']
        if (parts.length >= 5 && parts[3] === 'app.bsky.feed.generator') {
            const creator = parts[2];
            const rkey = parts[4];
            return `/profile/${creator}/feed/${rkey}`;
        }
    }

    const actionKey = typeof feedOrUri === 'object' ? feedActionKey(feedOrUri) : trimmed;
    if (actionKey.startsWith('at://')) {
        const parts = actionKey.split('/');
        if (parts.length >= 5 && parts[3] === 'app.bsky.feed.generator') {
            return `/profile/${parts[2]}/feed/${parts[4]}`;
        }
    }

    return `/feeds/${encodeURIComponent(actionKey)}`;
}

