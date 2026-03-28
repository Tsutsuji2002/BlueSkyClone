/** Stable key for Bluesky-remote feeds (uri) vs local DB feeds (id). */
export type FeedKeyInput = { id: string; uri?: string | null };

export function feedActionKey(feed: FeedKeyInput): string {
    const u = feed.uri?.trim();
    if (u && (u.startsWith('at://') || u === 'following')) return u;
    return feed.id;
}

export function feedsMatchRouteKey(feed: FeedKeyInput, routeKey: string): boolean {
    if (!routeKey) return false;
    const k = routeKey.toLowerCase();
    return feed.id?.toLowerCase() === k || (!!feed.uri && feed.uri.toLowerCase() === k);
}
