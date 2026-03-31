import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX, FiPlus, FiChevronRight } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import api from '../../utils/api';
import Avatar from '../common/Avatar';
import { BsPatchCheckFill } from 'react-icons/bs';
import LoadingIndicator from '../common/LoadingIndicator';

import TrendingSection from './TrendingSection';
import OnboardingCard from './OnboardingCard';
import { feedActionKey } from '../../utils/feedKeys';
import { cn } from '../../utils/classNames';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { fetchSubscribedFeeds } from '../../redux/slices/feedsSlice';

const RightSidebar: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const { user, isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (user) {
            dispatch(fetchSubscribedFeeds());
        }
    }, [dispatch, user]);

    const supportLink = user
        ? `/support?email=${encodeURIComponent(`${user.username}@gmail.com`)}&username=${encodeURIComponent(user.handle)}`
        : '/support';

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
            navigate(`/feeds/${result.id}`);
        } else {
            navigate(`/profile/${result.handle}`);
        }
        setSearchQuery('');
        setShowResults(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
            setShowResults(false);
        }
    };

    const { feeds, subscribedFeeds, pinnedFeedIds } = useAppSelector((state: RootState) => state.feeds);

    const pinnedFeeds = useMemo(() => {
        if (!isAuthenticated) {
            return [
                { id: 'discover', uri: 'discover', name: t('nav.discover', { defaultValue: 'Discover' }), isPinned: true },
                { id: 'hot', uri: 'hot', name: 'Hot', isPinned: true },
                { id: 'science', uri: 'science', name: 'Science', isPinned: true }
            ];
        }
        const allFeeds = [...feeds, ...subscribedFeeds];
        return pinnedFeedIds
            .map(id => {
                // Special case for built-in feeds if they are in pinnedFeedIds but not in the lists
                if (id === 'following') {
                    return { id: 'following', uri: 'following', name: t('feeds.following', { defaultValue: 'Following' }), isPinned: true };
                }
                return allFeeds.find(f => feedActionKey(f) === id || f.id === id || f.uri === id);
            })
            .filter(Boolean)
            .slice(0, 10);
    }, [feeds, subscribedFeeds, pinnedFeedIds, t, isAuthenticated]);

    const handleFeedClick = (feed: any) => {
        if (feedActionKey(feed) === 'following') {
            navigate('/');
        } else {
            navigate(`/feeds/${encodeURIComponent(feedActionKey(feed))}`);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults([]);
        setShowResults(false);
    };

    return (
        <div className="flex flex-col gap-4 w-[330px] h-screen sticky top-0 py-[20px] pr-[2px] pb-[20px] pl-[28px] overflow-y-auto no-scrollbar">
            {/* Search Bar Container */}
            <div className="relative w-full group" ref={searchRef}>
                <div className="flex items-center gap-3 px-3 py-2 bg-gray-100/80 dark:bg-[#19222e] rounded-full border border-transparent focus-within:border-primary-500 transition-colors">
                    <FiSearch className="text-gray-400 dark:text-[#667b99] flex-shrink-0" size={18} />
                    <input
                        type="text"
                        placeholder={t('sidebar.search_placeholder', { defaultValue: 'Search' })}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        onKeyDown={handleKeyDown}
                        className="bg-transparent border-none outline-none text-[15px] text-gray-900 dark:text-white w-full placeholder-gray-400 dark:placeholder-[#667b99] py-1"
                    />
                    {searchQuery && (
                        <button onClick={clearSearch} className="text-gray-500 dark:text-[#667b99] hover:text-gray-700 dark:hover:text-white">
                            <FiX size={16} />
                        </button>
                    )}
                </div>

                {/* Dropdown Results */}
                {showResults && (searchQuery.trim() || loading) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden min-h-[100px] max-h-[80vh] flex flex-col">
                        <div className="p-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/50">
                            <p className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                                {t('search.searching_for', { defaultValue: 'Search for "{{query}}"', query: searchQuery })}
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
                                                <Avatar
                                                    src={result.avatarUrl || result.avatar}
                                                    alt={result.displayName}
                                                    size="md"
                                                />
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-dark-text truncate flex items-center gap-0.5">
                                                    {result._type === 'feed' ? result.name : result.displayName}
                                                    {result.isVerified && (
                                                        <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
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

            {/* Pinned Feeds - Only for Logged In Users */}
            {isAuthenticated && (
                <div className="flex flex-col gap-[2px]">
                    {pinnedFeeds.map((feed: any) => {
                        const name = feed.name?.toLowerCase() || '';
                        const isFollowing = feedActionKey(feed) === 'following';
                        const isNews = name.includes('news');
                        const isScience = name.includes('science');
                        const isDiscover = name.includes('discover') || name.includes('hot');

                        return (
                            <button
                                key={feedActionKey(feed)}
                                onClick={() => handleFeedClick(feed)}
                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left group"
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-[4px] flex-shrink-0 flex items-center justify-center overflow-hidden",
                                    isFollowing || isScience || isDiscover ? "bg-primary-500" : (isNews ? "bg-gray-500 dark:bg-[#405168]" : "bg-gray-200 dark:bg-[#111822]")
                                )}>
                                    {isFollowing ? (
                                        <svg fill="none" viewBox="0 0 24 24" width="14" height="14">
                                            <path fill="#FFFFFF" d="M7.002 5a1 1 0 0 0-2 0v11.587l-1.295-1.294a1 1 0 0 0-1.414 1.414l3.002 3a1 1 0 0 0 1.414 0l2.998-3a1 1 0 0 0-1.414-1.414l-1.291 1.292V5ZM16 16a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-4Zm-3-4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2h-6a1 1 0 0 1-1-1Zm-1-6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-8Z" />
                                        </svg>
                                    ) : isNews ? (
                                        <svg fill="none" viewBox="0 0 24 24" width="12" height="12">
                                            <path fill="#FFFFFF" d="M19 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-5 10H7a1 1 0 1 1 0-2h7a1 1 0 1 1 0 2Zm3-4H7a1 1 0 1 1 0-2h10a1 1 0 1 1 0 2Z" />
                                        </svg>
                                    ) : isScience ? (
                                        <svg fill="none" viewBox="0 0 24 24" width="12" height="12">
                                            <path fill="#FFFFFF" d="M18.5 20h-13a.5.5 0 0 1-.41-.787L11 10.158V4.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v5.658l5.91 9.055a.5.5 0 0 1-.41.787ZM12 4v6.5a.5.5 0 0 1-.09.287L7.02 18h9.96l-4.89-7.213a.5.5 0 0 1-.09-.287V4h-1Z" />
                                        </svg>
                                    ) : isDiscover ? (
                                        <svg fill="none" viewBox="0 0 24 24" width="12" height="12">
                                            <path fill="#FFFFFF" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 0 1-2.827 0l-4.244-4.243a8 8 0 1 1 11.314 0zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
                                        </svg>
                                    ) : (
                                        feed.avatar || feed.avatarUrl ? (
                                            <img src={feed.avatar || feed.avatarUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-500 dark:text-[#a5b2c5]">
                                                {feed.name?.[0].toUpperCase()}
                                            </span>
                                        )
                                    )}
                                </div>
                                <span className="text-[15px] font-normal text-gray-900 dark:text-white truncate group-hover:underline transition-all">
                                    {feed.name}
                                </span>
                            </button>
                        );
                    })}

                    <button
                        onClick={() => navigate('/feeds')}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-left group"
                    >
                        <div className="w-5 h-5 rounded-[4px] bg-gray-100 dark:bg-[#19222e] flex-shrink-0 flex items-center justify-center">
                            <FiPlus size={16} className="text-gray-500 dark:text-[#a5b2c5]" />
                        </div>
                        <span className="text-[15px] font-normal text-gray-500 dark:text-[#a5b2c5] group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {t('sidebar.more_feeds', { defaultValue: 'More feeds' })}
                        </span>
                    </button>
                </div>
            )}

            {/* Suggested Users / Onboarding - Only for Logged In Users */}
            {isAuthenticated && <OnboardingCard />}

            {/* Trending Topics */}
            <TrendingSection />

            {/* Footer Links */}
            <div className="px-2 mt-auto flex flex-wrap gap-x-2 gap-y-1 text-gray-500 dark:text-dark-text-secondary">
                <a href="#" className="text-[13.1px] hover:underline">Privacy</a>
                <span className="text-[13.1px]">·</span>
                <a href="#" className="text-[13.1px] hover:underline">Terms</a>
                <span className="text-[13.1px]">·</span>
                <a href="#" className="text-[13.1px] hover:underline">Help</a>
            </div>
        </div>
    );
};

export default RightSidebar;
