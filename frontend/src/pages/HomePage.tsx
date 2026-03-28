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
import ButterflyLogo from '../components/common/ButterflyLogo';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { feedActionKey } from '../utils/feedKeys';

const RELOAD_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const navType = useNavigationType();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const lastTab = React.useRef<string>('');
    const hasRestoredScroll = React.useRef<Record<string, boolean>>({});
    const { subscribedFeeds, activeTab, feedPosts, isLoading: feedsLoading, feedLoading, feedHasMore, feedLastFetch } = useAppSelector((state: RootState) => state.feeds);

    
    // Lists state
    const { pinnedLists, activeListFeed, isLoading: listsLoading } = useAppSelector((state: RootState) => state.lists);

    const isInitialLoading = feedsLoading && subscribedFeeds.length === 0 && pinnedLists.length === 0;

    useEffect(() => {
        dispatch(fetchSubscribedFeeds());
        dispatch(fetchPinnedLists());
    }, [dispatch]);

    useEffect(() => {
        if (!activeTab) return;
        const now = Date.now();

        if (activeTab.startsWith('list:')) {
            const listId = activeTab.replace('list:', '');
            if (activeListFeed.length === 0) {
                dispatch(fetchListFeed({ id: listId, skip: 0 }));
            }
        } else {
            const lastFetch = feedLastFetch[activeTab] || 0;
            const isStale = (now - lastFetch) > RELOAD_TIMEOUT;
            const currentFeedPosts = feedPosts[activeTab] || [];
            if (currentFeedPosts.length === 0 || isStale) {
                dispatch(fetchFeedPosts({ feedId: activeTab, skip: 0, take: 20 }));
            }
        }

        lastTab.current = activeTab;
    }, [activeTab, activeListFeed.length, dispatch, feedLastFetch, feedPosts]);

    // Unified Scroll Preservation Logic
    useEffect(() => {
        if (!activeTab) return;

        const hasPosts = (
            (activeTab.startsWith('list:') && activeListFeed.length > 0) ||
            (!activeTab.startsWith('list:') && feedPosts[activeTab]?.length > 0)
        );

        // When switching tabs or when posts initially load for the current tab
        if (lastTab.current !== activeTab || (hasPosts && !hasRestoredScroll.current[activeTab])) {
            const isTabSwitch = lastTab.current !== activeTab;
            
            if (isTabSwitch) {
                const oldTab = lastTab.current;
                if (oldTab) {
                    sessionStorage.setItem(`home_scroll_${oldTab}`, window.scrollY.toString());
                }
                lastTab.current = activeTab;
            }

            if (hasPosts) {
                const scrollKey = `home_scroll_${activeTab}`;
                const savedScroll = sessionStorage.getItem(scrollKey);
                if (savedScroll) {
                    hasRestoredScroll.current[activeTab] = true;
                    // Small timeout to ensure DOM has updated visibility
                    setTimeout(() => {
                        window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'auto' });
                    }, 50);
                } else if (isTabSwitch) {
                    hasRestoredScroll.current[activeTab] = true;
                    window.scrollTo({ top: 0, behavior: 'auto' });
                }
            }
        }

        const handleScroll = () => {
            if (activeTab === lastTab.current) {
                sessionStorage.setItem(`home_scroll_${activeTab}`, window.scrollY.toString());
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeTab, feedPosts, activeListFeed.length]);

    const handleTabChange = (tabId: string) => {
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
                dispatch(fetchFeedPosts({ feedId: tabId, skip: 0, take: 20 }));
            }
        }
    };

    const handleLoadMore = () => {
        if (activeTab.startsWith('list:')) {
            const listId = activeTab.replace('list:', '');
            dispatch(fetchListFeed({ id: listId, skip: activeListFeed.length }));
        } else {
            const currentFeedPosts = feedPosts[activeTab] || [];
            dispatch(fetchFeedPosts({ feedId: activeTab, skip: currentFeedPosts.length, take: 20 }));
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

    // Display tabs based on current pinned order from Feed settings.
    const tabs = useMemo(() => [
        ...pinnedHomeFeeds.map((f: FeedType) => {
            const key = feedActionKey(f);
            return {
                id: key,
                label: key === 'discover'
                    ? t('nav.discover')
                    : key === 'following'
                        ? t('nav.following')
                        : f.name
            };
        }),
        ...pinnedLists.map((l: ListDto) => ({
            id: `list:${l.id}`,
            label: l.name
        }))
    ], [pinnedHomeFeeds, pinnedLists, t]);

    // Ensure a valid tab is always selected
    useEffect(() => {
        if (tabs.length > 0) {
            const isValidTab = tabs.some(tab => tab.id === activeTab);
            if (!isValidTab || !activeTab) {
                dispatch(setActiveTab(tabs[0].id));
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
                            <button
                                onClick={() => navigate('/feeds/settings')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full text-gray-700 dark:text-dark-text"
                                title={t('feeds.home_order_settings', { defaultValue: 'Feed order & pins' })}
                            >
                                <FiSettings size={22} />
                            </button>
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

                {/* Tabbed Feed Panels - Keep in DOM for state persistence */}
                {pinnedHomeFeeds.map((feed: FeedType) => {
                    const tabId = feedActionKey(feed);
                    const isDiscover = tabId === 'discover';
                    const isFollowing = tabId === 'following';
                    return (
                        <div key={tabId} style={{ display: activeTab === tabId ? 'block' : 'none' }}>
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
                                        ? t('feeds.follow_more_cta', 'Follow more accounts to see more content.')
                                        : t('feeds.end', 'End of feed')}
                            />
                        </div>
                    );
                })}

                {/* Pinned Lists Panels */}
                {pinnedLists.map((list: ListDto) => {
                    const tabId = `list:${list.id}`;
                    return (
                        <div key={tabId} style={{ display: activeTab === tabId ? 'block' : 'none' }}>
                            <Feed
                                posts={activeListFeed}
                                isLoading={listsLoading && activeTab === tabId}
                                hasMore={true} // Simplify list pagination for now
                                onLoadMore={handleLoadMore}
                                endMessage={t('lists.feed_end', 'No more posts in this list...')}
                                emptyMessage={t('lists.feed_empty', 'No posts in this list yet.')}
                            />
                        </div>
                    );
                })}

        </div>
    );
};

export default HomePage;
