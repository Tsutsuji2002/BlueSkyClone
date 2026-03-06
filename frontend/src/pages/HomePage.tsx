import React, { useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import InterestsSection from '../components/feed/InterestsSection';
import Feed from '../components/feed/Feed';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { setActiveTab, fetchSubscribedFeeds, fetchFeedPosts } from '../redux/slices/feedsSlice';
import { fetchTimeline, fetchTrendingPosts, fetchDiscoverPosts } from '../redux/slices/postsSlice';
import { RootState } from '../redux/store';
import { useNavigate } from 'react-router-dom';
import { FiHash, FiMenu, FiSettings } from 'react-icons/fi';
import { Feed as FeedType } from '../types';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import ButterflyLogo from '../components/common/ButterflyLogo';

const RELOAD_TIMEOUT = 5 * 60 * 1000; // 5 minutes

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const scrollPositions = React.useRef<Record<string, number>>({});
    const lastTab = React.useRef<string>('');
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
    const trendingPosts = useAppSelector((state: RootState) => state.posts.trendingPosts);

    useEffect(() => {
        // Fetch feeds first
        dispatch(fetchSubscribedFeeds());

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

    // Handle scroll persistence
    useEffect(() => {
        const handleTabSwitch = () => {
            // Save current position of the previous tab
            if (lastTab.current) {
                scrollPositions.current[lastTab.current] = window.scrollY;
            }

            // Update lastTab to the new activeTab
            lastTab.current = activeTab;

            // Restore position of the new tab in next tick (after DOM update)
            setTimeout(() => {
                const targetPos = scrollPositions.current[activeTab] || 0;
                window.scrollTo({ top: targetPos, behavior: 'auto' });
            }, 0);
        };

        handleTabSwitch();
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
        } else {
            const currentFeedPosts = feedPosts[activeTab] || [];
            dispatch(fetchFeedPosts({ feedId: activeTab, skip: currentFeedPosts.length, take: 20 }));
        }
    };

    const pinnedFeeds = subscribedFeeds
        .filter((f: FeedType) => f.handle !== 'following' && f.handle !== 'discover' && f.name !== 'Following' && f.name !== 'Discover' && f.isPinned)
        .sort((a: FeedType, b: FeedType) => (a.pinnedOrder || 0) - (b.pinnedOrder || 0));

    // Display feeds: Following, Discover, then top pinned feeds (up to 5 total)
    const tabs = [
        { id: 'following', label: t('nav.following') },
        { id: 'discover', label: t('nav.discover') },
        ...pinnedFeeds.slice(0, 10).map((f: FeedType) => ({
            id: f.id,
            label: f.name
        }))
    ];

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

                <div style={{ display: activeTab === 'discover' ? 'block' : 'none' }}>
                    <InterestsSection />
                    <Feed posts={discoverPosts} isLoading={discoverLoading} hasMore={discoverHasMore} onLoadMore={handleLoadMore} />
                </div>

                {pinnedFeeds.map((feed: FeedType) => (
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
