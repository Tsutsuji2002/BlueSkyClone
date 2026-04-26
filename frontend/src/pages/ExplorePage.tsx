import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { FiSearch, FiX, FiPlus, FiGrid, FiMenu, FiCheck, FiRefreshCw } from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';

import { useTranslation } from 'react-i18next';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { cn } from '../utils/classNames';
import { Feed } from '../types';
import FeedAvatar from '../components/common/FeedAvatar';
import Avatar from '../components/common/Avatar';
import UserHoverCard from '../components/common/UserHoverCard';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { fetchTrending, fetchInterestsList } from '../redux/slices/trendingSlice';
import { fetchTrendingFeeds, pinFeed, unpinFeed, fetchSubscribedFeeds } from '../redux/slices/feedsSlice';
import { fetchDiscoverPosts } from '../redux/slices/postsSlice';
import PostCard from '../components/feed/PostCard';
import PostSkeleton from '../components/feed/PostSkeleton';
import SuggestedUsersForExplore from '../components/explore/SuggestedUsersForExplore';
import api from '../utils/api';
import InterestsEditor from '../components/feed/InterestsEditor';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { feedActionKey } from '../utils/feedKeys';

const ExplorePage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { accounts, interests, topics } = useAppSelector((state: RootState) => state.trending);
    const { feeds } = useAppSelector((state: RootState) => state.feeds);
    const { discoverPosts, discoverHasMore, discoverLoading } = useAppSelector((state: RootState) => state.posts);
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isSearchUIActive, setIsSearchUIActive] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);
    const observerTarget = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        dispatch(fetchTrending());
        dispatch(fetchInterestsList());
        dispatch(fetchTrendingFeeds());
        dispatch(fetchSubscribedFeeds());
        dispatch(fetchDiscoverPosts({ skip: 0 }));
    }, [dispatch]);

    // Infinite Scroll Observer for Discover Posts
    useEffect(() => {
        if (!discoverHasMore || discoverLoading) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    dispatch(fetchDiscoverPosts({ skip: discoverPosts.length }));
                }
            },
            { threshold: 1.0 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [dispatch, discoverHasMore, discoverLoading, discoverPosts.length]);

    const handleRefreshPosts = () => {
        dispatch(fetchDiscoverPosts({ skip: 0 }));
    };


    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setResults([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            if (query.startsWith('@')) {
                const userQuery = query.slice(1);
                if (userQuery.length > 0) {
                    const response = await api.search.users(userQuery);
                    setResults((response.data || []).map((u: any) => ({ ...u, _type: 'user' })));
                } else {
                    setResults([]);
                }
            } else {
                const [usersRes, feedsRes] = await Promise.all([
                    api.search.users(query, 0, 5),
                    api.search.feeds(query, 0, 5)
                ]);

                const combined = [
                    ...(usersRes.data || []).map((u: any) => ({ ...u, _type: 'user' })),
                    ...(feedsRes.data || []).map((f: any) => ({ ...f, _type: 'feed' }))
                ];
                setResults(combined);
            }
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                handleSearch(searchQuery);
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleResultClick = (result: any) => {
        if (result._type === 'feed') {
            const fk = feedActionKey(result as Feed);
            navigate(`/feeds/${encodeURIComponent(fk)}`);
        } else {
            navigate(`/profile/${result.handle}`);
        }
        setSearchQuery('');
        setShowResults(false);
        setIsSearchUIActive(false);
    };

    const handleCancelSearch = () => {
        setIsSearchUIActive(false);
        setSearchQuery('');
        setResults([]);
        setShowResults(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
            setShowResults(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults([]);
        setShowResults(false);
        if (searchInputRef.current) searchInputRef.current.focus();
    };


    const handlePinToggle = async (e: React.MouseEvent, feed: Feed) => {
        e.stopPropagation();
        const key = feedActionKey(feed);
        if (feed.isPinned) {
            await dispatch(unpinFeed(key));
        } else {
            await dispatch(pinFeed(key));
        }
        dispatch(fetchSubscribedFeeds());
    };

    useEffect(() => {
        if (isSearchUIActive && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearchUIActive]);

    useDocumentTitle(t('nav.explore'));

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-40 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-4">
                    {!isSearchUIActive && (
                        <button
                            onClick={() => dispatch(openMobileMenu())}
                            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                        >
                            <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                        </button>
                    )}
                    <div className="relative group flex-1" ref={searchRef}>
                        <div className="relative flex items-center gap-3">
                            <div className="relative flex-1">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder={t('explore.search_placeholder')}
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setShowResults(true);
                                    }}
                                    onFocus={() => {
                                        setShowResults(true);
                                        // setIsSearchUIActive(true); // Don't auto-activate unless clicked from feeds? 
                                        // Actually, let's make it consistent.
                                    }}
                                    onKeyDown={handleKeyDown}
                                    className="w-full bg-gray-100 dark:bg-dark-surface py-3 pl-12 pr-10 rounded-xl text-[15px] focus:bg-white dark:focus:bg-dark-bg border border-transparent focus:border-primary-500 outline-none transition-colors dark:text-dark-text"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={clearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                    >
                                        <FiX size={16} />
                                    </button>
                                )}
                            </div>
                            {isSearchUIActive && (
                                <button 
                                    onClick={handleCancelSearch}
                                    className="text-primary-500 font-medium hover:underline px-1"
                                >
                                    {t('common.cancel', { defaultValue: 'Cancel' })}
                                </button>
                            )}
                        </div>

                        {/* Dropdown Results */}
                        {showResults && !isSearchUIActive && (searchQuery.trim() || loading) && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden min-h-[100px] max-h-[80vh] flex flex-col">
                                <div className="p-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/50">
                                    <p className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                                        {t('search.searching_for', { defaultValue: 'Searching for "{{query}}"', query: searchQuery })}
                                    </p>
                                </div>

                                <div className="overflow-y-auto flex-1">
                                    {loading ? (
                                        <div className="p-8 flex justify-center">
                                            <LoadingIndicator size="md" />
                                        </div>
                                    ) : results.length > 0 ? (
                                        <div className="py-2">
                                            {results.map((result) => (
                                                <button
                                                    key={result.id}
                                                    onClick={() => handleResultClick(result)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors text-left"
                                                >
                                                    {result._type === 'feed' ? (
                                                        <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl">
                                                            {result.avatarUrl || result.avatar ? (
                                                                <img src={result.avatarUrl || result.avatar} alt="" className="w-full h-full rounded-lg object-cover" />
                                                            ) : (
                                                                result.name?.[0] || 'F'
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <UserHoverCard user={result}>
                                                            <div onClick={(e) => { e.stopPropagation(); handleResultClick(result); }}>
                                                                <Avatar
                                                                    src={result.avatarUrl || result.avatar}
                                                                    alt={result.displayName}
                                                                    size="md"
                                                                />
                                                            </div>
                                                        </UserHoverCard>
                                                    )}
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                            {result._type === 'feed' ? result.name : (
                                                                <UserHoverCard user={result}>
                                                                    <span>{result.displayName}</span>
                                                                </UserHoverCard>
                                                            )}
                                                        </p>
                                                        <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                            {result._type === 'feed' ? (
                                                                <>Feed · @{result.handle}</>
                                                            ) : (
                                                                <>@{result.handle}</>
                                                            )}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : searchQuery.trim() ? (
                                        <div className="p-8 text-center text-gray-500 dark:text-dark-text-secondary cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface"
                                            onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery)}`)}>
                                            <p className="font-medium text-primary-500">{t('search.goto_search', { defaultValue: 'Search all for "{{query}}"', query: searchQuery })}</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-6 p-4">
                    {isSearchUIActive ? (
                        <section className="flex flex-col">
                            {searchQuery.trim() && (
                                <div className="mb-4">
                                    <h3 className="text-sm font-bold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider px-2">
                                        {t('search.results_for', { defaultValue: 'Search for "{{query}}"', query: searchQuery })}
                                    </h3>
                                </div>
                            )}

                            <div className="flex flex-col">
                                {loading ? (
                                    <div className="p-8 flex justify-center">
                                        <LoadingIndicator size="md" />
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="flex flex-col">
                                        {results.map((result) => (
                                            <button
                                                key={result.id || result.did || result.handle}
                                                onClick={() => handleResultClick(result)}
                                                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors text-left border-b border-gray-100 dark:border-dark-border last:border-0"
                                            >
                                                {result._type === 'feed' ? (
                                                    <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold text-xl flex-shrink-0">
                                                        {result.avatarUrl || result.avatar ? (
                                                            <img src={result.avatarUrl || result.avatar} alt="" className="w-full h-full rounded-lg object-cover" />
                                                        ) : (
                                                            result.name?.[0] || 'F'
                                                        )}
                                                    </div>
                                                ) : (
                                                    <UserHoverCard user={result}>
                                                        <div onClick={(e) => { e.stopPropagation(); handleResultClick(result); }}>
                                                            <Avatar
                                                                src={result.avatarUrl || result.avatar}
                                                                alt={result.displayName}
                                                                size="lg"
                                                            />
                                                        </div>
                                                    </UserHoverCard>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1">
                                                        <p className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                            {result._type === 'feed' ? result.name : (
                                                                <UserHoverCard user={result}>
                                                                    <span>{result.displayName}</span>
                                                                </UserHoverCard>
                                                            )}
                                                        </p>
                                                        {result.isVerified && <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={14} />}
                                                    </div>
                                                    <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                        {result._type === 'feed' ? (
                                                            <>Feed · @{result.handle}</>
                                                        ) : (
                                                            <>@{result.handle}</>
                                                        )}
                                                    </p>
                                                    {result.bio && (
                                                        <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary line-clamp-1 mt-0.5">
                                                            {result.bio}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                {result._type === 'user' && (currentUser?.id !== result.id) && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Optional: add follow toggle here if needed, but the card has it
                                                        }}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-full text-sm font-bold border",
                                                            result.isFollowing 
                                                                ? "border-gray-300 dark:border-dark-border text-gray-900 dark:text-dark-text"
                                                                : "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                                                        )}
                                                    >
                                                        {result.isFollowing ? t('profile.following') : t('profile.follow')}
                                                    </button>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : searchQuery.trim() ? (
                                    <div className="p-12 text-center text-gray-500 dark:text-dark-text-secondary">
                                        <p>{t('search.no_results', { defaultValue: 'No results found for "{{query}}"', query: searchQuery })}</p>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-gray-500 dark:text-dark-text-secondary">
                                        <p>{t('search.start_typing', { defaultValue: 'Search for posts, users, or feeds' })}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    ) : (
                        <>
                    {/* Interests Section */}
                    <section className="flex flex-col relative px-2">
                        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors">
                            <FiX size={20} />
                        </button>

                        <div className="flex items-center gap-2 mb-3 text-primary-500">
                            <FiGrid size={18} />
                            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">{t('explore.your_interests', { defaultValue: 'Your interests' })}</h2>
                        </div>

                        <div className="mb-4">
                            <InterestsEditor variant="full" limit={18} />
                        </div>

                        <p className="text-[14px] text-gray-900 dark:text-gray-100 mb-4 font-medium">
                            {t('explore.your_interests_desc', { defaultValue: 'Your interests help us find what you like!' })}
                        </p>

                        <button
                            onClick={() => navigate('/interests')}
                            className="w-full py-2.5 rounded-full bg-[#0085ff] hover:bg-[#0070d6] text-white font-bold text-[15px] transition-colors mb-2"
                        >
                            {t('explore.edit_interests', { defaultValue: 'Edit interests' })}
                        </button>
                    </section>

                    {/* Trending Section */}
                    <section className="flex flex-col border-b border-gray-200 dark:border-dark-border pb-4">
                        {topics.length === 0 ? (
                            <LoadingIndicator text={t('explore.loading_topics', { defaultValue: 'Loading trending topics...' })} />
                        ) : topics.slice(0, 5).map((item, index) => {
                            const hashtagStr = item.hashtag || (item as any).topic || item.id || '';
                            // Generate stable mock values to match exact UI screenshot
                            let hash = 0;
                            for (let i = 0; i < hashtagStr.length; i++) hash = hashtagStr.charCodeAt(i) + ((hash << 5) - hash);
                            const hours = (Math.abs(hash) % 12) + 1;
                            const timeAgo = `${hours}h ago`;
                            
                            // Get some avatars from accounts to mock the overlap if available, otherwise fallback
                            const mockAvatars = accounts.length >= 3 
                                ? accounts.slice(index % accounts.length, (index % accounts.length) + 3).map((a: any) => a.avatar || `https://ui-avatars.com/api/?name=${a.displayName || 'U'}&background=random`)
                                : [
                                    `https://ui-avatars.com/api/?name=${hashtagStr.charAt(0) || 'A'}&background=random`,
                                    `https://ui-avatars.com/api/?name=${hashtagStr.charAt(1) || 'B'}&background=random`,
                                    `https://ui-avatars.com/api/?name=${hashtagStr.charAt(2) || 'C'}&background=random`
                                  ];

                            return (
                                <div
                                    key={item.id || index}
                                    onClick={() => {
                                        if (item.link) {
                                            navigate(item.link);
                                        } else {
                                            navigate(`/search?q=${encodeURIComponent(hashtagStr)}`);
                                        }
                                    }}
                                    className="flex items-start gap-3 py-3 px-4 hover:bg-gray-50 dark:hover:bg-dark-surface/30 transition-colors cursor-pointer border-b border-gray-100 dark:border-dark-border last:border-0"
                                >
                                    <span className="text-[15px] font-bold text-gray-900 dark:text-white w-5 text-left mt-0.5">
                                        {index + 1}.
                                    </span>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2">
                                            <span className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
                                                {hashtagStr.replace('#', '')}
                                            </span>
                                            
                                            {index === 0 ? (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#3e141a] dark:bg-[#3e141a] text-[#ef4444] text-[11px] font-bold shrink-0 self-start">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M12 2C12 2 12 10 18 13C22 15 23 20 20 23C17 26 12 25 10 21C8 17 9 14 9 14C9 14 6 17 5 19C4 21 0 17 2 12C4 7 12 2 12 2Z" />
                                                    </svg>
                                                    Hot
                                                </span>
                                            ) : (
                                                <span className="px-2 py-[3px] rounded-full bg-gray-200 dark:bg-[#202E39] text-gray-600 dark:text-[#8b98a5] text-[12px] shrink-0 font-medium">
                                                    {timeAgo}
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-[13px] text-gray-500 dark:text-[#8b98a5] mt-1">
                                            <div className="flex -space-x-1.5 grayscale shrink-0">
                                                {mockAvatars.map((url, i) => (
                                                    <img key={i} src={url} alt="" className="w-4 h-4 rounded-full border border-white dark:border-dark-bg object-cover" />
                                                ))}
                                            </div>
                                            <span className="truncate">{item.category || 'Topic'}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    {/* Discover Feeds Section */}
                    <section className="flex flex-col gap-4 mt-2">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
                                <span className="p-1 px-2 border-2 border-primary-500 rounded text-xs font-bold">Ξ</span>
                                <h2 className="text-lg font-bold">{t('feeds.discover_new_feeds')}</h2>
                            </div>
                            <button 
                                onClick={() => setIsSearchUIActive(true)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                            >
                                <FiSearch className="text-gray-400" size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-4">
                             {feeds.map((feed: Feed) => (
                                <div
                                    key={feedActionKey(feed)}
                                    onClick={() => {
                                        navigate(`/feeds/${encodeURIComponent(feedActionKey(feed))}`);
                                    }}
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
                    
                    <SuggestedUsersForExplore />

                    {/* Discover Posts Section */}
                    <section className="flex flex-col mt-4">
                        <div className="flex items-center justify-between px-2 mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">{t('explore.discover_posts', { defaultValue: 'Discover Posts' })}</h2>
                            <button
                                onClick={handleRefreshPosts}
                                disabled={discoverLoading}
                                className="p-2 text-gray-500 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-full transition-colors disabled:opacity-50"
                                title={t('common.refresh', { defaultValue: 'Refresh' })}
                            >
                                <FiRefreshCw size={18} className={discoverLoading ? 'animate-spin' : ''} />
                            </button>
                        </div>
                        
                        <div className="flex flex-col border-t border-gray-100 dark:border-dark-border">
                            {discoverPosts.map((post) => (
                                <div key={post.uri} className="border-b border-gray-100 dark:border-dark-border last:border-0">
                                    <PostCard post={post} />
                                </div>
                            ))}
                            
                            {discoverLoading && (
                                <div className="py-4">
                                    <PostSkeleton />
                                    <PostSkeleton />
                                </div>
                            )}
                            
                            {discoverHasMore && !discoverLoading && (
                                <div ref={observerTarget} className="h-10" />
                            )}
                            
                            {!discoverHasMore && discoverPosts.length > 0 && (
                                <div className="py-8 text-center text-gray-500 dark:text-dark-text-secondary text-sm font-medium">
                                    {t('explore.no_more_posts', { defaultValue: 'No more posts to discover right now.' })}
                                </div>
                            )}
                        </div>
                    </section>
                        </>
                    )}
                </div>
            </div>

    );
};

export default ExplorePage;
