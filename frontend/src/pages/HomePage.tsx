import React, { useEffect, useMemo } from 'react';
import Feed from '../components/feed/Feed';
import { PostFeedSkeleton } from '../components/feed/PostSkeleton';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setActiveTab, fetchSubscribedFeeds, fetchFeedPosts } from '../redux/slices/feedsSlice';

import { fetchPinnedLists, fetchListFeed } from '../redux/slices/listsSlice';
import { RootState } from '../redux/store';
import { useNavigate, useNavigationType } from 'react-router-dom';
import { FiHash, FiMenu, FiSettings } from 'react-icons/fi';
import { Feed as FeedType, ListDto } from '../types';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import Button from '../components/common/Button';
import ButterflyLogo from '../components/common/ButterflyLogo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { feedActionKey } from '../utils/feedKeys';
import { getDynamicBatchSize } from '../utils/pagination';
import { useScrollRestoration } from '../hooks/useScrollRestoration';

const RELOAD_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const navType = useNavigationType();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { subscribedFeeds, activeTab, feedPosts, isLoading: feedsLoading, feedLoading, feedHasMore, feedLastFetch } = useAppSelector((state: RootState) => state.feeds);
    const { isAuthenticated, user, isLoading: authLoading } = useAppSelector((state: RootState) => state.auth);

    // Use unified global scroll restoration for the current tab
    useScrollRestoration(activeTab);

    const [visitedTabs, setVisitedTabs] = React.useState<Set<string>>(new Set([activeTab]));

    useEffect(() => {
        if (activeTab && !visitedTabs.has(activeTab)) {
            setVisitedTabs(prev => new Set(prev).add(activeTab));
        }
    }, [activeTab, visitedTabs]);

    
    // Lists state
    const { pinnedLists, activeListFeed, isLoading: listsLoading } = useAppSelector((state: RootState) => state.lists);

    const hasAnyData = subscribedFeeds.length > 0 || pinnedLists.length > 0 || (activeTab && feedPosts[activeTab]?.length > 0);
    const isInitialLoading = (feedsLoading || authLoading) && !hasAnyData;

    useEffect(() => {
        if (!authLoading && subscribedFeeds.length === 0) {
            dispatch(fetchSubscribedFeeds());
            dispatch(fetchPinnedLists());
        }
    }, [dispatch, authLoading, subscribedFeeds.length]);

    useEffect(() => {
        if (!activeTab) return;
        const now = Date.now();

        if (activeTab.startsWith('list:')) {
            const listId = activeTab.replace('list:', '');
            if (activeListFeed.length === 0 && !listsLoading) {
                dispatch(fetchListFeed({ id: listId, skip: 0 }));
            }
        } else {
            if (feedLoading[activeTab]) return;
            const lastFetch = feedLastFetch[activeTab] || 0;
            const neverFetched = lastFetch === 0;
            const isStale = (now - lastFetch) > RELOAD_TIMEOUT;
            if (neverFetched || isStale) {
                const isDiscover = activeTab === 'discover';
                const initialTake = (isDiscover && (feedPosts[activeTab]?.length || 0) === 0) ? 6 : getDynamicBatchSize(250);
                dispatch(fetchFeedPosts({ feedId: activeTab, skip: 0, take: initialTake }));
            }
        }
    }, [activeTab, activeListFeed.length, dispatch, feedLastFetch, feedLoading, feedPosts, listsLoading]);

    // Consolidated scroll management moved to global useScrollRestoration(activeTab)

    const handleTabChange = (tabId: string) => {
        if (tabId === 'feeds-discovery' && !isAuthenticated) {
            navigate('/feeds');
            return;
        }

        dispatch(setActiveTab(tabId));
        const now = Date.now();

        if (tabId.startsWith('list:')) {
            const listId = tabId.replace('list:', '');
            dispatch(fetchListFeed({ id: listId, skip: 0 }));
        } else {
            const lastFetch = feedLastFetch[tabId] || 0;
            const isStale = (now - lastFetch) > RELOAD_TIMEOUT;
            const currentFeedPosts = feedPosts[tabId] || [];
            if (currentFeedPosts.length === 0 || isStale) {
                const isDiscover = tabId === 'discover';
                const initialTake = (isDiscover && currentFeedPosts.length === 0) ? 6 : getDynamicBatchSize(250);
                dispatch(fetchFeedPosts({ feedId: tabId, skip: 0, take: initialTake }));
            }
        }
    };

    const handleLoadMore = () => {
        if (activeTab.startsWith('list:')) {
            const listId = activeTab.replace('list:', '');
            dispatch(fetchListFeed({ id: listId, skip: activeListFeed.length }));
        } else {
            const currentFeedPosts = feedPosts[activeTab] || [];
            const dynamicTake = getDynamicBatchSize(250);
            dispatch(fetchFeedPosts({ feedId: activeTab, skip: currentFeedPosts.length, take: dynamicTake }));
        }
    };

    const pinnedHomeFeeds = useMemo(() => {
        const sorted = [...subscribedFeeds]
            .filter((f: FeedType) => !!f.isPinned)
            .sort((a: FeedType, b: FeedType) => {
                const ao = a.pinnedOrder || 0;
                const bo = b.pinnedOrder || 0;
                if (ao > 0 && bo > 0 && ao !== bo) return ao - bo;
                if (ao > 0 && bo === 0) return -1;
                if (bo > 0 && ao === 0) return 1;
                return feedActionKey(a).localeCompare(feedActionKey(b), undefined, { sensitivity: 'base' });
            });

        const seen = new Set<string>();
        return sorted.filter((f: FeedType) => {
            const key = feedActionKey(f);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [subscribedFeeds]);

    const visibleHomeFeeds = useMemo(() => {
        if (pinnedHomeFeeds.length > 0) {
            return pinnedHomeFeeds;
        }

        if (isAuthenticated) {
            return [
                { id: 'following', handle: 'following', name: 'Following' } as FeedType,
                { id: 'discover', handle: 'discover', name: 'Discover' } as FeedType,
            ];
        }

        return [
            { id: 'discover', handle: 'discover', name: t('nav.discover') } as FeedType,
        ];
    }, [isAuthenticated, pinnedHomeFeeds, t]);

    const followingEmptyMessage = useMemo(() => {
        if ((user?.followingCount ?? 0) > 0) {
            return t('feeds.following_empty_recent', { defaultValue: 'No recent posts from people you follow right now.' });
        }

        return t('feeds.follow_more_cta', 'Follow more accounts to see more content.');
    }, [t, user?.followingCount]);

    // Display tabs based on current pinned order from Feed settings.
    const tabs = useMemo(() => {
        if (!isAuthenticated && subscribedFeeds.length === 0 && pinnedLists.length === 0) {
            return [
                { id: 'discover', label: 'Discover' },
                { id: 'feeds-discovery', label: 'Feeds ✨' },
            ];
        }

        return [
            ...visibleHomeFeeds.map((f: FeedType) => {
                const key = feedActionKey(f);
                return {
                    id: key,
                    label: key === 'discover'
                        ? 'Discover'
                        : key === 'following'
                            ? 'Following'
                            : f.name
                };
            }),
            ...pinnedLists.map((l: ListDto) => ({
                id: `list:${l.id}`,
                label: l.name
            }))
        ];
    }, [visibleHomeFeeds, pinnedLists, t, isAuthenticated, subscribedFeeds.length]);

    // Ensure a valid tab is always selected
    useEffect(() => {
        if (tabs.length > 0) {
            const isValidTab = tabs.some(tab => tab.id === activeTab);
            if (!isValidTab || !activeTab) {
                // For guests, prefer discover if available
                const defaultTab = !isAuthenticated && tabs.some(t => t.id === 'discover') 
                    ? 'discover' 
                    : tabs[0].id;
                dispatch(setActiveTab(defaultTab));
            }
        }
    }, [tabs, activeTab, dispatch]);

    useDocumentTitle(t('nav.home'));

    if (isInitialLoading) {
        return (
            <div className="min-h-screen">
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border w-full">
                    <div className="flex items-center justify-between px-4 h-12 w-full">
                        <div className="w-10" />
                        <div className="w-7 h-7 bg-gray-200 dark:bg-dark-surface rounded-full animate-pulse" />
                        <div className="w-10" />
                    </div>
                    <div className="flex w-full px-2 overflow-x-auto no-scrollbar items-center">
                        <div className="flex w-full gap-4 px-2 py-3">
                            <div className="w-20 h-5 bg-gray-200 dark:bg-dark-surface rounded animate-pulse" />
                            <div className="w-20 h-5 bg-gray-200 dark:bg-dark-surface rounded animate-pulse" />
                            <div className="w-20 h-5 bg-gray-200 dark:bg-dark-surface rounded animate-pulse" />
                        </div>
                    </div>
                </div>
                <PostFeedSkeleton count={5} />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border w-full">
                    <div className="flex items-center justify-between px-4 h-12 w-full">
                        <button
                            onClick={() => dispatch(openMobileMenu())}
                            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                        >
                            <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                        </button>
                        <div className="hidden lg:block w-10 flex-shrink-0" /> {/* Spacer */}

                        <ButterflyLogo
                            className="w-7 h-7 text-primary-500 cursor-pointer flex-shrink-0"
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        />

                        <div className="flex items-center gap-0.5 flex-shrink-0">
                            {isAuthenticated && (
                                <button
                                    onClick={() => navigate('/feeds/settings')}
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full text-gray-700 dark:text-dark-text"
                                    title={t('feeds.home_order_settings', { defaultValue: 'Feed order & pins' })}
                                >
                                    <FiSettings size={22} />
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/feeds')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full text-gray-700 dark:text-dark-text"
                                title={t('feeds.title')}
                            >
                                <FiHash size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex w-full px-2 overflow-x-auto no-scrollbar items-center">
                        <div className="flex w-full">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={cn(
                                        "px-4 py-3 text-[15px] font-bold transition-all relative whitespace-nowrap flex-shrink-0",
                                        activeTab === tab.id
                                            ? "text-gray-900 dark:text-dark-text"
                                            : "text-gray-500 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-surface/50"
                                    )}
                                >
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary-500 rounded-full mx-3" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {visibleHomeFeeds.map((feed: any) => {
                    const tabId = feedActionKey(feed) || feed.id;
                    const isDiscover = tabId === 'discover';
                    const isFollowing = tabId === 'following';
                    
                    if (!visitedTabs.has(tabId)) return null;

                    return (
                        <div key={tabId} hidden={activeTab !== tabId} style={{ display: activeTab === tabId ? 'block' : 'none' }}>
                            <Feed
                                posts={feedPosts[tabId] || []}
                                isLoading={!!(feedLoading[tabId] ?? (feedsLoading && activeTab === tabId))}
                                hasMore={feedHasMore[tabId] !== false}
                                onLoadMore={handleLoadMore}
                                endMessage={isFollowing
                                    ? t('feeds.following_end', 'Follow more people to get more content...')
                                    : t('feeds.end', 'End of feed')}
                                emptyMessage={isDiscover
                                    ? t('feeds.discover_empty', { defaultValue: 'Nothing new to discover yet.' })
                                    : isFollowing
                                        ? followingEmptyMessage
                                        : t('feeds.end', 'End of feed')}
                                isActive={activeTab === tabId}
                            />
                        </div>
                    );
                })}


                {/* Pinned Lists Panels */}
                {pinnedLists.map((list: ListDto) => {
                    const tabId = `list:${list.id}`;
                    if (!visitedTabs.has(tabId)) return null;

                    return (
                        <div key={tabId} hidden={activeTab !== tabId} style={{ display: activeTab === tabId ? 'block' : 'none' }}>
                            <Feed
                                posts={activeListFeed}
                                isLoading={listsLoading && activeTab === tabId}
                                hasMore={true} // Simplify list pagination for now
                                onLoadMore={handleLoadMore}
                                endMessage={t('lists.feed_end', 'No more posts in this list...')}
                                emptyMessage={t('lists.feed_empty', 'No posts in this list yet.')}
                                isActive={activeTab === tabId}
                            />
                        </div>
                    );
                })}

        </div>
    );
};

export default HomePage;
