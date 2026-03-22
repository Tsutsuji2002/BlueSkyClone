import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useNavigationType } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Feed from '../components/feed/Feed';
import { FiArrowLeft, FiMoreHorizontal, FiHeart, FiMapPin, FiRss } from 'react-icons/fi';
import FeedAvatar from '../components/common/FeedAvatar';
import { cn } from '../utils/classNames';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchFeedPosts, fetchSubscribedFeeds, fetchFeedInfo, saveFeed, unsaveFeed } from '../redux/slices/feedsSlice';
import { RootState } from '../redux/store';
import { Feed as FeedType } from '../types';

const FeedDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const navType = useNavigationType();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { subscribedFeeds, feedPosts, isLoading, feedHasMore, recommendedFeeds, searchResults, feeds, actionLoading: feeds_actionLoading, infoLoading, infoError } = useAppSelector((state: RootState) => state.feeds);

    const take = 20;

    const feed = subscribedFeeds.find((f: FeedType) => f.id?.toLowerCase() === id?.toLowerCase()) ||
        recommendedFeeds.find((f: FeedType) => f.id?.toLowerCase() === id?.toLowerCase()) ||
        searchResults.find((f: FeedType) => f.id?.toLowerCase() === id?.toLowerCase()) ||
        feeds.find((f: FeedType) => f.id?.toLowerCase() === id?.toLowerCase());

    const count = feed ? (feed.subscribersCount || feed.followersCount || 0) : 0;
    const posts = id ? feedPosts[id] || [] : [];

    useDocumentTitle(feed?.name || t('feeds.title'));

    useEffect(() => {
        if (subscribedFeeds.length === 0) {
            dispatch(fetchSubscribedFeeds());
        }
        
        const feedId = id?.toLowerCase();
        if (feedId && !feed && infoLoading[feedId] === undefined) {
            console.log('FeedDetailPage: Fetching info for missing feed:', feedId);
            dispatch(fetchFeedInfo(feedId));
        }
    }, [dispatch, subscribedFeeds.length, id, feed, infoLoading]);

    console.log('FeedDetailPage: Current State', { 
        id, 
        feedName: feed?.name,
        isFound: !!feed,
        isLoading: id ? infoLoading[id.toLowerCase()] : false, 
        error: id ? infoError[id.toLowerCase()] : null 
    });

    useEffect(() => {
        if (id) {
            dispatch(fetchFeedPosts({ feedId: id, skip: 0, take }));
        }
    }, [dispatch, id]);

    const handleLoadMore = () => {
        if (id) {
            dispatch(fetchFeedPosts({ feedId: id, skip: posts.length, take }));
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

    const currentId = id?.toLowerCase();
    if (!feed && currentId && infoLoading[currentId] === false && infoError[currentId]) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('feeds.not_found')}
                </h2>
                <p className="text-sm text-gray-500 mb-4">{infoError[currentId]}</p>
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
                {/* Fallback link if loading takes too long */}
                <button 
                   onClick={() => id && dispatch(fetchFeedInfo(id))}
                   className="mt-4 text-xs text-primary-500 opacity-50 hover:opacity-100"
                >
                    Retry loading
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg">
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
                                    <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                        <FiHeart className="fill-current text-gray-400" size={12} />
                                        <span className="font-medium">
                                            {count >= 1000 ? `${(count / 1000).toFixed(1)}K` : count} Likers
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <button className="p-2.5 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors group">
                                <FiMoreHorizontal size={20} className="text-gray-700 dark:text-dark-text" />
                            </button>
                            <button className={cn(
                                "p-2.5 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors",
                                feed.isPinned ? "text-primary-500" : "text-gray-700 dark:text-dark-text"
                            )}>
                                <FiMapPin size={20} className={feed.isPinned ? "fill-current" : ""} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Feed Info Card - Designed like a special post */}
                <div className="border-b border-gray-100 dark:border-dark-border px-4 py-4 bg-white dark:bg-dark-bg">
                    <div className="flex gap-3 mb-4">
                        <FeedAvatar
                            src={feed.avatarUrl || feed.avatar}
                            alt={feed.name}
                            size="lg"
                            className="rounded-xl flex-shrink-0"
                        />
                        <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex flex-col min-w-0">
                                    <span className="font-black text-gray-900 dark:text-dark-text text-[15px] truncate">
                                        {feed.name}
                                    </span>
                                    <span className="text-gray-500 dark:text-dark-text-secondary text-[14px] truncate">
                                        @{feed.handle}
                                    </span>
                                </div>
                                <button
                                    onClick={async () => {
                                        if (feed.isSubscribed) {
                                            await dispatch(unsaveFeed(feed.id));
                                        } else {
                                            await dispatch(saveFeed(feed.id));
                                        }
                                        dispatch(fetchSubscribedFeeds());
                                        if (id) dispatch(fetchFeedInfo(id));
                                    }}
                                    disabled={feeds_actionLoading[feed.id]}
                                    className={cn(
                                        "px-5 py-1.5 rounded-full text-sm font-bold transition-all shadow-sm flex-shrink-0 disabled:opacity-50",
                                        feed.isSubscribed
                                            ? "bg-gray-100 dark:bg-dark-surface text-gray-700 dark:text-dark-text border border-gray-200 dark:border-dark-border"
                                            : "bg-primary-500 hover:bg-primary-600 text-white"
                                    )}
                                >
                                    {feed.isSubscribed ? t('feeds.subscribed') : t('feeds.subscribe')}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Feed "Pinned Post" Content Style */}
                    <div className="flex flex-col bg-gray-50 dark:bg-dark-surface/30 rounded-2xl overflow-hidden border border-gray-100 dark:border-dark-border mt-2">
                        {/* Placeholder for Banner Image since it's not in the DB, using a gradient for now */}
                        <div className="h-40 w-full bg-gradient-to-br from-primary-400 to-indigo-600 flex items-center justify-center p-6 text-center">
                            <div className="text-white">
                                <h2 className="text-2xl font-black mb-1 uppercase tracking-tighter uppercase">{feed.name}</h2>
                                <p className="text-white/80 font-bold">@{feed.handle}</p>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-black text-gray-900 dark:text-dark-text text-lg mb-2">
                                {feed.name} - BlueSky Feed
                            </h3>
                            <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary leading-normal">
                                {feed.description || "A custom community feed for BlueSky."}
                            </p>
                            <div className="flex items-center gap-4 mt-4 py-3 border-t border-gray-100 dark:border-dark-border">
                                <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                    <FiHeart size={14} className="text-red-500 fill-red-500" />
                                    <span className="font-bold text-gray-900 dark:text-dark-text">
                                        {count.toLocaleString()}
                                    </span>
                                    <span>{t('profile.followers')}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                    <FiRss size={14} className="text-primary-500" />
                                    <span className="font-bold text-gray-900 dark:text-dark-text">
                                        Active Feed
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

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
                                posts={posts} 
                                isLoading={isLoading}
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
