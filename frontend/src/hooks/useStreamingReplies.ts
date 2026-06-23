import React from 'react';
import { Post } from '../types';

type StreamStatus = 'idle' | 'loading' | 'streaming' | 'done' | 'error';

interface UseStreamingRepliesResult {
    replies: Post[];
    status: StreamStatus;
    totalCount: number;
    restart: () => void;
}

/**
 * Streams post replies from the /api/posts/replies/stream SSE endpoint.
 * Replies are appended to local state as each SSE event arrives,
 * so the UI renders progressively without waiting for all replies.
 */
export function useStreamingReplies(postUri: string | undefined | null): UseStreamingRepliesResult {
    const [replies, setReplies] = React.useState<Post[]>([]);
    const [status, setStatus] = React.useState<StreamStatus>('idle');
    const [totalCount, setTotalCount] = React.useState(0);
    const [tick, setTick] = React.useState(0); // Used to restart the stream

    const restart = React.useCallback(() => {
        setReplies([]);
        setTotalCount(0);
        setStatus('idle');
        setTick(t => t + 1);
    }, []);

    React.useEffect(() => {
        if (!postUri) return;

        setReplies([]);
        setTotalCount(0);
        setStatus('loading');

        const encodedUri = encodeURIComponent(postUri);
        const url = `/api/posts/replies/stream?uri=${encodedUri}`;

        const eventSource = new EventSource(url, { withCredentials: true });

        eventSource.addEventListener('reply', (e: MessageEvent) => {
            try {
                const post = JSON.parse(e.data) as Post;
                setStatus('streaming');
                setReplies(prev => {
                    // Deduplicate by URI or id
                    const uid = post.uri || post.id;
                    if (uid && prev.some(p => (p.uri || p.id) === uid)) return prev;
                    return [...prev, post];
                });
            } catch {
                // ignore parse errors on individual events
            }
        });

        eventSource.addEventListener('meta', (e: MessageEvent) => {
            try {
                const meta = JSON.parse(e.data) as { totalCount: number };
                setTotalCount(meta.totalCount);
            } catch { /* ignore */ }
        });

        eventSource.addEventListener('done', () => {
            setStatus('done');
            eventSource.close();
        });

        eventSource.addEventListener('error', () => {
            // Don't mark as error if we already streamed some replies
            setStatus(prev => (prev === 'streaming' ? 'done' : 'error'));
            eventSource.close();
        });

        return () => {
            eventSource.close();
        };
    }, [postUri, tick]);

    return { replies, status, totalCount, restart };
}
