import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import api from '../../utils/api';
import Avatar from '../common/Avatar';
import { BsPatchCheckFill } from 'react-icons/bs';
import LoadingIndicator from '../common/LoadingIndicator';

import TrendingSection from './TrendingSection';
import SuggestedUsersSection from './SuggestedUsersSection';

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
            const response = await api.search.users(query);
            setResults(response.data || []);
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

    const handleResultClick = (handle: string) => {
        navigate(`/profile/${handle}`);
        setSearchQuery('');
        setShowResults(false);
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
                        placeholder={t('feeds.search_placeholder', { defaultValue: 'Tìm kiếm' })}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowResults(true);
                        }}
                        onFocus={() => setShowResults(true)}
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
                                    {results.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleResultClick(user.handle)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors text-left"
                                        >
                                            <Avatar
                                                src={user.avatarUrl || user.avatar}
                                                alt={user.displayName}
                                                size="md"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 dark:text-dark-text truncate flex items-center gap-0.5">
                                                    {user.displayName}
                                                    {user.isVerified && (
                                                        <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />
                                                    )}
                                                </p>
                                                <p className="text-[14px] text-gray-500 dark:text-dark-text-secondary truncate">
                                                    @{user.handle}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : searchQuery.trim() ? (
                                <div className="p-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                    {t('search.no_results', { defaultValue: 'Không tìm thấy kết quả' })}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {/* Suggested Users / Onboarding */}
            <SuggestedUsersSection />

            {/* Trending Topics */}
            <TrendingSection />

            {/* Footer Links */}
            <div className="px-1 py-4 text-gray-400 dark:text-dark-text-secondary">
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[13px]">
                    <a href={supportLink} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary-500 font-medium">{t('sidebar.feedback', { defaultValue: 'Phản hồi' })}</a>
                    <span>·</span>
                    <button
                        onClick={() => navigate('/settings/privacy')}
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
