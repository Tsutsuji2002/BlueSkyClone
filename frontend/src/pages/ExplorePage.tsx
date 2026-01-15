import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { FiSearch, FiX, FiPlus, FiChevronRight, FiGrid, FiAtSign, FiMenu, FiCheck } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { Feed, TrendingAccount } from '../types';
import Avatar from '../components/common/Avatar';
import FeedAvatar from '../components/common/FeedAvatar';
import Button from '../components/common/Button';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { fetchTrending, fetchInterestsList } from '../redux/slices/trendingSlice';
import { fetchTrendingFeeds, pinFeed, unpinFeed, saveFeed, unsaveFeed, fetchSubscribedFeeds } from '../redux/slices/feedsSlice';

const ExplorePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { topics, accounts, interests } = useAppSelector((state: RootState) => state.trending);
    const { feeds, subscribedFeeds } = useAppSelector((state: RootState) => state.feeds);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    useEffect(() => {
        dispatch(fetchTrending());
        dispatch(fetchInterestsList());
        dispatch(fetchTrendingFeeds());
        dispatch(fetchSubscribedFeeds());

        const stored = localStorage.getItem('selected_interests');
        if (stored) {
            setSelectedInterests(JSON.parse(stored));
        }
    }, [dispatch]);

    const toggleInterest = (interest: string) => {
        const newSelection = selectedInterests.includes(interest)
            ? selectedInterests.filter(i => i !== interest)
            : [...selectedInterests, interest];

        setSelectedInterests(newSelection);
        localStorage.setItem('selected_interests', JSON.stringify(newSelection));
    };

    const handlePinToggle = async (e: React.MouseEvent, feed: Feed) => {
        e.stopPropagation();
        if (feed.isPinned) {
            await dispatch(unpinFeed(feed.id));
        } else {
            await dispatch(pinFeed(feed.id));
        }
        dispatch(fetchSubscribedFeeds());
    };

    return (
        <MainLayout hideTopBar={true}>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-4">
                    <button
                        onClick={() => dispatch(openMobileMenu())}
                        className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                    >
                        <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                    </button>
                    <div className="relative group flex-1">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={t('explore.search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-100 dark:bg-dark-surface py-3 pl-12 pr-4 rounded-xl text-[15px] focus:bg-white dark:focus:bg-dark-bg border border-transparent focus:border-primary-500 outline-none transition-all dark:text-dark-text"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6 p-4">
                    {/* Interests Section */}
                    <section className="bg-gray-50/50 dark:bg-dark-surface/30 rounded-2xl p-4 border border-gray-100 dark:border-dark-border relative">
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors">
                            <FiX size={20} />
                        </button>

                        <div className="flex items-center gap-2 mb-4 text-primary-600 dark:text-primary-400">
                            <FiGrid size={20} />
                            <h2 className="text-lg font-bold">{t('explore.interests')}</h2>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {interests.map((interest, index) => {
                                const isSelected = selectedInterests.includes(interest);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => toggleInterest(interest)}
                                        className={cn(
                                            "px-4 py-1.5 rounded-full border text-sm font-medium transition-all shadow-sm",
                                            isSelected
                                                ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400'
                                                : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:border-primary-500 hover:text-primary-500 dark:hover:text-primary-400'
                                        )}
                                    >
                                        {interest}
                                    </button>
                                );
                            })}
                        </div>

                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4">
                            {t('explore.interests_desc')}
                        </p>

                        <button
                            onClick={() => navigate('/interests')}
                            className="w-full py-2.5 rounded-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm transition-colors mb-2"
                        >
                            {t('explore.edit_interests')}
                        </button>
                    </section>

                    {/* Trending Section */}
                    <section className="flex flex-col">
                        {accounts.map((item, index) => (
                            <div
                                key={item.id}
                                onClick={() => navigate(`/profile/user/${item.id}`)}
                                className="flex items-center gap-4 py-4 px-2 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer border-b border-gray-100 dark:border-dark-border last:border-0"
                            >
                                <span className="text-lg font-bold text-gray-400 w-6">
                                    {index + 1}.
                                </span>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                {item.displayName}
                                            </span>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-secondary mt-0.5">
                                                <div className="flex -space-x-2">
                                                    {item.followersAvatars.map((url, i) => (
                                                        <img key={i} src={url} alt="" className="w-4 h-4 rounded-full border border-white dark:border-dark-bg" />
                                                    ))}
                                                </div>
                                                <span>{item.postsCount} {t('profile.posts_stat')} · {item.category}</span>
                                            </div>
                                        </div>

                                        {item.isPromoted ? (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 text-[11px] font-bold border border-red-100 dark:border-red-900/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                {t('explore.promoted')}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-gray-400 dark:text-dark-text-secondary">
                                                {item.hoursAgo ? t('common.hours_ago', { count: item.hoursAgo }) : item.timeAgo}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>

                    {/* Discover Feeds Section */}
                    <section className="flex flex-col gap-4 mt-2">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                                <span className="p-1 px-2 border-2 border-primary-500 rounded text-xs font-bold">Ξ</span>
                                <h2 className="text-lg font-bold">{t('feeds.discover_new')}</h2>
                            </div>
                            <FiSearch className="text-gray-400" size={20} />
                        </div>

                        <div className="flex flex-col gap-4">
                            {feeds.map((feed: Feed) => (
                                <div
                                    key={feed.id}
                                    onClick={() => navigate(`/feeds/${feed.id}`)}
                                    className="flex flex-col gap-3 p-4 rounded-2xl border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-all cursor-pointer shadow-sm group"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex gap-3 min-w-0">
                                            <FeedAvatar
                                                src={feed.avatarUrl || feed.avatar}
                                                alt={feed.name}
                                                size="lg"
                                            />
                                            <div className="flex flex-col min-w-0 mt-0.5">
                                                <span className="font-bold text-gray-900 dark:text-dark-text hover:underline truncate">
                                                    {feed.name}
                                                </span>
                                                <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate mt-0.5">
                                                    {t('profile.feed_by')} @{feed.handle}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handlePinToggle(e, feed)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap shadow-md",
                                                feed.isPinned
                                                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 shadow-none"
                                                    : "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/20"
                                            )}
                                        >
                                            {feed.isPinned ? (
                                                <>
                                                    <FiCheck size={16} />
                                                    {t('feeds.pinned')}
                                                </>
                                            ) : (
                                                <>
                                                    <FiPlus size={16} />
                                                    {t('feeds.pin_feed')}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-3 leading-relaxed">
                                        {feed.description}
                                    </p>

                                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary group-hover:text-gray-600 dark:group-hover:text-dark-text-secondary/80 transition-colors">
                                        {t('feeds.liked_by', { count: feed.followersCount || 0 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </MainLayout>
    );
};

export default ExplorePage;
