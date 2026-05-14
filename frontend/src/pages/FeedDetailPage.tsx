import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Feed from '../components/feed/Feed';
import { FiArrowLeft, FiMoreHorizontal, FiBell, FiRss } from 'react-icons/fi';
import { BsHeart, BsHeartFill } from 'react-icons/bs';
import FeedAvatar from '../components/common/FeedAvatar';
import { cn } from '../utils/classNames';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchFeedPosts, fetchSubscribedFeeds, fetchFeedInfo, saveFeed, unsaveFeed, pinFeed, unpinFeed, hydrateInteractionStatusForFeed } from '../redux/slices/feedsSlice';
import { openAuthWall } from '../redux/slices/modalsSlice';
import { RootState } from '../redux/store';
import { Feed as FeedType } from '../types';
import { feedsMatchRouteKey, feedActionKey } from '../utils/feedKeys';

const FeedDetailPage: React.FC = () => {
    const { feedId, handle, tid } = useParams<{ feedId?: string; handle?: string; tid?: string }>();
    const id = feedId || (handle && tid ? `at://${handle}/app.bsky.feed.generator/${tid}` : '');
    const navigate = useNavigate();
    const navType = useNavigationType();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const isAuthenticated = useAppSelector((state: RootState) => state.auth.isAuthenticated);
    const { subscribedFeeds, feedPosts, isLoading, feedLoading, feedHasMore, feedCursors, recommendedFeeds, searchResults, feeds, actionLoading: feeds_actionLoading, infoLoading, infoError } = useAppSelector((state: RootState) => state.feeds);

    const take = 20;

    const routeKey = id || '';
    const feed = subscribedFeeds.find((f: FeedType) => feedsMatchRouteKey(f, routeKey)) ||
        recommendedFeeds.find((f: FeedType) => feedsMatchRouteKey(f, routeKey)) ||
        searchResults.find((f: FeedType) => feedsMatchRouteKey(f, routeKey)) ||
        feeds.find((f: FeedType) => feedsMatchRouteKey(f, routeKey));

    const count = feed ? (feed.subscribersCount || feed.followersCount || 0) : 0;
    const posts = routeKey ? feedPosts[routeKey] || [] : [];
    // Use per-feed loading for pagination (avoids re-mounting the Virtuoso list)
    const isFeedLoading = routeKey ? (feedLoading[routeKey] ?? isLoading) : isLoading;

    useDocumentTitle(feed?.name || t('feeds.title'));

    useEffect(() => {
        if (isAuthenticated && subscribedFeeds.length === 0) {
            dispatch(fetchSubscribedFeeds());
        }

        if (routeKey && !feed && infoLoading[routeKey] === undefined) {
            dispatch(fetchFeedInfo(routeKey));
        }
    }, [dispatch, subscribedFeeds.length, routeKey, feed, infoLoading]);

    useEffect(() => {
        if (routeKey) {
            dispatch(fetchFeedPosts({ feedId: routeKey, skip: 0, take }) as any)
                .then((result: any) => {
                    if (result?.payload?.posts?.length) {
                        dispatch(hydrateInteractionStatusForFeed({ feedId: result.payload.feedId, posts: result.payload.posts }) as any);
                    }
                });
        }
    }, [dispatch, routeKey]);

    const handleLoadMore = () => {
        if (routeKey) {
            const cursor = feedCursors[routeKey];
            dispatch(fetchFeedPosts({ feedId: routeKey, skip: posts.length, take, cursor }) as any)
                .then((result: any) => {
                    if (result?.payload?.posts?.length) {
                        dispatch(hydrateInteractionStatusForFeed({ feedId: result.payload.feedId, posts: result.payload.posts }) as any);
                    }
                });
        }
    };

    // Scroll Persistence Logic
    useEffect(() => {
        if (!id || navType !== 'POP') return;

        const scrollKey = `feed_detail_scroll_${id}`;
        
        // Restoration
        const savedScroll = sessionStorage.getItem(scrollKey);
        if (savedScroll && posts.length > 0) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScroll, 10));
            }, 0);
        }

        // Saving
        const handleScroll = () => {
            sessionStorage.setItem(scrollKey, window.scrollY.toString());
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [id, isLoading, posts.length]);

    const [showInfoModal, setShowInfoModal] = useState(false);

    if (!feed && routeKey && infoLoading[routeKey] === false && infoError[routeKey]) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('feeds.not_found')}
                </h2>
                <p className="text-sm text-gray-500 mb-4">{infoError[routeKey]}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="text-primary-500 hover:underline"
                >
                    {t('common.go_back')}
                </button>
            </div>
        );
    }

    if (!feed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-dark-bg p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500 mb-4"></div>
                <p className="text-gray-500 text-sm">Loading feed information...</p>
                <button 
                   onClick={() => routeKey && dispatch(fetchFeedInfo(routeKey))}
                   className="mt-4 text-xs text-primary-500 opacity-50 hover:opacity-100"
                >
                    Retry loading
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg">
            {/* Sticky Header */}
            <div className="sticky top-0 z-30 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors flex-shrink-0"
                        >
                            <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                        </button>
                        <div className="flex items-center gap-2 min-w-0">
                            <FeedAvatar
                                src={feed.avatarUrl || feed.avatar}
                                alt={feed.name}
                                size="sm"
                                className="rounded-md"
                            />
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-[17px] font-black text-gray-900 dark:text-dark-text truncate leading-tight">
                                    {feed.name}
                                </h1>
                                <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary truncate">
                                    @{feed.handle}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        {/* "..." opens info modal */}
                        <button
                            className="p-2.5 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                            onClick={() => setShowInfoModal(true)}
                        >
                            <FiMoreHorizontal size={20} className="text-gray-700 dark:text-dark-text" />
                        </button>
                        {/* Bell / pin toggle */}
                        <button
                            type="button"
                            onClick={async () => {
                                if (!isAuthenticated) {
                                    dispatch(openAuthWall());
                                    return;
                                }
                                const fk = feedActionKey(feed);
                                if (feed.isPinned) await dispatch(unpinFeed(fk));
                                else await dispatch(pinFeed(fk));
                            }}
                            disabled={feeds_actionLoading[feedActionKey(feed)]}
                            className={cn(
                                "p-2.5 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors disabled:opacity-50",
                                feed.isPinned ? "text-primary-500" : "text-gray-700 dark:text-dark-text"
                            )}>
                            <FiBell size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Feed Info Modal (opened by "...") */}
            {showInfoModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={() => setShowInfoModal(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

                    {/* Modal card */}
                    <div
                        className="relative z-10 w-[340px] max-w-[90vw] bg-white dark:bg-dark-surface rounded-2xl shadow-2xl p-5 mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Feed header */}
                        <div className="flex gap-3 mb-3">
                            <FeedAvatar
                                src={feed.avatarUrl || feed.avatar}
                                alt={feed.name}
                                size="lg"
                                className="rounded-xl flex-shrink-0"
                            />
                            <div className="flex flex-col flex-1 min-w-0 justify-center">
                                <span className="font-black text-gray-900 dark:text-dark-text text-[17px] leading-tight">
                                    {feed.name}
                                </span>
                                <button
                                    onClick={() => { setShowInfoModal(false); navigate(`/profile/${feed.handle}`); }}
                                    className="text-gray-500 dark:text-dark-text-secondary text-[14px] hover:underline text-left"
                                >
                                    By @{feed.handle}
                                </button>
                            </div>
                        </div>

                        {feed.description && (
                            <p className="text-[14.5px] text-gray-700 dark:text-dark-text-secondary leading-normal mb-3">
                                {feed.description}
                            </p>
                        )}

                        {count > 0 && (
                            <p className="text-[13px] text-primary-500 mb-4">
                                Liked by {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count} users
                            </p>
                        )}

                        {/* Action buttons */}
                        {isAuthenticated && (
                            <div className="flex gap-3 mb-4">
                                {/* Like button (visual only) */}
                                <button
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-[14.5px] transition-all border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg"
                                >
                                    <BsHeart size={16} />
                                    Like
                                </button>

                                {/* Pin / Unpin */}
                                <button
                                    onClick={async () => {
                                        const fk = feedActionKey(feed);
                                        if (feed.isPinned) {
                                            await dispatch(unpinFeed(fk));
                                        } else {
                                            await dispatch(pinFeed(fk));
                                        }
                                        if (routeKey) dispatch(fetchFeedInfo(routeKey));
                                        setShowInfoModal(false);
                                    }}
                                    disabled={feeds_actionLoading[feedActionKey(feed)]}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-[14.5px] transition-all disabled:opacity-50 bg-primary-500 hover:bg-primary-600 text-white"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17 4v7l2 3v2h-6v5l-1 1-1-1v-5H5v-2l2-3V4h10zm-5 15.5L12 20l.01-.01L12 19.5zm0-15a1 1 0 0 0-1 1v7.28L8.72 15H15.3L13 12.28V5a1 1 0 0 0-1-1z"/>
                                    </svg>
                                    {feed.isPinned ? 'Unpin feed' : 'Pin feed'}
                                </button>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-[13px] text-gray-400 dark:text-dark-text-secondary">
                            <span>Something wrong? <button className="text-primary-500 hover:underline">Let us know.</button></span>
                            <button className="hover:text-gray-600 dark:hover:text-dark-text">Report feed ⓘ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feed Posts */}
            <div className="pb-20">
                {!isLoading && posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-dark-surface rounded-full flex items-center justify-center mb-6">
                            <FiRss className="text-gray-300" size={40} />
                        </div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-dark-text mb-2">
                            {t('feeds.no_posts')}
                        </h2>
                        <p className="text-gray-500 dark:text-dark-text-secondary max-w-xs leading-relaxed">
                            {t('feeds.no_posts_desc')}
                        </p>
                    </div>
                ) : (
                    <>
                        <Feed 
                            feedId={`feed_detail_${id}`}
                            posts={posts} 
                            isLoading={isFeedLoading}
                            hasMore={feedHasMore[id || ''] !== false}
                            onLoadMore={handleLoadMore}
                            emptyMessage={t('feeds.no_posts_desc')}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default FeedDetailPage;

