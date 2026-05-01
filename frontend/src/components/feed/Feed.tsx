import React, { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import PostCard from './PostCard';
import { Post } from '../../types';
import { PostFeedSkeleton } from './PostSkeleton';
import { FiBookmark } from 'react-icons/fi';
import { detectLanguage } from '../../utils/languageDetector';
import ScrollToTopButton from '../common/ScrollToTopButton';

import postSignalrService from '../../services/postSignalrService';
import { Virtuoso } from 'react-virtuoso';

interface FeedProps {
    posts?: Post[]; // Optional prop to override Redux posts
    isLoading?: boolean; // NEW: explicit loading state
    onLoadMore?: () => void; // Optional infinite scroll trigger
    hasMore?: boolean; // Whether more posts can be loaded
    endMessage?: string; // NEW: custom end of feed message
    emptyMessage?: string; // NEW: custom message when there are 0 posts
    isActive?: boolean; // Track if this feed is currently visible
}

const Feed: React.FC<FeedProps> = ({
    posts: propPosts,
    isLoading: propLoading,
    onLoadMore,
    hasMore = true,
    endMessage,
    emptyMessage,
    isActive = true
}) => {
    const { t } = useTranslation();
    const reduxPosts = useAppSelector((state) => state.posts.posts);
    const reduxLoading = useAppSelector((state) => state.posts.isLoading);
    const contentLanguages = useAppSelector((state) => state.language.contentLanguages);
    
    // SSE Queuing
    const [localPosts, setLocalPosts] = React.useState<Post[]>([]);
    const pendingRef = useRef<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const isFetchingRef = useRef(false);

    const isLoading = propLoading !== undefined ? propLoading : reduxLoading;

    // Initial load/Sync from props
    const allPosts = propPosts !== undefined ? propPosts : reduxPosts;
    
    // Content filter logic
    const filteredPosts = useMemo(() => {
        const basePosts = allPosts.filter(post => !post.isDeleted);
        if (!contentLanguages || contentLanguages.length === 0) return basePosts;
        const matchingPosts: Post[] = [];
        const otherPosts: Post[] = [];
        basePosts.forEach(post => {
            const lang = post.language || detectLanguage(post.content);
            if (contentLanguages.includes(lang)) matchingPosts.push(post);
            else otherPosts.push(post);
        });
        return matchingPosts.length === 0 ? otherPosts : [...matchingPosts, ...otherPosts];
    }, [allPosts, contentLanguages]);

    // Force localPosts to sync if it's the first time or if length changes significantly (re-fetch)
    useEffect(() => {
        setLocalPosts(filteredPosts);
    }, [filteredPosts]);

    // SSE Listener
    useEffect(() => {
        const unsubscribe = postSignalrService.onEvent((type, data) => {
            if (!isActive) {
                pendingRef.current.push({ type, data });
            } else {
                applyEvent(type, data);
            }
        });
        return () => {
            unsubscribe();
        };
    }, [isActive]);

    // Flush pending
    useEffect(() => {
        if (isActive && pendingRef.current.length > 0) {
            pendingRef.current.forEach(evt => applyEvent(evt.type, evt.data));
            pendingRef.current = [];
        }
    }, [isActive]);

    const applyEvent = (type: string, data: any) => {
        setLocalPosts(prev => {
            switch (type) {
                case 'created':
                    if (prev.find(p => p.uri === data.uri)) return prev;
                    return [data, ...prev];
                case 'status':
                case 'stats':
                    return prev.map(p => (p.uri === data.uri || p.id === data.uri) ? { ...p, ...data } : p);
                case 'deleted':
                    return prev.filter(p => p.id !== data && p.uri !== data);
                default:
                    return prev;
            }
        });
    };

    // Viewport-Fill Loop & Observers
    useEffect(() => {
        if (!onLoadMore || !hasMore || isLoading || isFetchingRef.current) return;

        const checkSentinel = () => {
            if (!sentinelRef.current || isFetchingRef.current || !hasMore || isLoading) return;
            const rect = sentinelRef.current.getBoundingClientRect();
            if (rect.top <= window.innerHeight + 100) {
                isFetchingRef.current = true;
                onLoadMore();
            }
        };

        // 1. ResizeObserver for feed container
        const resizeObserver = new ResizeObserver(() => checkSentinel());
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        // 2. IntersectionObserver for sentinel
        const intersectionObserver = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) checkSentinel();
        }, { rootMargin: '200px' });
        if (sentinelRef.current) intersectionObserver.observe(sentinelRef.current);

        // Initial check
        checkSentinel();

        return () => {
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
        };
    }, [onLoadMore, hasMore, isLoading, localPosts.length]);

    // Reset fetching ref when loading stops
    useEffect(() => {
        if (!isLoading) isFetchingRef.current = false;
    }, [isLoading]);

    if (isLoading && localPosts.length === 0) {
        return <PostFeedSkeleton count={5} />;
    }

    if (localPosts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <FiBookmark size={48} className="text-gray-300 dark:text-dark-border mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-2">
                    {emptyMessage || t('feeds.no_posts')}
                </h3>
                {!emptyMessage && (
                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                        {t('feeds.no_posts_desc')}
                    </p>
                )}
            </div>
        );
    }

    return (
        <>
            <Virtuoso
                useWindowScroll
                data={localPosts}
                overscan={1000} // Preload items within 1000px of the viewport
                endReached={() => {
                    if (hasMore && !isLoading && !isFetchingRef.current && onLoadMore) {
                        isFetchingRef.current = true;
                        onLoadMore();
                    }
                }}
                itemContent={(index, post) => (
                    <div className="relative z-10 bg-white dark:bg-dark-bg">
                        {post.parentPost && (
                            <PostCard
                                post={post.parentPost}
                                hasBottomLine={true}
                                hideBorder={true}
                            />
                        )}
                        <PostCard
                            post={post}
                            hasTopLine={!!post.parentPost}
                        />
                    </div>
                )}
                components={{
                    Footer: () => (
                        <div className="h-20 flex items-center justify-center border-t border-gray-100 dark:border-dark-border/30">
                            {isLoading && (
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                            )}
                            {!isLoading && !hasMore && (
                                <div className="flex flex-col items-center gap-2 text-gray-400 dark:text-dark-text-secondary select-none px-6 text-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-dark-border/60"></div>
                                        <span className="text-sm font-medium">{endMessage || t('feeds.end', 'End of feed')}</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-dark-border/60"></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                }}
            />
            <ScrollToTopButton />
        </>
    );
};

export default Feed;
