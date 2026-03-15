import React, { useEffect, useMemo } from 'react';
import MainLayout from '../components/layout/MainLayout';
import InterestsSection from '../components/feed/InterestsSection';
import Feed from '../components/feed/Feed';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setActiveTab, fetchSubscribedFeeds, fetchFeedPosts } from '../redux/slices/feedsSlice';
import { fetchTimeline, fetchTrendingPosts, fetchDiscoverPosts } from '../redux/slices/postsSlice';
import { fetchPinnedLists, fetchListFeed } from '../redux/slices/listsSlice';
import { RootState } from '../redux/store';
import { useNavigate } from 'react-router-dom';
import { FiHash, FiMenu, FiSettings } from 'react-icons/fi';
import { Feed as FeedType, ListDto } from '../types';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import ButterflyLogo from '../components/common/ButterflyLogo';

const RELOAD_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const lastTab = React.useRef<string>('');
    const hasRestoredScroll = React.useRef<Record<string, boolean>>({});
    const { subscribedFeeds, activeTab, feedPosts, isLoading: feedsLoading, feedHasMore, feedLastFetch } = useAppSelector((state: RootState) => state.feeds);
    const {
        posts: followingPosts,
        discoverPosts,
        timelineLoading,
        discoverLoading,
        hasMore: timelineHasMore,
        discoverHasMore,
        lastTimelineFetch,
        lastDiscoverFetch
    } = useAppSelector((state: RootState) => state.posts);
    
    // Lists state
    const { pinnedLists, activeListFeed, isLoading: listsLoading } = useAppSelector((state: RootState) => state.lists);
    
    const trendingPosts = useAppSelector((state: RootState) => state.posts.trendingPosts);

    useEffect(() => {
        // Fetch feeds first
        dispatch(fetchSubscribedFeeds());
        dispatch(fetchPinnedLists());

        const now = Date.now();

        // Initial fetch based on persisted activeTab - ONLY if empty or stale
        if (activeTab === 'following') {
            const isStale = (now - lastTimelineFetch) > RELOAD_TIMEOUT;
            if (followingPosts.length === 0 || isStale) {
                dispatch(fetchTimeline({ skip: 0 }));
            }
        } else if (activeTab === 'discover') {
            const isStale = (now - lastDiscoverFetch) > RELOAD_TIMEOUT;
            if (discoverPosts.length === 0 || isStale) {
                dispatch(fetchDiscoverPosts({ skip: 0 }));
            }
        } else if (activeTab.startsWith('list:')) {
            const listId = activeTab.replace('list:', '');
            // Simple approach for lists: just fetch fresh when switching to it for now
            dispatch(fetchListFeed(listId));
        } else {
            // Check if it's a custom feed
            const lastFetch = feedLastFetch[activeTab] || 0;
            const isStale = (now - lastFetch) > RELOAD_TIMEOUT;
            const currentFeedPosts = feedPosts[activeTab] || [];
            if (currentFeedPosts.length === 0 || isStale) {
                dispatch(fetchFeedPosts({ feedId: activeTab, skip: 0, take: 20 }));
            }
        }

        lastTab.current = activeTab;
    }, [dispatch]);

    // Restore scroll position once (only when switching to a tab that already has posts)
    useEffect(() => {
        if (!activeTab) return;
        // Already restored scroll for this tab session — don't re-run on load-more
        if (hasRestoredScroll.current[activeTab]) return;

        const hasPosts = (
            (activeTab === 'following' && followingPosts.length > 0) ||
            (activeTab === 'discover' && discoverPosts.length > 0) ||
            (activeTab.startsWith('list:') && activeListFeed.length > 0) ||
            (!['following', 'discover'].includes(activeTab) && !activeTab.startsWith('list:'))
        );
        if (!hasPosts) return;

        const scrollKey = `home_scroll_${activeTab}`;
        const savedScroll = sessionStorage.getItem(scrollKey);
        if (savedScroll) {
            hasRestoredScroll.current[activeTab] = true;
            setTimeout(() => {
                window.scrollTo({ top: parseInt(savedScroll, 10), behavior: 'auto' });
            }, 50);
        } else {
            hasRestoredScroll.current[activeTab] = true;
        }
    }, [activeTab, followingPosts.length, discoverPosts.length, activeListFeed.length]);

    // Reset restore flag when user switches tabs, and save scroll position
    useEffect(() => {
        if (!activeTab) return;
        // When switching to a new tab, allow scroll restoration for that tab
        if (lastTab.current !== activeTab) {
            // Don't reset hasRestored — we handle this by tab key in the ref object above
            lastTab.current = activeTab;
            // Reset scroll for the new tab so restoration runs again
            hasRestoredScroll.current[activeTab] = false;
        }

        const scrollKey = `home_scroll_${activeTab}`;
        const handleScroll = () => {
            sessionStorage.setItem(scrollKey, window.scrollY.toString());
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [activeTab]);

    const handleTabChange = (tabId: string) => {
        dispatch(setActiveTab(tabId));
        const now = Date.now();

        if (tabId === 'following') {
            const isStale = (now - lastTimelineFetch) > RELOAD_TIMEOUT;
            if (followingPosts.length === 0 || isStale) {
                dispatch(fetchTimeline({ skip: 0 }));
            }
        } else if (tabId === 'discover') {
            const isStale = (now - lastDiscoverFetch) > RELOAD_TIMEOUT;
            if (discoverPosts.length === 0 || isStale) {
                dispatch(fetchDiscoverPosts({ skip: 0 }));
            }
        } else if (tabId.startsWith('list:')) {
            const listId = tabId.replace('list:', '');
            dispatch(fetchListFeed(listId));
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
        if (activeTab === 'following') {
            dispatch(fetchTimeline({ skip: followingPosts.length }));
        } else if (activeTab === 'discover') {
            dispatch(fetchDiscoverPosts({ skip: discoverPosts.length }));
        } else if (activeTab.startsWith('list:')) {
            const listId = activeTab.replace('list:', '');
            // activeListFeed doesn't properly paginate right now in listsSlice, it just fetches all
            dispatch(fetchListFeed(listId));
        } else {
            const currentFeedPosts = feedPosts[activeTab] || [];
            dispatch(fetchFeedPosts({ feedId: activeTab, skip: currentFeedPosts.length, take: 20 }));
        }
    };

    const pinnedCustomFeeds = subscribedFeeds
        .filter((f: FeedType) => f.handle !== 'following' && f.handle !== 'discover' && f.name !== 'Following' && f.name !== 'Discover' && f.isPinned)
        .sort((a: FeedType, b: FeedType) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));

    // Display feeds: Following, Discover, then pinned lists, then pinned sub feeds
    const tabs = useMemo(() => [
        { id: 'discover', label: t('nav.discover') },
        { id: 'following', label: t('nav.following') },
        ...pinnedLists.map((l: ListDto) => ({
            id: `list:${l.id}`,
            label: l.name
        })),
        ...pinnedCustomFeeds.slice(0, 10).map((f: FeedType) => ({
            id: f.id,
            label: f.name
        }))
    ], [pinnedCustomFeeds, pinnedLists, t]);

    // Ensure a valid tab is always selected
    useEffect(() => {
        if (tabs.length > 0) {
            const isValidTab = tabs.some(tab => tab.id === activeTab);
            if (!isValidTab || !activeTab) {
                dispatch(setActiveTab(tabs[0].id));
            }
        }
    }, [tabs, activeTab, dispatch]);

    return (
        <MainLayout hideTopBar={true} title={t('nav.home')}>
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

                        <button
                            onClick={() => navigate('/feeds')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full text-gray-700 dark:text-dark-text flex-shrink-0"
                            title={t('feeds.title')}
                        >
                            <FiHash size={24} />
                        </button>
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
                <div style={{ display: activeTab === 'discover' ? 'block' : 'none' }}>
                    <InterestsSection />
                    <Feed posts={discoverPosts} isLoading={discoverLoading} hasMore={discoverHasMore} onLoadMore={handleLoadMore} />
                </div>

                <div style={{ display: activeTab === 'following' ? 'block' : 'none' }}>
                    <Feed
                        posts={followingPosts}
                        isLoading={timelineLoading}
                        hasMore={timelineHasMore}
                        onLoadMore={handleLoadMore}
                        endMessage={t('feeds.following_end', 'Follow more people to get more content...')}
                        emptyMessage={t('feeds.follow_more_cta', 'Follow more accounts to see more content.')}
                    />
                </div>

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

                {/* Custom Feeds Panels */}
                {pinnedCustomFeeds.map((feed: FeedType) => (
                    <div key={feed.id} style={{ display: activeTab === feed.id ? 'block' : 'none' }}>
                        <Feed
                            posts={feedPosts[feed.id] || []}
                            isLoading={feedsLoading && activeTab === feed.id}
                            hasMore={feedHasMore[feed.id] !== false}
                            onLoadMore={handleLoadMore}
                        />
                    </div>
                ))}
            </div>
        </MainLayout>
    );
};

export default HomePage;
