import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    FiArrowLeft, FiSettings, FiSearch, FiRss,
    FiChevronRight, FiGrid, FiActivity, FiMapPin
} from 'react-icons/fi';
import { BsPinAngle, BsPinAngleFill } from 'react-icons/bs';
import { FiX, FiTrash2 } from 'react-icons/fi';
import FeedAvatar from '../components/common/FeedAvatar';
import { cn } from '../utils/classNames';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Feed } from '../types';
import IconButton from '../components/common/IconButton';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { openMobileMenu, openAuthWall } from '../redux/slices/modalsSlice';
import {
    fetchSubscribedFeeds,
    fetchRecommendedFeeds,
    pinFeed,
    unpinFeed,
    unsaveFeed,
    searchFeeds,
} from '../redux/slices/feedsSlice';
import { RootState } from '../redux/store';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { feedActionKey } from '../utils/feedKeys';

const FeedsPage: React.FC = () => {
    const navigate = useNavigate();
    const navType = useNavigationType();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [showMorePinned, setShowMorePinned] = useState(false);
    const [showAllMyFeeds, setShowAllMyFeeds] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [activePinMenuId, setActivePinMenuId] = useState<string | null>(null);
    const pinMenuRef = useRef<HTMLDivElement>(null);
    const observer = useRef<IntersectionObserver | null>(null);

    const {
        subscribedFeeds,
        searchResults,
        recommendedFeeds,
        recommendedCursor,
        isLoading,
        searchLoading,
        actionLoading,
        hasMoreSearch
    } = useAppSelector((state: RootState) => state.feeds);
    
    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);

    const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoading || isFetchingMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                if (searchQuery.length >= 2) {
                    if (hasMoreSearch) {
                        dispatch(searchFeeds({ query: searchQuery, skip: searchResults.length, take: 10 }));
                    }
                } else if (recommendedCursor) {
                    setIsFetchingMore(true);
                    dispatch(fetchRecommendedFeeds({ cursor: recommendedCursor })).finally(() => {
                        setIsFetchingMore(false);
                    });
                }
            }
        });

        if (node) observer.current.observe(node);
    }, [isLoading, isFetchingMore, searchQuery, hasMoreSearch, searchResults.length, recommendedCursor, dispatch]);

    useEffect(() => {
        if (isAuthenticated) {
            dispatch(fetchSubscribedFeeds());
        }
        dispatch(fetchRecommendedFeeds());
    }, [dispatch, isAuthenticated]);

    useEffect(() => {
        if (searchQuery.length >= 2) {
            const delayDebounceFn = setTimeout(() => {
                dispatch(searchFeeds({ query: searchQuery, skip: 0, take: 10 }));
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, dispatch]);

    // Scroll Persistence Logic
    useEffect(() => {
        if (navType !== 'POP') return;
        const scrollKey = `feeds_list_scroll`;

        const savedScroll = sessionStorage.getItem(scrollKey);
        if (savedScroll && (subscribedFeeds.length > 0 || recommendedFeeds.length > 0)) {
            setTimeout(() => {
                window.scrollTo(0, parseInt(savedScroll, 10));
            }, 0);
        }

        const handleScroll = () => {
            sessionStorage.setItem(scrollKey, window.scrollY.toString());
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [subscribedFeeds.length, recommendedFeeds.length, navType]);

    // Handle click outside for pin menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (pinMenuRef.current && !pinMenuRef.current.contains(event.target as Node)) {
                setActivePinMenuId(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handlePinToggle = (e: React.MouseEvent, feed: Feed) => {
        e.stopPropagation();
        const fk = feedActionKey(feed);
        if (feed.isPinned) {
            setActivePinMenuId(activePinMenuId === fk ? null : fk);
        } else {
            dispatch(pinFeed(fk)).then(() => {
                dispatch(fetchSubscribedFeeds());
            });
        }
    };

    useDocumentTitle(t('feeds.title'));

    const myFeedsSorted = useMemo(() => {
        const list = [...subscribedFeeds];
        list.sort((a, b) => {
            const ap = a.isPinned ? 0 : 1;
            const bp = b.isPinned ? 0 : 1;
            if (ap !== bp) return ap - bp;
            const po = (a.pinnedOrder || 0) - (b.pinnedOrder || 0);
            if (po !== 0) return po;
            return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });
        return list;
    }, [subscribedFeeds]);

    const myFeedsCollapsedAt = 12;

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
            {/* Header */}
            {!isAuthenticated ? (
                /* Guest Hero Header per Pic 2 */
                <div className="bg-white dark:bg-dark-surface border-b border-gray-100 dark:border-dark-border transition-colors">
                    <div className="flex items-center justify-between p-4 px-6 h-[60px]">
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-secondary text-gray-600 dark:text-dark-text transition-colors"
                            >
                                <FiArrowLeft size={22} />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('nav.feeds')}
                            </h1>
                        </div>
                        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface-secondary text-gray-600 dark:text-dark-text transition-colors">
                            <FiSettings size={22} />
                        </button>
                    </div>

                    <div className="px-6 py-4">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                                <FiActivity className="text-primary-500" size={24} />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h1 className="text-2xl font-black text-gray-900 dark:text-dark-text leading-tight">
                                    {t('feeds.discover_new_feeds')}
                                </h1>
                                <p className="text-[15px] text-gray-500 dark:text-dark-text-secondary leading-normal">
                                    {t('feeds.discover_description')}
                                </p>
                            </div>
                        </div>

                        <div className="relative group mb-2">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                            <input
                                type="text"
                                placeholder={t('feeds.search_feeds_placeholder')}
                                className="w-full bg-gray-100 dark:bg-dark-surface-secondary border-none rounded-2xl py-3 pl-12 pr-4 text-[16px] focus:ring-2 focus:ring-primary-500 outline-none transition-colors dark:text-dark-text placeholder-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            ) : (
                /* Authenticated Header */
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                        >
                            <FiArrowLeft size={24} className="text-gray-700 dark:text-dark-text" />
                        </button>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                            {t('feeds.title')}
                        </h1>
                    </div>
                    <IconButton
                        icon={<FiSettings size={20} />}
                        onClick={() => navigate('/feeds/settings')}
                    />
                </div>
            )}

            <div className="flex-1 min-h-[500px]">


                {isAuthenticated && (
                    /* My feeds section for authenticated users */
                    <div className="p-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/10">
                        <div className="flex items-center gap-4 mb-1">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                <FiGrid className="text-primary-500" size={20} />
                            </div>
                            <div>
                                <h2 className="font-bold text-gray-900 dark:text-dark-text">{t('feeds.my_feeds')}</h2>
                                <p className="text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                                    {t('feeds.my_feeds_hint')}
                                </p>
                            </div>
                        </div>

                    <div className="space-y-0.5 mt-1">
                            {myFeedsSorted.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary py-4 italic text-center">
                                    {t('feeds.no_saved_feeds')}
                                </p>
                            )}
                            {(showAllMyFeeds ? myFeedsSorted : myFeedsSorted.slice(0, myFeedsCollapsedAt)).map((feed: Feed) => {
                                    const fk = feedActionKey(feed);
                                    const isSpecial = fk === 'following';
                                    return (
                                        <div
                                            key={fk}
                                            onClick={() => !isSpecial && navigate(`/feeds/${encodeURIComponent(fk)}`)}
                                            className={cn(
                                                "flex items-center justify-between px-4 py-3 transition-colors group",
                                                isSpecial ? "cursor-default" : "hover:bg-gray-50 dark:hover:bg-dark-surface/30 cursor-pointer"
                                            )}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                                <FeedAvatar
                                                    src={feed.avatarUrl || feed.avatar}
                                                    alt={feed.name}
                                                    size="sm"
                                                    className="rounded-md flex-shrink-0"
                                                />
                                                <span className="font-semibold text-gray-900 dark:text-dark-text truncate text-[15px]">
                                                    {isSpecial ? t('nav.following') : feed.name}
                                                </span>
                                            </div>
                                            {!isSpecial && <FiChevronRight className="text-gray-400 flex-shrink-0" size={18} />}
                                        </div>
                                    );
                                })}
                            {myFeedsSorted.length > myFeedsCollapsedAt && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllMyFeeds(!showAllMyFeeds)}
                                    className="w-full py-2 mt-1 text-sm font-bold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors"
                                >
                                    {showAllMyFeeds ? t('common.show_less') : t('common.show_more')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Search Results or Discover */}
                {searchQuery.length >= 2 ? (
                    /* Search results */
                    <div className="flex flex-col">
                        <div className="px-4 py-2 bg-gray-50 dark:bg-dark-surface/5 text-[13px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                            {t('feeds.search_results')}
                        </div>
                        {searchResults.map((feed: Feed) => (
                            <div
                                key={feedActionKey(feed)}
                                onClick={() => navigate(`/feeds/${encodeURIComponent(feedActionKey(feed))}`)}
                                className="p-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <div className="flex gap-3 min-w-0">
                                        <FeedAvatar src={feed.avatarUrl || feed.avatar} alt={feed.name} />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-gray-900 dark:text-dark-text hover:underline truncate">{feed.name}</span>
                                            <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">Feed by @{feed.handle}</span>
                                        </div>
                                    </div>
                                    {isAuthenticated && (
                                        <div className="relative" ref={activePinMenuId === feedActionKey(feed) ? pinMenuRef : null}>
                                            <button
                                                onClick={(e) => handlePinToggle(e, feed)}
                                                disabled={actionLoading[feedActionKey(feed)]}
                                                className={cn(
                                                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all disabled:opacity-50",
                                                    feed.isPinned
                                                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50"
                                                        : "bg-primary-500 text-white"
                                                )}
                                            >
                                                {feed.isPinned ? <BsPinAngleFill size={12} /> : <BsPinAngle size={12} />}
                                                {feed.isPinned ? 'Pinned to Home' : 'Pin to Home'}
                                            </button>

                                            {/* Pin Dropdown */}
                                            {activePinMenuId === feedActionKey(feed) && (
                                                <div 
                                                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#161e27] border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 ring-1 ring-black/5"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const fk = feedActionKey(feed);
                                                            await dispatch(unpinFeed(fk));
                                                            setActivePinMenuId(null);
                                                            dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
                                                        }}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 text-[14px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-gray-900 dark:text-dark-text"
                                                    >
                                                        <span className="font-semibold">Unpin from home</span>
                                                        <FiX size={18} className="text-gray-500" />
                                                    </button>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const fk = feedActionKey(feed);
                                                            await dispatch(unsaveFeed(fk));
                                                            if (feed.isPinned) await dispatch(unpinFeed(fk));
                                                            
                                                            setActivePinMenuId(null);
                                                            dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
                                                        }}
                                                        className="w-full flex items-center justify-between px-4 py-2.5 text-[14px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-500"
                                                    >
                                                        <span className="font-semibold">Remove from my feeds</span>
                                                        <FiTrash2 size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {feed.description && (
                                    <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary line-clamp-2 leading-relaxed pl-[52px]">
                                        {feed.description}
                                    </p>
                                )}
                            </div>
                        ))}
                        {searchLoading && <div className="p-4 text-center text-sm text-gray-500">{t('common.loading')}</div>}
                    </div>
                ) : (
                    /* Discover new feeds */
                    <div className="flex flex-col">
                        {/* Discover New Feeds Banner */}
                        <div className="px-5 pt-5 pb-3">
                            <div className="flex items-start gap-3 mb-3">
                                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center shrink-0">
                                    <FiActivity className="text-primary-500" size={22} />
                                </div>
                                <div>
                                    <h2 className="text-[17px] font-black text-gray-900 dark:text-dark-text leading-tight">
                                        Discover New Feeds
                                    </h2>
                                    <p className="text-[13.5px] text-gray-500 dark:text-dark-text-secondary leading-snug mt-0.5">
                                        Choose your own timeline! Feeds built by the community help you find content you love.
                                    </p>
                                </div>
                            </div>
                            {/* Unified search bar */}
                            <div className="relative group">
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search feeds"
                                    className="w-full bg-gray-100 dark:bg-dark-surface py-2.5 pl-10 pr-4 rounded-full text-[14px] focus:bg-white dark:focus:bg-dark-bg border border-transparent focus:border-primary-400 outline-none transition-colors dark:text-dark-text placeholder-gray-400"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Feed cards */}
                        {recommendedFeeds.map((feed: Feed) => (
                            <div
                                key={feedActionKey(feed)}
                                onClick={() => navigate(`/feeds/${encodeURIComponent(feedActionKey(feed))}`)}
                                className="px-4 py-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors cursor-pointer"
                            >
                                <div className="flex items-start gap-3">
                                    <FeedAvatar src={feed.avatarUrl || feed.avatar} alt={feed.name} className="flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-0.5">
                                            <div className="min-w-0">
                                                <span className="font-bold text-[15px] text-gray-900 dark:text-dark-text block truncate">{feed.name}</span>
                                                <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary">Feed by @{feed.handle}</span>
                                            </div>
                                            {isAuthenticated && (
                                                <div className="relative" ref={activePinMenuId === feedActionKey(feed) ? pinMenuRef : null}>
                                                    <button
                                                        onClick={(e) => handlePinToggle(e, feed)}
                                                        disabled={actionLoading[feedActionKey(feed)]}
                                                        className={cn(
                                                            "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold text-[13px] transition-all disabled:opacity-50",
                                                            feed.isPinned
                                                                ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/50"
                                                                : "bg-primary-500 text-white"
                                                        )}
                                                    >
                                                        {feed.isPinned ? <BsPinAngleFill size={12} /> : <BsPinAngle size={12} />}
                                                        {feed.isPinned ? 'Pinned to Home' : 'Pin to Home'}
                                                    </button>

                                                    {/* Pin Dropdown */}
                                                    {activePinMenuId === feedActionKey(feed) && (
                                                        <div 
                                                            className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#161e27] border border-gray-100 dark:border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 ring-1 ring-black/5"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const fk = feedActionKey(feed);
                                                                    await dispatch(unpinFeed(fk));
                                                                    setActivePinMenuId(null);
                                                                    dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
                                                                }}
                                                                className="w-full flex items-center justify-between px-4 py-2.5 text-[14px] hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-gray-900 dark:text-dark-text"
                                                            >
                                                                <span className="font-semibold">Unpin from home</span>
                                                                <FiX size={18} className="text-gray-500" />
                                                            </button>
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const fk = feedActionKey(feed);
                                                                    await dispatch(unsaveFeed(fk));
                                                                    if (feed.isPinned) await dispatch(unpinFeed(fk));
                                                                    
                                                                    setActivePinMenuId(null);
                                                                    dispatch(fetchSubscribedFeeds({ bypassThrottle: true }));
                                                                }}
                                                                className="w-full flex items-center justify-between px-4 py-2.5 text-[14px] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-red-500"
                                                            >
                                                                <span className="font-semibold">Remove from my feeds</span>
                                                                <FiTrash2 size={18} />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {feed.description && (
                                            <p className="text-[13.5px] text-gray-600 dark:text-dark-text-secondary line-clamp-2 leading-relaxed mt-1">
                                                {feed.description}
                                            </p>
                                        )}
                                        <p className="text-[12.5px] text-gray-400 dark:text-dark-text-secondary mt-1.5">
                                            Liked by {(feed.subscribersCount || feed.followersCount || 0).toLocaleString()} users
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {(recommendedFeeds.length > 0 || isLoading) && (
                            <div ref={loadMoreRef} className="h-20 flex items-center justify-center p-4">
                                {(isLoading || isFetchingMore) && (
                                    <div className="w-6 h-6 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
                                )}
                            </div>
                        )}

                        {!isLoading && recommendedFeeds.length === 0 && (
                            <div className="p-8 text-center flex flex-col items-center">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-dark-surface rounded-full flex items-center justify-center mb-3">
                                    <FiRss className="text-gray-400" size={24} />
                                </div>
                                <p className="text-gray-500 dark:text-dark-text-secondary">
                                    {t('feeds.no_recommendations')}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedsPage;
