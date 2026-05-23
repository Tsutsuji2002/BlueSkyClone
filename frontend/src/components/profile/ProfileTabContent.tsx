import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Feed from '../feed/Feed';
import { mapAtProtoPostToPost } from '../../utils/postMapper';
import { API_BASE_URL } from '../../constants';
import { agent } from '../../services/atpAgent';
import { Post } from '../../types';
import { hydratePostsWithInteractionStatus } from '../../utils/postHydrator';
import LoadingIndicator from '../common/LoadingIndicator';
import { FiList, FiImage, FiVideo, FiRss } from 'react-icons/fi';
import MediaGrid from './MediaGrid';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { seedInteractionTruth } from '../../redux/slices/postsSlice';
import { saveFeed, unsaveFeed, pinFeed, unpinFeed } from '../../redux/slices/feedsSlice';
import { getDynamicBatchSize } from '../../utils/pagination';
import { matchesPost } from '../../utils/postUtils';
import { Link } from 'react-router-dom';
import ListAvatar from '../common/ListAvatar';
import { cn } from '../../utils/classNames';

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

    // Feeds and Lists from Redux
    const userFeeds = useAppSelector((state: RootState) => state.feeds.userFeeds);
    const userLists = useAppSelector((state: RootState) => state.lists.userLists);
    const isUserFeedsLoading = useAppSelector((state: RootState) => state.feeds.userFeedsLoading);
    const isListsLoading = useAppSelector((state: RootState) => state.lists.isLoading);

    const fetchBatch = useCallback(async (isInitial = false) => {
        if (!isInitial && (!hasMore || loading)) return;
        if (isFetchingRef.current) return;

        // Skip internal fetch if using Redux-managed lists/feeds
        if (type === 'feeds' || type === 'lists') {
            setInitialLoading(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        isFetchingRef.current = true;
        if (isInitial) {
            setInitialLoading(true);
            setItems([]);
        }

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json'
            };

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
                if (isInitial) params.set('refresh', 'true');

                const response = await fetch(`${API_BASE_URL}/posts/user/${userId}?${params}`, { headers });
                if (response.ok) {
                    const data = await response.json();
                    fetchedItems = Array.isArray(data) ? data : (data.posts || []);
                    
                    if (fetchedItems.length > 0) {
                        fetchedItems = await hydratePostsWithInteractionStatus(fetchedItems);
                    }

                    if (type === 'video') {
                        fetchedItems = fetchedItems.filter((p: Post) => 
                            !!p.videoUrl || !!p.video || (p.media && p.media.some(m => m.type === 'video'))
                        );
                    }
                    nextCursor = data.cursor || null;
                }
            }

            if (type === 'likes') {
                fetchedItems.forEach(p => { p.isLiked = true; });
            }

            if (type !== 'lists' && type !== 'feeds' && fetchedItems.length > 0) {
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

    // Feeds Tab Selectors
    const subscribedFeeds = useAppSelector((state: RootState) => state.feeds.subscribedFeeds);
    const pinnedFeedIds = useAppSelector((state: RootState) => state.feeds.pinnedFeedIds);

    const handleFeedAction = async (e: React.MouseEvent, feed: any) => {
        e.preventDefault();
        e.stopPropagation();
        
        const feedId = feed.uri || feed.id;
        const isPinned = pinnedFeedIds.includes(feedId);
        const isSubscribed = subscribedFeeds.some(f => (f.uri || f.id) === feedId);

        if (isPinned) {
            await dispatch(unpinFeed(feedId));
        } else if (isSubscribed) {
            await dispatch(pinFeed(feedId));
        } else {
            await dispatch(saveFeed(feedId));
        }
    };

    const displayItems = type === 'feeds' ? userFeeds : type === 'lists' ? userLists : items;
    const isDisplayLoading = type === 'feeds' ? isUserFeedsLoading : type === 'lists' ? isListsLoading : initialLoading;

    if ((type === 'lists' || type === 'feeds') && isDisplayLoading && displayItems.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <LoadingIndicator size="md" />
            </div>
        );
    }

    if ((type === 'lists' || type === 'feeds') && displayItems.length === 0) {
        const Icon = type === 'lists' ? FiList : FiRss;
        return (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                <Icon size={80} className="text-gray-300 dark:text-dark-border mb-4" strokeWidth={1.2} />
                <h3 className="text-[17px] font-medium text-gray-500 dark:text-dark-text-secondary">
                    {t(`profile.no_${type}`, `No ${type} found`)}
                </h3>
            </div>
        );
    }

    if (type === 'lists' || type === 'feeds') {
        return (
            <div className="divide-y divide-gray-200 dark:divide-dark-border border-b border-gray-200 dark:border-dark-border">
                {displayItems.map(item => {
                    const rkey = item.uri?.split('/').pop();
                    const creatorHandle = item.creator?.handle || item.handle || userId;
                    const itemId = item.uri || item.id;
                    const isPinned = pinnedFeedIds.includes(itemId);
                    const isSubscribed = subscribedFeeds.some(f => (f.uri || f.id) === itemId);

                    // Determine button text with pin icon
                    let buttonText = '';
                    if (type === 'feeds') {
                        if (isPinned) {
                            buttonText = t('feeds.unpin_feed', 'Unpin feed');
                        } else {
                            buttonText = t('feeds.pin_feed', 'Pin feed');
                        }
                    } else {
                        // Lists: keep original behavior
                        if (isPinned) buttonText = t('feeds.unpin');
                        else if (isSubscribed) buttonText = t('feeds.pin');
                        else buttonText = t('feeds.subscribe');
                    }

                    const linkTo = type === 'lists' 
                        ? `/profile/${creatorHandle}/lists/${rkey}`
                        : `/profile/${creatorHandle}/feed/${rkey}`;

                    // Like count for feeds
                    const likeCount = item.likeCount || item.likesCount || item.followersCount || 0;

                    return (
                        <Link
                            key={item.uri || item.id}
                            to={linkTo}
                            className="block p-4 hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                        >
                            <div className="flex flex-row items-center gap-3">
                                <div className="shrink-0" style={{ width: '40px', height: '40px' }}>
                                    {type === 'lists' ? (
                                        <ListAvatar src={item.avatar} alt={item.name} size="lg" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-dark-surface">
                                            {(item.avatar || item.avatarUrl) ? (
                                                <img src={item.avatar || item.avatarUrl} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-primary-500">
                                                    <FiRss size={20} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                                    <h3 className="font-bold truncate text-[15px] text-gray-900 dark:text-white leading-[20px]">
                                        {item.name || item.displayName}
                                    </h3>
                                    <div className="truncate text-[13.1px] text-gray-500 dark:text-gray-400 leading-[17px]">
                                        {type === 'lists' 
                                            ? t('lists.list_by', { handle: creatorHandle })
                                            : t('feeds.feed_by', { handle: creatorHandle })}
                                    </div>
                                    {item.description && (
                                        <div className="mt-0.5 line-clamp-1 text-[14px] text-gray-600 dark:text-gray-300 leading-[18px]">
                                            {item.description}
                                        </div>
                                    )}
                                    {type === 'feeds' && likeCount > 0 && (
                                        <div className="mt-0.5 text-[13px] text-gray-400 dark:text-gray-500 leading-[17px]">
                                            {t('feeds.liked_by_users', { count: likeCount, defaultValue: `Liked by {{count}} users` })}
                                        </div>
                                    )}
                                </div>
                                {type === 'feeds' && (
                                    <div className="shrink-0 ml-2">
                                        <button
                                            onClick={(e) => handleFeedAction(e, item)}
                                            className={cn(
                                                "px-4 py-1.5 rounded-full text-[14px] font-bold transition-colors flex items-center gap-1.5",
                                                isPinned 
                                                    ? "bg-gray-200 dark:bg-dark-surface text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-dark-border"
                                                    : "bg-primary-500 text-white hover:bg-primary-600"
                                            )}
                                        >
                                            <span>📌</span>
                                            {buttonText}
                                        </button>
                                    </div>
                                )}
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
            feedId={`profile_${userId}_${type}`}
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
