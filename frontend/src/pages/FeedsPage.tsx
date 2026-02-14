import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import {
    FiArrowLeft, FiSettings, FiPlus, FiSearch, FiRss,
    FiChevronRight, FiGrid, FiCheck, FiMenu, FiActivity, FiMapPin
} from 'react-icons/fi';
import FeedAvatar from '../components/common/FeedAvatar';
import { cn } from '../utils/classNames';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Feed } from '../types';
import IconButton from '../components/common/IconButton';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import {
    fetchSubscribedFeeds,
    fetchRecommendedFeeds,
    pinFeed,
    unpinFeed,
    searchFeeds,
    saveFeed,
    unsaveFeed
} from '../redux/slices/feedsSlice';
import { RootState } from '../redux/store';

const FeedsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [showMorePinned, setShowMorePinned] = useState(false);

    const {
        subscribedFeeds,
        searchResults,

        recommendedFeeds,
        actionLoading
    } = useAppSelector((state: RootState) => state.feeds);


    useEffect(() => {
        dispatch(fetchSubscribedFeeds());
        dispatch(fetchRecommendedFeeds()); // Fetch recommendations
    }, [dispatch]);

    useEffect(() => {
        if (searchQuery.length > 2) {
            const delayDebounceFn = setTimeout(() => {
                dispatch(searchFeeds({ query: searchQuery, skip: 0, take: 10 }));
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, dispatch]);



    const handlePinToggle = async (e: React.MouseEvent, feed: Feed) => {
        e.stopPropagation();
        if (feed.isPinned) {
            await dispatch(unpinFeed(feed.id));
        } else {
            await dispatch(pinFeed(feed.id));
        }
        dispatch(fetchSubscribedFeeds());
    };

    const handleSaveToggle = async (e: React.MouseEvent, feed: Feed) => {
        e.stopPropagation();
        if (feed.isSubscribed) {
            await dispatch(unsaveFeed(feed.id));
        } else {
            await dispatch(saveFeed(feed.id));
        }
        dispatch(fetchSubscribedFeeds());
        dispatch(fetchRecommendedFeeds()); // Refresh recommendations after interaction
    };

    return (
        <MainLayout hideTopBar={true} title={t('feeds.title')}>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => dispatch(openMobileMenu())}
                            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                        >
                            <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors hidden sm:block"
                        >
                            <FiArrowLeft size={20} className="dark:text-dark-text" />
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

                <div className="flex flex-col">
                    {/* My Feeds Section - THE PINNED LIST */}
                    <div className="p-4 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                                <FiGrid className="text-primary-500" size={20} />
                            </div>
                            <h2 className="font-bold text-gray-900 dark:text-dark-text">{t('feeds.my_feeds')}</h2>
                        </div>

                        <div className="space-y-1">
                            {subscribedFeeds.slice(0, showMorePinned ? undefined : 5).map((feed: Feed) => (
                                <div
                                    key={feed.id}
                                    onClick={() => navigate(`/feeds/${feed.id}`)}
                                    className="flex items-center justify-between p-3 hover:bg-white dark:hover:bg-dark-surface rounded-xl cursor-pointer transition-all border border-transparent hover:border-gray-100 dark:hover:border-dark-border group"
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <FeedAvatar
                                            src={feed.avatarUrl || feed.avatar}
                                            alt={feed.name}
                                            size="sm"
                                            className="rounded-md"
                                        />
                                        <span className="font-semibold text-gray-900 dark:text-dark-text truncate">
                                            {(feed.handle === 'following' || feed.name === 'Following') ? t('nav.following') : feed.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e: React.MouseEvent) => handlePinToggle(e, feed)}
                                            disabled={actionLoading[feed.id]}
                                            className={cn(
                                                "p-2 rounded-full transition-colors disabled:opacity-50",
                                                feed.isPinned ? "text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface"
                                            )}
                                        >
                                            <FiMapPin
                                                size={18}
                                                className={cn(feed.isPinned ? "fill-current" : "")}
                                                title={feed.isPinned ? t('feeds.unpin') : t('feeds.pin')}
                                            />
                                        </button>
                                        <FiChevronRight className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            ))}
                            {subscribedFeeds.length > 5 && (
                                <button
                                    onClick={() => setShowMorePinned(!showMorePinned)}
                                    className="w-full py-2 mt-2 text-sm font-bold text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors"
                                >
                                    {showMorePinned ? t('common.show_less') : t('common.show_more')}
                                </button>
                            )}
                            {subscribedFeeds.length === 0 && (
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary py-2 italic text-center">
                                    {t('feeds.no_saved_feeds')}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="sticky top-[73px] z-10 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md p-4 border-b border-gray-100 dark:border-dark-border">
                        <div className="relative group">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder={t('feeds.search_placeholder')}
                                value={searchQuery}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-100 dark:bg-dark-surface py-2.5 pl-12 pr-4 rounded-xl text-[15px] focus:bg-white dark:focus:bg-dark-bg border border-transparent focus:border-primary-500 outline-none transition-all dark:text-dark-text"
                            />
                        </div>
                    </div>

                    {/* Search Results */}
                    {searchQuery.length > 2 && (
                        <div className="flex flex-col">
                            <div className="px-4 py-2 bg-gray-50 dark:bg-dark-surface/5 text-[13px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                {t('feeds.search_results')}
                            </div>
                            {searchResults.map((feed: Feed) => (
                                <div
                                    key={feed.id}
                                    onClick={() => navigate(`/feeds/${feed.id}`)}
                                    className="p-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex gap-3 min-w-0">
                                            <FeedAvatar src={feed.avatarUrl || feed.avatar} alt={feed.name} />
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-gray-900 dark:text-dark-text hover:underline truncate">{feed.name}</span>
                                                <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">@{feed.handle}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary line-clamp-3 leading-relaxed mb-1 pl-[52px]">
                                        {feed.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Recommended Feeds (Only when not searching) */}
                    {searchQuery.length <= 2 && (
                        <div className="flex flex-col">
                            <div className="px-4 py-2 bg-gray-50 dark:bg-dark-surface/5 text-[13px] font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider flex items-center gap-2">
                                <FiActivity className="text-primary-500" /> {t('feeds.recommended_for_you')}
                            </div>

                            {recommendedFeeds.map((feed: Feed) => (
                                <div
                                    key={feed.id}
                                    onClick={() => navigate(`/feeds/${feed.id}`)}
                                    className="p-4 border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors cursor-pointer group"
                                >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex gap-3 min-w-0">
                                            <FeedAvatar src={feed.avatarUrl || feed.avatar} alt={feed.name} />
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-gray-900 dark:text-dark-text hover:underline truncate">
                                                    {feed.name}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                                    {t('profile.feed_by')} @{feed.handle}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e: React.MouseEvent) => handleSaveToggle(e, feed)}
                                            disabled={actionLoading[feed.id]}
                                            className={cn(
                                                "p-2 rounded-full transition-colors disabled:opacity-50",
                                                feed.isSubscribed ? "text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-surface"
                                            )}
                                        >
                                            {feed.isSubscribed ? <FiCheck size={20} /> : <FiPlus size={20} />}
                                        </button>
                                    </div>

                                    <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary line-clamp-3 leading-relaxed mb-1 pl-[52px]">
                                        {feed.description}
                                    </p>
                                    <div className="pl-[52px] flex items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-400 dark:text-dark-text-secondary font-medium px-2 py-0.5 bg-gray-100 dark:bg-dark-surface rounded-full">
                                            {feed.subscribersCount || feed.followersCount} {t('profile.followers')}
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {recommendedFeeds.length === 0 && (
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
        </MainLayout>
    );
};

export default FeedsPage;
