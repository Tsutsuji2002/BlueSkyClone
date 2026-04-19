import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Feed from '../feed/Feed';
import { mapAtProtoPostToPost } from '../../utils/postMapper';
import { API_BASE_URL } from '../../constants';
import { agent } from '../../services/atpAgent';
import { Post } from '../../types';
import LoadingIndicator from '../common/LoadingIndicator';
import { FiList, FiImage, FiVideo } from 'react-icons/fi';
import MediaGrid from './MediaGrid';

interface ProfileTabContentProps {
    userId: string;
    type: string;
    isOwnProfile?: boolean;
    isActive?: boolean;
}

const ProfileTabContent: React.FC<ProfileTabContentProps> = ({ userId, type, isOwnProfile, isActive = true }) => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const { t } = useTranslation();
    const isFetchingRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const fetchBatch = useCallback(async (isInitial = false) => {
        if (!isInitial && (!hasMore || loading)) return;
        if (isFetchingRef.current) return;

        setLoading(true);
        isFetchingRef.current = true;
        if (isInitial) {
            setInitialLoading(true);
            setPosts([]);
        }

        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token && token !== 'null') headers['Authorization'] = `Bearer ${token}`;

            let fetchedPosts: Post[] = [];
            let nextCursor: string | null = null;

            if (type === 'posts' || type === 'replies') {
                // Use custom backend for standard tabs to ensure interaction status and consistency
                const params = new URLSearchParams({
                    take: '20',
                    type: type,
                });
                if (!isInitial && cursor) params.set('cursor', cursor);

                const response = await fetch(`${API_BASE_URL}/posts/user/${userId}?${params}`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    fetchedPosts = Array.isArray(data) ? data : (data.posts || []);
                    nextCursor = data.cursor || null;
                }
            } else if (type === 'likes') {
                const response = await agent.app.bsky.feed.getActorLikes({
                    actor: userId,
                    limit: 20,
                    cursor: isInitial ? undefined : cursor || undefined
                });

                if (response.success) {
                    const data = response.data as any;
                    fetchedPosts = (data.likes || []).map((item: any) => mapAtProtoPostToPost(item.post));
                    nextCursor = data.cursor || null;
                }
            } else if (type === 'lists') {
                // Placeholder for lists
                fetchedPosts = [];
                nextCursor = null;
            } else {
                // media, video
                const response = await agent.app.bsky.feed.getAuthorFeed({
                    actor: userId,
                    filter: type === 'video' ? 'posts_with_media' : 'posts_with_media', // getAuthorFeed filter
                    limit: 30,
                    cursor: isInitial ? undefined : cursor || undefined
                });

                if (response.success) {
                    const data = response.data as any;
                    // For direct AT Proto feed, we should map the full item to preserve reasons (reposts) if needed,
                    // but FeedViewPost mapping is tricky. For now, map the post and inject reason if present.
                    fetchedPosts = (data.feed || []).map((item: any) => {
                        const post = mapAtProtoPostToPost(item.post);
                        if (item.reason) {
                            // Inject reason into mapped post for postMapper to use next time or for UI
                            const reasonPost = { ...item.post, reason: item.reason };
                            return mapAtProtoPostToPost(reasonPost);
                        }
                        return post;
                    });
                    
                    if (type === 'video') {
                        fetchedPosts = fetchedPosts.filter((p: Post) => 
                            !!p.videoUrl || !!p.video || (p.media && p.media.some(m => m.type === 'video'))
                        );
                    }
                    nextCursor = data.cursor || null;
                }
            }

            setPosts(prev => isInitial ? fetchedPosts : [...prev, ...fetchedPosts]);
            setCursor(nextCursor);
            setHasMore(!!nextCursor && fetchedPosts.length > 0);
        } catch (err) {
            console.error(`Failed to fetch profile ${type}:`, err);
            setHasMore(false);
        } finally {
            setLoading(false);
            setInitialLoading(false);
            isFetchingRef.current = false;
        }
    }, [userId, type, cursor, hasMore, loading, t]);

    useEffect(() => {
        fetchBatch(true);
    }, [userId, type]);

    // Infinite scroll for MediaGrid
    useEffect(() => {
        if (type !== 'media' || !hasMore || loading || !isActive) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                fetchBatch(false);
            }
        }, { rootMargin: '400px' });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [type, hasMore, loading, isActive, fetchBatch]);

    if (type === 'lists') {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <FiList size={80} className="text-gray-300 dark:text-dark-border mb-4" strokeWidth={1.2} />
                <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary">
                    {t('profile.feeds_coming_soon', 'Coming soon')}
                </h3>
            </div>
        );
    }

    if (type === 'media' && !initialLoading && posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
                <FiImage size={80} className="text-gray-300 dark:text-dark-border" strokeWidth={1.2} />
                <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary mt-4">
                    {t('profile.no_media')}
                </h3>
            </div>
        );
    }

    if (type === 'video' && !initialLoading && posts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
                <FiVideo size={80} className="text-gray-300 dark:text-dark-border" strokeWidth={1.2} />
                <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary mt-4">
                    {t('profile.no_video')}
                </h3>
            </div>
        );
    }

    if (type === 'media') {
        return (
            <div className="min-h-screen">
                <MediaGrid posts={posts} />
                
                {/* Sentinel */}
                <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                    {loading && <LoadingIndicator size="sm" />}
                    {!hasMore && posts.length > 0 && (
                         <div className="text-gray-400 text-sm font-medium">{t('feeds.end')}</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Feed
            posts={posts}
            isLoading={loading}
            hasMore={hasMore}
            onLoadMore={() => fetchBatch(false)}
            emptyMessage={t(`profile.no_${type}`)}
            isActive={isActive}
        />
    );
};

export default ProfileTabContent;
