import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Feed from '../feed/Feed';
import { mapAtProtoPostToPost } from '../../utils/postMapper';
import { API_BASE_URL } from '../../constants';
import { agent } from '../../services/atpAgent';
import { Post } from '../../types';
import { hydrateInteractionsAsync, seedInteractionTruth, fetchUserPostsStreaming } from '../../redux/slices/postsSlice';
import LoadingIndicator from '../common/LoadingIndicator';
import { FiList, FiImage, FiVideo, FiRss, FiPlus } from 'react-icons/fi';
import MediaGrid from './MediaGrid';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
// Removed redundant seedInteractionTruth import as it is now combined above
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
    const fetchVersionRef = useRef(0);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const deletedPostsRef = useRef<Set<string>>(new Set());

    // Feeds and Lists from Redux
    const userFeeds = useAppSelector((state: RootState) => state.feeds.userFeeds);
    const userLists = useAppSelector((state: RootState) => state.lists.userLists);
    const isUserFeedsLoading = useAppSelector((state: RootState) => state.feeds.userFeedsLoading);
    const isListsLoading = useAppSelector((state: RootState) => state.lists.isLoading);

    const fetchBatch = useCallback(async (isInitial = false) => {
        if (!isInitial && (!hasMore || loading)) return;
        
        // Skip internal fetch if using Redux-managed lists/feeds
        if (type === 'feeds' || type === 'lists') {
            setInitialLoading(false);
            setLoading(false);
            return;
        }

        const currentVersion = ++fetchVersionRef.current;
        setLoading(true);
        if (isInitial) {
            setInitialLoading(true);
            setItems([]);
        }

        if (type === 'posts' || type === 'replies' || type === 'media' || type === 'video' || type === 'likes') {
            const itemHeight = (type === 'media' || type === 'video') ? 150 : 250;
            const requestedTake = (type === 'posts' || type === 'replies') ? 30 : getDynamicBatchSize(itemHeight);
            let receivedCount = 0;

            await dispatch(fetchUserPostsStreaming(
                { userId, type, limit: requestedTake, cursor: isInitial ? null : cursor },
                (post) => {
                    if (currentVersion !== fetchVersionRef.current) return;

                    if (type === 'video') {
                        const isVideo = !!post.videoUrl || !!post.video || (post.media && post.media.some((m: any) => m.type === 'video'));
                        if (!isVideo) return;
                    }
                    if (type === 'likes') post.isLiked = true;

                    receivedCount++;
                    setItems(prev => {
                        if (prev.some(p => matchesPost(p, post))) return prev;
                        return [...prev, post];
                    });
                },
                (finalCursor) => {
                    if (currentVersion !== fetchVersionRef.current) return;
                    setCursor(finalCursor);
                    // hasMore = true if we got a cursor OR received a full page
                    setHasMore(!!finalCursor || receivedCount >= requestedTake);
                    setLoading(false);
                    setInitialLoading(false);
                },
                (err) => {
                    console.error(`Streaming fetch failed for ${type}:`, err);
                    if (currentVersion !== fetchVersionRef.current) return;
                    setHasMore(false);
                    setLoading(false);
                    setInitialLoading(false);
                }
            ) as any);
            return;
        }

        try {
            // placeholder for future non-streaming tabs
        } catch (err) {
            console.error(`Failed to fetch profile ${type}:`, err);
            if (currentVersion === fetchVersionRef.current) setHasMore(false);
        } finally {
            if (currentVersion === fetchVersionRef.current && (type === 'feeds' || type === 'lists')) {
                setLoading(false);
                setInitialLoading(false);
            }
        }
    }, [userId, type, cursor, hasMore, loading, t, dispatch]);

    const prevUserIdRef = useRef<string | null>(null);

    useEffect(() => {
        // Only clear and re-fetch if the userId has TRULY changed.
        if (prevUserIdRef.current && prevUserIdRef.current !== userId) {
            setItems([]);
            setInitialLoading(true);
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
                    item.repostsCount !== truth.repostsCount ||
                    item.replyRestriction !== truth.replyRestriction ||
                    item.allowQuotes !== truth.allowQuotes) {
                    changed = true;
                    return {
                        ...item,
                        isLiked: truth.isLiked,
                        isReposted: truth.isReposted,
                        isBookmarked: truth.isBookmarked,
                        likesCount: truth.likesCount,
                        repostsCount: truth.repostsCount,
                        replyRestriction: truth.replyRestriction,
                        allowQuotes: truth.allowQuotes,
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
    
    // Listen for post deletions via custom event
    useEffect(() => {
        const handlePostDeleted = (e: CustomEvent) => {
            const deletedUri = e.detail.uri;
            deletedPostsRef.current.add(deletedUri);
            
            // Remove from local items
            setItems(prev => prev.filter(item => {
                if (!item.uri) return true;
                const uri = item.uri.toLowerCase();
                const deletedLower = deletedUri.toLowerCase();
                return uri !== deletedLower && !uri.endsWith('/' + deletedLower.split('/').pop());
            }));
        };
        
        window.addEventListener('postDeleted' as any, handlePostDeleted);
        return () => window.removeEventListener('postDeleted' as any, handlePostDeleted);
    }, []);
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
                    const langs = item.langs || [];

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
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold truncate text-[15px] text-gray-900 dark:text-white leading-[20px]">
                                            {item.name || item.displayName}
                                        </h3>
                                        {langs.length > 0 && (
                                            <div className="flex items-center gap-1">
                                                {langs.map((lang: string) => (
                                                    <span key={lang} className="px-1 py-0.5 bg-gray-100 dark:bg-dark-surface rounded text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                                                        {lang}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
                                                "px-4 py-1.5 rounded-full text-[14px] font-bold transition-all flex items-center gap-1.5",
                                                isPinned 
                                                    ? "bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-white border border-gray-300 dark:border-dark-border hover:bg-gray-200"
                                                    : "bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
                                            )}
                                        >
                                            {isPinned ? null : <FiPlus size={14} strokeWidth={3} />}
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
