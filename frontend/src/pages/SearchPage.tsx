import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiUser, FiMessageSquare } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import PostCard from '../components/feed/PostCard';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import LoadingIndicator from '../components/common/LoadingIndicator';
import { useNavigate } from 'react-router-dom';

const SearchPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';

    const [query, setQuery] = useState(initialQuery);
    const [activeTab, setActiveTab] = useState<'posts' | 'users'>('posts');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [debounceTimer, setDebounceTimer] = useState<any>(null);

    const handleSearch = useCallback(async (searchQuery: string, tab: 'posts' | 'users') => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const endpoint = tab === 'posts' ? api.search.posts : api.search.users;
            const response = await endpoint(searchQuery);
            setResults(response.data || []);
        } catch (error) {
            console.error('Search failed:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceTimer) clearTimeout(debounceTimer);

        const timer = setTimeout(() => {
            if (query.trim()) {
                setSearchParams({ q: query });
                handleSearch(query, activeTab);
            } else {
                setSearchParams({});
                setResults([]);
            }
        }, 500);

        setDebounceTimer(timer);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query, activeTab]);

    const handleTabChange = (tab: 'posts' | 'users') => {
        setActiveTab(tab);
        // Immediate search on tab switch if query exists
        if (query.trim()) {
            handleSearch(query, tab);
        }
    };

    return (
        <div className="max-w-2xl mx-auto min-h-screen border-x border-gray-200 dark:border-dark-border">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                <div className="p-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FiSearch className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-full leading-5 bg-gray-50 dark:bg-dark-surface placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm dark:text-dark-text transition duration-150 ease-in-out"
                            placeholder={t('search.placeholder', 'Search posts or users...')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-dark-border">
                    <button
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${activeTab === 'posts'
                            ? 'text-gray-900 dark:text-dark-text'
                            : 'text-gray-500 hover:text-gray-700 dark:text-dark-text-secondary dark:hover:text-dark-text'
                            }`}
                        onClick={() => handleTabChange('posts')}
                    >
                        <FiMessageSquare size={18} />
                        {t('search.tabs.posts', 'Posts')}
                        {activeTab === 'posts' && (
                            <div className="absolute bottom-0 h-1 w-16 bg-primary-500 rounded-t-full" />
                        )}
                    </button>
                    <button
                        className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative ${activeTab === 'users'
                            ? 'text-gray-900 dark:text-dark-text'
                            : 'text-gray-500 hover:text-gray-700 dark:text-dark-text-secondary dark:hover:text-dark-text'
                            }`}
                        onClick={() => handleTabChange('users')}
                    >
                        <FiUser size={18} />
                        {t('search.tabs.users', 'People')}
                        {activeTab === 'users' && (
                            <div className="absolute bottom-0 h-1 w-16 bg-primary-500 rounded-t-full" />
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="pb-20">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <LoadingIndicator size="lg" />
                    </div>
                ) : results.length > 0 ? (
                    <div>
                        {activeTab === 'posts' ? (
                            results.map((post: any) => (
                                <PostCard key={post.id} post={post} />
                            ))
                        ) : (
                            results.map((user: any) => (
                                <div
                                    key={user.id}
                                    className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer border-b border-gray-100 dark:border-dark-border"
                                    onClick={() => navigate(`/profile/${user.handle}`)}
                                >
                                    <Avatar
                                        src={user.avatarUrl || user.avatar}
                                        alt={user.displayName}
                                        size="md"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                {user.displayName}
                                            </div>
                                        </div>
                                        <div className="text-gray-500 dark:text-dark-text-secondary truncate">
                                            @{user.handle}
                                        </div>
                                        {user.bio && (
                                            <div className="text-sm text-gray-700 dark:text-dark-text-secondary mt-1 line-clamp-2">
                                                {user.bio}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : query.trim() ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <div className="bg-gray-100 dark:bg-dark-surface p-4 rounded-full mb-4">
                            <FiSearch size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                            {t('search.no_results_title', 'No results found')}
                        </h3>
                        <p className="text-gray-500 dark:text-dark-text-secondary max-w-sm">
                            {t('search.no_results_desc', 'Try searching for something else, or check for typos.')}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                            {t('search.start_searching', 'Search BlueSky')}
                        </h3>
                        <p className="text-gray-500 dark:text-dark-text-secondary max-w-sm">
                            {t('search.start_desc', 'Find posts and people on BlueSky.')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
