import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Feed from '../feed/Feed';
import { mapAtProtoPostToPost } from '../../utils/postMapper';
import { API_BASE_URL } from '../../constants';
import { agent } from '../../services/atpAgent';
import { Post } from '../../types';
import { hydratePostsWithInteractionStatus } from '../../utils/postHydrator';
import LoadingIndicator from '../common/LoadingIndicator';
import { FiList, FiImage, FiVideo } from 'react-icons/fi';
import MediaGrid from './MediaGrid';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { seedInteractionTruth } from '../../redux/slices/postsSlice';
import { getDynamicBatchSize } from '../../utils/pagination';
import { matchesPost } from '../../utils/postUtils';
import { Link } from 'react-router-dom';
import ListAvatar from '../common/ListAvatar';

interface ProfileTabContentProps {
    userId: string;
    type: string;
    isOwnProfile?: boolean;
    isActive?: boolean;
}

const ProfileTabContent: React.FC<ProfileTabContentProps> = ({ userId, type, isOwnProfile, isActive = true }) => {
    const [items, setItems] = useState<any[]>([]);
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const isFetchingRef = useRef(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const fetchBatch = useCallback(async (isInitial = false) => {
        if (!isInitial && (!hasMore || loading)) return;
        if (isFetchingRef.current) return;

        setLoading(true);
        isFetchingRef.current = true;
        if (isInitial) {
            setInitialLoading(true);
            setItems([]);
        }

        try {
            const token = localStorage.getItem('token');
            const headers: Record<string, string> = {};
            if (token && token !== 'null') headers['Authorization'] = `Bearer ${token}`;

            let fetchedItems: any[] = [];
            let nextCursor: string | null = null;

            if (type === 'posts' || type === 'replies' || type === 'media' || type === 'video' || type === 'likes') {
                const itemHeight = (type === 'media' || type === 'video') ? 150 : 250;
                const dynamicTake = getDynamicBatchSize(itemHeight);
                const params = new URLSearchParams({
                    take: dynamicTake.toString(),
                    type: type,
                });
                if (!isInitial && cursor) params.set('cursor', cursor);

                const response = await fetch(`${API_BASE_URL}/posts/user/${userId}?${params}`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    fetchedItems = Array.isArray(data) ? data : (data.posts || []);
                    if (type === 'video') {
                        fetchedItems = fetchedItems.filter((p: Post) => 
                            !!p.videoUrl || !!p.video || (p.media && p.media.some(m => m.type === 'video'))
                        );
                    }
                    nextCursor = data.cursor || null;
                }
            } else if (type === 'lists') {
                // Use XRPD getLists which we know works and proxies to Bluesky
                const response = await fetch(`/xrpc/app.bsky.graph.getLists?actor=${encodeURIComponent(userId)}&limit=50`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    fetchedItems = data.lists || [];
                    nextCursor = data.cursor || null;
                }
            }

            if (type === 'likes') {
                fetchedItems.forEach(p => { p.isLiked = true; });
            }

            // Seed interactionTruth in Redux so PostCard reads the correct
            // isLiked / isReposted / isBookmarked from the backend-enriched data,
            // overwriting any stale entries from earlier timeline loads.
            if (type !== 'lists' && fetchedItems.length > 0) {
                dispatch(seedInteractionTruth(fetchedItems));
            }

            setItems(prev => isInitial ? fetchedItems : [...prev, ...fetchedItems]);
            setCursor(nextCursor);
            setHasMore(!!nextCursor && fetchedItems.length > 0);
        } catch (err) {
            console.error(`Failed to fetch profile ${type}:`, err);
            setHasMore(false);
        } finally {
            setLoading(false);
            setInitialLoading(false);
            isFetchingRef.current = false;
        }
    }, [userId, type, cursor, hasMore, loading, t, dispatch]);

    const prevUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Only clear and re-fetch if the userId has TRULY changed.
        if (prevUserIdRef.current && prevUserIdRef.current !== userId) {
            if (items.length > 0 && (userId.startsWith('did:') || prevUserIdRef.current.startsWith('did:'))) {
                 // Potentially the same user.
            } else {
                setItems([]);
                setInitialLoading(true);
            }
        }
        
        fetchBatch(true);
        prevUserIdRef.current = userId;
    }, [userId, type]);

    // Infinite scroll
    useEffect(() => {
        if (!hasMore || loading || !isActive) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                fetchBatch(false);
            }
        }, { rootMargin: '400px' });

        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [type, hasMore, loading, isActive, fetchBatch]);

    // Sync local items with interactionTruth from Redux
    const interactionTruth = useAppSelector((state: RootState) => state.posts.interactionTruth);
    useEffect(() => {
        if (items.length === 0 || Object.keys(interactionTruth).length === 0) return;

        let changed = false;
        const newItems = items.map(item => {
            // Only sync Post items
            if (!item.author || !item.content) return item;
            
            const truth = Object.values(interactionTruth).find(t => matchesPost(item, t));
            if (truth) {
                // Check if truly changed to avoid infinite cycles
                if (item.isLiked !== truth.isLiked || 
                    item.isReposted !== truth.isReposted || 
                    item.isBookmarked !== truth.isBookmarked ||
                    item.likesCount !== truth.likesCount ||
                    item.repostsCount !== truth.repostsCount) {
                    changed = true;
                    return {
                        ...item,
                        isLiked: truth.isLiked,
                        isReposted: truth.isReposted,
                        isBookmarked: truth.isBookmarked,
                        likesCount: truth.likesCount,
                        repostsCount: truth.repostsCount,
                        viewer: truth.viewer || item.viewer
                    };
                }
            }
            return item;
        });

        if (changed) {
            setItems(newItems);
        }
    }, [interactionTruth, items]);

    if (type === 'lists' && initialLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <LoadingIndicator size="md" />
            </div>
        );
    }

    if (type === 'lists' && items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <FiList size={80} className="text-gray-300 dark:text-dark-border mb-4" strokeWidth={1.2} />
                <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary">
                    {t('profile.no_lists', 'No lists found')}
                </h3>
            </div>
        );
    }

    if (type === 'lists') {
        return (
            <div className="divide-y divide-gray-200 dark:divide-dark-border">
                {items.map(list => {
                    const rkey = list.uri?.split('/').pop();
                    const creatorHandle = list.creator?.handle || userId;
                    return (
                        <Link
                            key={list.uri}
                            to={`/profile/${creatorHandle}/lists/${rkey}`}
                            className="block p-4 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                        >
                            <div className="flex flex-row items-start gap-3">
                                <div className="shrink-0" style={{ width: '40px', height: '40px' }}>
                                    <ListAvatar src={list.avatar} alt={list.name} size="lg" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    <h3 className="font-bold truncate text-[15px] text-gray-900 dark:text-white leading-[20px]">
                                        {list.name}
                                    </h3>
                                    <div className="truncate text-[13.1px] text-gray-500 dark:text-gray-400 leading-[17px]">
                                        {t('lists.list_by', { handle: creatorHandle })}
                                    </div>
                                    {list.description && (
                                        <div className="mt-1 line-clamp-2 text-[15px] text-gray-900 dark:text-gray-200 leading-[20px]">
                                            {list.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        );
    }

    if (type === 'media' && items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center pt-20 pb-12 px-6 text-center">
                <FiImage size={80} className="text-gray-300 dark:text-dark-border" strokeWidth={1.2} />
                <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary mt-4">
                    {t('profile.no_media')}
                </h3>
            </div>
        );
    }

    if (type === 'video' && items.length === 0) {
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
                <MediaGrid posts={items} />
                
                {/* Sentinel */}
                <div ref={sentinelRef} className="h-20 flex items-center justify-center">
                    {loading && <LoadingIndicator size="sm" />}
                    {!hasMore && items.length > 0 && (
                         <div className="text-gray-400 text-sm font-medium">{t('feeds.end')}</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <Feed
            posts={items}
            isLoading={loading}
            hasMore={hasMore}
            onLoadMore={() => fetchBatch(false)}
            emptyMessage={t(`profile.no_${type}`)}
            isActive={isActive}
        />
    );
};

export default ProfileTabContent;
