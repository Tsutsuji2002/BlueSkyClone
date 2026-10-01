import { useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../constants';

export type FeedEvent =
    | 'interactionSeen'
    | 'interactionLike'
    | 'interactionRepost'
    | 'interactionReply'
    | 'interactionQuote'
    | 'interactionShare'
    | 'clickthroughItem'
    | 'clickthroughAuthor'
    | 'clickthroughReposter'
    | 'clickthroughEmbed'
    | 'requestLess'
    | 'requestMore';

interface InteractionSignal {
    item: string;        // AT-URI of the post
    event: FeedEvent;
    feedContext?: string; // Opaque string from getFeedSkeleton — omit if unavailable
}

const BATCH_MIN_FLUSH_MS = 5000;  // Flush every 5s of inactivity
const BATCH_SIZE_LIMIT = 10;      // Or immediately when we hit 10 items

/**
 * Batches and sends app.bsky.feed.sendInteractions signals to the backend,
 * which proxies them to the user's PDS — matching the official Bluesky client behaviour.
 *
 * Usage:
 *   const { reportSeen, reportEvent } = useSendInteractions();
 *   // In PostCard, when post enters viewport: reportSeen(post.uri);
 *   // On like action: reportEvent(post.uri, 'interactionLike');
 */
export function useSendInteractions() {
    const bufferRef = useRef<InteractionSignal[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Deduplicate seen events within a session
    const seenUrisRef = useRef<Set<string>>(new Set());

    const flush = useCallback(async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        const batch = bufferRef.current.splice(0);
        if (batch.length === 0) return;

        try {
            await fetch(`${API_BASE_URL}/posts/interactions/send`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interactions: batch }),
            });
        } catch {
            // Best-effort only — swallow all errors silently
        }
    }, []);

    const scheduleFlush = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(flush, BATCH_MIN_FLUSH_MS);
    }, [flush]);

    const enqueue = useCallback((signal: InteractionSignal) => {
        bufferRef.current.push(signal);
        if (bufferRef.current.length >= BATCH_SIZE_LIMIT) {
            flush();
        } else {
            scheduleFlush();
        }
    }, [flush, scheduleFlush]);

    /**
     * Report that a post scrolled into view. Deduped per session.
     */
    const reportSeen = useCallback((uri: string, feedContext?: string) => {
        if (!uri || !uri.startsWith('at://')) return;
        if (seenUrisRef.current.has(uri)) return;
        seenUrisRef.current.add(uri);
        enqueue({ item: uri, event: 'interactionSeen', feedContext });
    }, [enqueue]);

    /**
     * Report an explicit interaction event (like, repost, reply, share, clickthrough, etc.).
     */
    const reportEvent = useCallback((uri: string, event: FeedEvent, feedContext?: string) => {
        if (!uri || !uri.startsWith('at://')) return;
        enqueue({ item: uri, event, feedContext });
    }, [enqueue]);

    // Flush on unmount (e.g. navigating away from the feed)
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            // Fire-and-forget flush on unmount
            const remaining = bufferRef.current.splice(0);
            if (remaining.length > 0) {
                fetch(`${API_BASE_URL}/posts/interactions/send`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ interactions: remaining }),
                }).catch(() => {});
            }
        };
    }, []);

    return { reportSeen, reportEvent };
}
