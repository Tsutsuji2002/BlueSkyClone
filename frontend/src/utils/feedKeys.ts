/** Stable key for Bluesky-remote feeds (uri) vs local DB feeds (id). */
export type FeedKeyInput = { id: string; uri?: string | null };

const DISCOVER_URI_PREFIX = 'at://did:web:discover.bsky.app/app.bsky.feed.generator/';

export function feedActionKey(feed: FeedKeyInput): string {
    const uri = feed.uri?.trim();
    const lower = uri?.toLowerCase();
    if (!uri || !lower) return feed.id;

    if (lower === 'following' || lower === 'discover') return lower;
    if (lower.startsWith(DISCOVER_URI_PREFIX)) return 'discover';
    if (uri.startsWith('at://')) return uri;

    return feed.id;
}

export function feedsMatchRouteKey(feed: FeedKeyInput, routeKey: string): boolean {
    if (!routeKey) return false;
    const k = routeKey.toLowerCase();
    return feed.id?.toLowerCase() === k || (!!feed.uri && feed.uri.toLowerCase() === k);
}

