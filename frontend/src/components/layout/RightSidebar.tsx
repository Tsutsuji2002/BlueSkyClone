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

    const { user } = useAppSelector((state: RootState) => state.auth);
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
    }, [feeds, subscribedFeeds, pinnedFeedIds, t]);

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
                <div className="flex items-center gap-3 px-3 py-2 bg-[#19222e] rounded-[10px] border border-transparent focus-within:border-blue-500 transition-all">
                    <FiSearch className="text-[#667b99] flex-shrink-0" size={18} />
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
                        className="bg-transparent border-none outline-none text-[15px] text-white w-full placeholder-[#667b99] py-1"
                    />
                    {searchQuery && (
                        <button onClick={clearSearch} className="text-[#667b99] hover:text-white">
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

            {/* Pinned Feeds */}
            <div className="flex flex-col gap-[2px]">
                {pinnedFeeds.map((feed: any) => {
                    const isFollowing = feedActionKey(feed) === 'following';
                    return (
                        <button
                            key={feedActionKey(feed)}
                            onClick={() => handleFeedClick(feed)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                        >
                            <div className={cn(
                                "w-5 h-5 rounded-[4px] flex-shrink-0 flex items-center justify-center overflow-hidden",
                                isFollowing ? "bg-[#006aff]" : "bg-[#111822]"
                            )}>
                                {isFollowing ? (
                                    <svg fill="none" viewBox="0 0 24 24" width="14" height="14">
                                        <path fill="#FFFFFF" d="M7.002 5a1 1 0 0 0-2 0v11.587l-1.295-1.294a1 1 0 0 0-1.414 1.414l3.002 3a1 1 0 0 0 1.414 0l2.998-3a1 1 0 0 0-1.414-1.414l-1.291 1.292V5ZM16 16a1 1 0 1 0 0 2h4a1 1 0 1 0 0-2h-4Zm-3-4a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2h-6a1 1 0 0 1-1-1Zm-1-6a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-8Z" />
                                    </svg>
                                ) : (
                                    feed.avatar || feed.avatarUrl ? (
                                        <img src={feed.avatar || feed.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] font-bold text-[#a5b2c5]">
                                            {feed.name?.[0].toUpperCase()}
                                        </span>
                                    )
                                )}
                            </div>
                            <span className="text-[15px] font-normal text-[#a5b2c5] truncate group-hover:text-white transition-colors">
                                {feed.name}
                            </span>
                        </button>
                    );
                })}
                
                <button
                    onClick={() => navigate('/feeds')}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                >
                    <div className="w-5 h-5 rounded-[4px] bg-[#19222e] flex-shrink-0 flex items-center justify-center">
                        <FiPlus size={16} className="text-[#a5b2c5]" />
                    </div>
                    <span className="text-[15px] font-normal text-[#a5b2c5] group-hover:text-white transition-colors">
                        {t('sidebar.more_feeds', { defaultValue: 'More feeds' })}
                    </span>
                </button>
            </div>

            {/* Suggested Users / Onboarding */}
            <OnboardingCard />

            {/* Trending Topics */}
            <TrendingSection />

            {/* Footer Links */}
            <div className="px-2 mt-auto flex flex-wrap gap-x-2.5 gap-y-1">
                <a href="#" className="text-[13.1px] text-[#a5b2c5] hover:underline">Feedback</a>
                <span className="text-[#526580]">∙</span>
                <a href="#" className="text-[13.1px] text-[#a5b2c5] hover:underline">Privacy</a>
                <span className="text-[#526580]">∙</span>
                <a href="#" className="text-[13.1px] text-[#a5b2c5] hover:underline">Terms</a>
                <span className="text-[#526580]">∙</span>
                <a href="#" className="text-[13.1px] text-[#a5b2c5] hover:underline">Help</a>
            </div>
        </div>
    );
};

export default RightSidebar;
