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

const RightSidebar: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const { user } = useAppSelector((state: RootState) => state.auth);
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

    const { feeds, pinnedFeedIds } = useAppSelector((state: RootState) => state.feeds);

    const pinnedFeeds = useMemo(() => {
        return pinnedFeedIds
            .map(id => feeds.find(f => feedActionKey(f) === id || f.id === id || f.uri === id))
            .filter(Boolean)
            .slice(0, 10);
    }, [feeds, pinnedFeedIds]);

    const handleFeedClick = (feed: any) => {
        navigate(`/feeds/${encodeURIComponent(feedActionKey(feed))}`);
    };

    const clearSearch = () => {
        setSearchQuery('');
        setResults([]);
        setShowResults(false);
    };

    return (
        <div className="h-screen sticky top-0 py-2 px-4 space-y-4 overflow-y-auto no-scrollbar">
            {/* Search Bar */}
            <div className="relative pt-1" ref={searchRef}>
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
                    <input
                        type="text"
                        placeholder={t('feeds.search_placeholder', { defaultValue: 'Find' })}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
                        onKeyDown={handleKeyDown}
                        className="w-full pl-11 pr-10 py-2.5 text-[15px] rounded-xl bg-gray-100 dark:bg-dark-surface border-none text-gray-900 dark:text-dark-text placeholder-gray-500 dark:placeholder-dark-text-secondary focus:outline-none focus:ring-1 focus:ring-primary-500 transition-shadow"
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

                {/* Dropdown Results */}
                {showResults && (searchQuery.trim() || loading) && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl shadow-xl z-50 overflow-hidden min-h-[100px] max-h-[80vh] flex flex-col">
                        <div className="p-3 border-b border-gray-100 dark:border-dark-border bg-gray-50/50 dark:bg-dark-surface/50">
                            <p className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                                {t('search.searching_for', { defaultValue: 'Tìm kiếm "{{query}}"', query: searchQuery })}
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
                                    <p className="font-medium text-primary-500">{t('search.goto_search', { defaultValue: 'Tìm kiếm tất cả cho "{{query}}"', query: searchQuery })}</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {/* Pinned Feeds */}
            <div className="flex flex-col gap-1">
                {pinnedFeeds.map((feed: any) => (
                    <button
                        key={feedActionKey(feed)}
                        onClick={() => handleFeedClick(feed)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors text-left group"
                    >
                        <div className="w-6 h-6 rounded-md bg-primary-100 dark:bg-primary-900/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {feed.avatar || feed.avatarUrl ? (
                                <img src={feed.avatar || feed.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">
                                    {feed.name?.[0].toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text truncate">
                            {feed.name}
                        </span>
                    </button>
                ))}
                
                <button
                    onClick={() => navigate('/feeds')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors text-left text-gray-500 dark:text-dark-text-secondary"
                >
                    <div className="w-6 h-6 rounded-md bg-gray-100 dark:bg-dark-surface flex-shrink-0 flex items-center justify-center">
                        <FiPlus size={14} />
                    </div>
                    <span className="text-[15px] font-medium">
                        {t('sidebar.more_feeds', { defaultValue: 'More feeds' })}
                    </span>
                </button>
            </div>

            {/* Suggested Users / Onboarding */}
            <OnboardingCard />

            {/* Trending Topics */}
            <TrendingSection />

            {/* Footer Links */}
            <div className="px-1 py-4 text-gray-400 dark:text-dark-text-secondary">
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[13px]">
                    <a href={supportLink} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary-500 font-medium">{t('sidebar.feedback', { defaultValue: 'Phản hồi' })}</a>
                    <span>·</span>
                    <button
                        onClick={() => navigate('/about/privacy-policy')}
                        className="hover:underline hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                    >
                        {t('sidebar.privacy', { defaultValue: 'Quyền riêng tư' })}
                    </button>
                    <span>·</span>
                    <button
                        onClick={() => navigate('/settings/about')}
                        className="hover:underline hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                    >
                        {t('sidebar.terms', { defaultValue: 'Điều khoản' })}
                    </button>
                    <span>·</span>
                    <button
                        onClick={() => navigate('/support')}
                        className="hover:underline hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                    >
                        {t('sidebar.help', { defaultValue: 'Giúp đỡ' })}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RightSidebar;
