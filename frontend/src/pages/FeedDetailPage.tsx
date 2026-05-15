import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Feed from '../components/feed/Feed';
import { FiArrowLeft, FiMoreHorizontal, FiRss, FiX, FiTrash2 } from 'react-icons/fi';
import { BsHeart, BsHeartFill, BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import FeedAvatar from '../components/common/FeedAvatar';
import { cn } from '../utils/classNames';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchFeedPosts, fetchSubscribedFeeds, fetchFeedInfo, saveFeed, unsaveFeed, pinFeed, unpinFeed, likeFeed, hydrateInteractionStatusForFeed } from '../redux/slices/feedsSlice';
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
    const [showPinMenu, setShowPinMenu] = useState(false);
    const pinMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pinMenuRef.current && !pinMenuRef.current.contains(event.target as Node)) {
                setShowPinMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            <div className={cn(
                "sticky top-0 z-30 w-full border-b flex flex-row items-center gap-2 bg-black px-5 min-h-[52px] border-[#232e3e] mx-auto max-w-[600px]"
            )}>
                {/* Back Button */}
                <div className="z-50 w-[33px]">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex flex-row items-center justify-center h-[33px] w-[33px] rounded-full -ml-[3px] bg-transparent hover:bg-white/10 transition-colors"
                    >
                        <div className="z-20 w-[17px] height-[17px]">
                             <svg fill="none" width="24" viewBox="0 0 24 24" height="24" className="text-[#8798b0]">
                                <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M3 12a1 1 0 0 1 .293-.707l6-6a1 1 0 0 1 1.414 1.414L6.414 11H20a1 1 0 1 1 0 2H6.414l4.293 4.293a1 1 0 0 1-1.414 1.414l-6-6A1 1 0 0 1 3 12Z" />
                             </svg>
                        </div>
                    </button>
                </div>

                {/* Center Content / Info Trigger */}
                <div className="flex-1 flex justify-center min-h-[33px]">
                    <button
                        onClick={() => setShowInfoModal(true)}
                        className="flex flex-row items-center justify-start py-0.5 pr-2 relative group"
                    >
                        <div className="absolute inset-0 -left-0.5 rounded-lg bg-[#111822] opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
                        <div className="flex-1 flex flex-row items-center gap-2 relative">
                            <div className="flex-1">
                                <div className="text-[16.9px] tracking-[0.25px] text-white font-bold line-clamp-2 leading-[22px] text-left">
                                    {feed.name}
                                </div>
                                <div className="flex flex-row gap-1.5 mt-[-1px]">
                                    <div className="text-[13.1px] tracking-[0.25px] text-[#a5b2c5] overflow-hidden min-w-0 flex-shrink-1 leading-[17px]">
                                        @{feed.handle}
                                    </div>
                                    <div className="flex flex-row items-center gap-0.5">
                                        <svg fill="none" viewBox="0 0 24 24" width="12" height="12">
                                            <path fill="#526580" fillRule="evenodd" clipRule="evenodd" d="M12.489 21.372c8.528-4.78 10.626-10.47 9.022-14.47-.779-1.941-2.414-3.333-4.342-3.763-1.697-.378-3.552.003-5.169 1.287-1.617-1.284-3.472-1.665-5.17-1.287-1.927.43-3.562 1.822-4.34 3.764-1.605 4 .493 9.69 9.021 14.47a1 1 0 0 0 .978 0Z" />
                                        </svg>
                                        <div className="text-[13.1px] tracking-[0.25px] text-[#a5b2c5] overflow-hidden min-w-0 leading-[17px]">
                                            {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <svg fill="none" viewBox="0 0 24 24" width="20" height="20">
                                <path fill="#526580" fillRule="evenodd" clipRule="evenodd" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                            </svg>
                        </div>
                    </button>
                </div>

                {/* Pin Button */}
                <div className="z-50 w-[33px]" ref={pinMenuRef}>
                    <button
                        type="button"
                        onClick={async () => {
                            if (!isAuthenticated) {
                                dispatch(openAuthWall());
                                return;
                            }
                            const fk = feedActionKey(feed);
                            if (feed.isPinned) {
                                setShowPinMenu(!showPinMenu);
                            } else {
                                await dispatch(pinFeed(fk));
                                dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
                            }
                        }}
                        disabled={feeds_actionLoading[feedActionKey(feed)]}
                        className={cn(
                            "flex flex-row items-center justify-center bg-black h-[33px] w-[33px] rounded-lg transition-colors group",
                            feed.isPinned ? "text-[#0085ff]" : "text-[#8798b0] hover:bg-white/10"
                        )}
                    >
                        <div className="z-20 w-[17px] h-[17px]">
                            <svg fill="none" width="24" viewBox="0 0 24 24" height="24" className={feed.isPinned ? "text-[#0085ff]" : "text-[#8798b0]"}>
                                <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M6.5 3a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v3.997a6.25 6.25 0 0 0 1.83 4.42l.377.376A1 1 0 0 1 20 12.5V15a1 1 0 0 1-1 1h-6v5a1 1 0 1 1-2 0v-5H5a1 1 0 0 1-1-1v-2.5a1 1 0 0 1 .293-.707l.376-.377A6.25 6.25 0 0 0 6.5 6.996V3.001Zm2 1v2.997a8.25 8.25 0 0 1-2.416 5.834L6 12.914V14h12v-1.086l-.084-.083A8.25 8.25 0 0 1 15.5 6.997V4h-7Z" />
                            </svg>
                        </div>

                        {/* Pin Dropdown Menu */}
                        {showPinMenu && (
                            <div className="absolute top-[38px] right-0 w-64 bg-white dark:bg-[#161e27] border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 ring-1 ring-black/5">
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const fk = feedActionKey(feed);
                                        await dispatch(unpinFeed(fk));
                                        setShowPinMenu(false);
                                        dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 text-[15px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-gray-900 dark:text-dark-text"
                                >
                                    <span className="font-semibold">Unpin from home</span>
                                    <FiX size={20} className="text-gray-500 dark:text-gray-400" />
                                </button>
                                <button
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        const fk = feedActionKey(feed);
                                        await dispatch(unsaveFeed(fk));
                                        if (feed.isPinned) await dispatch(unpinFeed(fk));
                                        
                                        setShowPinMenu(false);
                                        dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
                                    }}
                                    className="w-full flex items-center justify-between px-4 py-3 text-[15px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-500"
                                >
                                    <span className="font-semibold">Remove from my feeds</span>
                                    <FiTrash2 size={20} />
                                </button>
                            </div>
                        )}
                    </button>
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
                                {/* Like button */}
                                <button
                                    onClick={async () => {
                                        if (routeKey && feed) {
                                            await dispatch(likeFeed({ 
                                                feedId: routeKey, 
                                                isLiked: !feed.isLiked, 
                                                likeUri: feed.likeUri 
                                            }));
                                        }
                                    }}
                                    disabled={feeds_actionLoading[routeKey]}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border font-semibold text-[14.5px] transition-all border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg"
                                >
                                    {feed.isLiked ? <BsHeartFill size={16} className="text-red-500" /> : <BsHeart size={16} />}
                                    {feed.isLiked ? 'Liked' : 'Like'}
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
                                        setShowInfoModal(false);
                                    }}
                                    disabled={feeds_actionLoading[feedActionKey(feed)]}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-[14.5px] transition-all disabled:opacity-50",
                                        feed.isPinned
                                            ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50"
                                            : "bg-primary-500 hover:bg-primary-600 text-white"
                                    )}
                                >
                                    {feed.isPinned ? (
                                        <BsPinAngleFill size={16} />
                                    ) : (
                                        <BsPinAngle size={16} />
                                    )}
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

