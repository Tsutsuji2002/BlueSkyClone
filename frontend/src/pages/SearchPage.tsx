import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Feed from '../components/feed/Feed';
import { FiArrowLeft, FiSearch, FiX } from 'react-icons/fi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchPostsSearch } from '../redux/slices/postsSlice';
import { searchUsers } from '../redux/slices/userSlice';
import { RootState } from '../redux/store';
import LoadingIndicator from '../components/common/LoadingIndicator';
import Avatar from '../components/common/Avatar';
import UserHoverCard from '../components/common/UserHoverCard';
import { BsPatchCheckFill } from 'react-icons/bs';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { FiMenu } from 'react-icons/fi';

const SearchPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const initialTab = query.startsWith('@') ? 'people' : (searchParams.get('tab') || 'top');
    const [activeTab, setActiveTab] = useState(initialTab);
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const { posts, isLoading: isPostsLoading, hasMore } = useAppSelector((state: RootState) => state.posts);
    const { searchResults: users, searchLoading: isUsersLoading } = useAppSelector((state: RootState) => state.user);

    const [inputValue, setInputValue] = useState(query);
    const limit = 20;

    const isLoading = activeTab === 'people' ? isUsersLoading : isPostsLoading;

    useEffect(() => {
        setInputValue(query);
        if (query) {
            if (activeTab === 'people') {
                const userQuery = query.startsWith('@') ? query.slice(1) : query;
                dispatch(searchUsers({ query: userQuery, skip: 0, take: limit }));
            } else {
                dispatch(fetchPostsSearch({ query, skip: 0, take: limit }));
            }
        }
    }, [dispatch, query, activeTab]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim()) {
            const nextTab = inputValue.trim().startsWith('@') ? 'people' : activeTab;
            setSearchParams({ q: inputValue.trim(), tab: nextTab });
            setActiveTab(nextTab);
        }
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSearchParams({ q: query, tab });
    };

    const handleLoadMore = () => {
        if (query) {
            const currentCount = activeTab === 'people' ? users.length : posts.length;
            if (activeTab === 'people') {
                const userQuery = query.startsWith('@') ? query.slice(1) : query;
                dispatch(searchUsers({ query: userQuery, skip: currentCount, take: limit }));
            } else {
                dispatch(fetchPostsSearch({ query, skip: currentCount, take: limit }));
            }
        }
    };

    useDocumentTitle(`${query ? query + ' - ' : ''}${t('nav.search', { defaultValue: 'Search' })}`);

    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const [isFocused, setIsFocused] = useState(false);

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border pb-[80px]">
                {/* Header */}
                <div className="sticky top-0 z-30 bg-white dark:bg-dark-bg">
                    <div className="flex items-center gap-4 px-4 py-3">
                        <button
                            onClick={() => dispatch(openMobileMenu())}
                            className="p-1 -ml-1 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors flex-shrink-0"
                        >
                            <FiMenu size={22} className="text-gray-900 dark:text-dark-text" />
                        </button>
                        <h2 className="text-[20px] font-bold text-gray-900 dark:text-dark-text">
                            {t('nav.explore', { defaultValue: 'Explore' })}
                        </h2>
                    </div>

                    {/* Search Field */}
                    <div className="px-4 pb-3 flex gap-2">
                        <form onSubmit={handleSearch} className="flex-1 relative group">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 focus-within:text-primary-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    if (e.target.value.trim() !== '') {
                                        // Auto-search for users in guest mode like typeahead
                                        const q = e.target.value.trim().startsWith('@') ? e.target.value.trim().slice(1) : e.target.value.trim();
                                        dispatch(searchUsers({ query: q, skip: 0, take: 10 }));
                                    }
                                }}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                                placeholder={t('explore.search_placeholder_long', { defaultValue: 'Search posts, users, or feeds' })}
                                className="w-full bg-white dark:bg-dark-surface py-2.5 pl-10 pr-10 rounded-lg text-[15px] border border-gray-200 dark:border-dark-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors dark:text-dark-text shadow-sm"
                            />
                            {inputValue && (
                                <button
                                    type="button"
                                    onClick={() => setInputValue('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text p-1"
                                >
                                    <FiX size={16} />
                                </button>
                            )}
                        </form>
                        {(isFocused || inputValue) && (
                            <button 
                                onClick={() => {
                                    setInputValue('');
                                    setSearchParams({});
                                }}
                                className="text-primary-500 font-medium text-[15px] px-1 hover:underline whitespace-nowrap"
                            >
                                {t('common.cancel', { defaultValue: 'Cancel' })}
                            </button>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="bg-white dark:bg-dark-bg min-h-[calc(100vh-120px)] shadow-sm border-t border-gray-200 dark:border-dark-border">
                    {inputValue.trim() === '' ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="mb-4">
                                <FiSearch className="text-gray-400 dark:text-dark-text-secondary" size={48} strokeWidth={2.5} />
                            </div>
                            <p className="text-gray-500 dark:text-dark-text-secondary text-[15px] font-medium max-w-xs">
                                {t('explore.guest_hero_text', { defaultValue: 'Search posts, users, and feeds on Bluesky' })}
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                                <span className="text-[15px] text-gray-900 dark:text-dark-text">
                                    {t('search.search_for', { defaultValue: 'Search for' })} "{inputValue}"
                                </span>
                            </div>
                            
                            {/* User Results */}
                            <div className="divide-y divide-gray-100 dark:divide-dark-border">
                                {isUsersLoading && users.length === 0 ? (
                                    <div className="flex justify-center py-8">
                                        <LoadingIndicator size="md" />
                                    </div>
                                ) : users.map((user) => (
                                    <div
                                        key={user.id}
                                        onClick={() => navigate(`/profile/${user.handle}`)}
                                        className="flex gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer transition-colors"
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            <Avatar src={user.avatarUrl || user.avatar} alt={user.displayName || user.handle || '?'} size="md" />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <div className="flex items-center gap-1 leading-tight">
                                                <span className="font-bold text-[15px] text-gray-900 dark:text-dark-text truncate">
                                                    {user.displayName || user.handle || 'Unknown'}
                                                </span>
                                                {user.isVerified && <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={14} />}
                                            </div>
                                            <div className="text-gray-500 dark:text-dark-text-secondary text-[14px] truncate leading-tight mt-0.5">
                                                @{user.handle}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                <div className="sticky top-0 z-30 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors flex-shrink-0"
                        >
                            <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                        </button>

                        <form onSubmit={handleSearch} className="flex-1 relative group">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-500 transition-colors" size={18} />
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={t('explore.search_placeholder', { defaultValue: 'Search' })}
                                className="w-full bg-gray-100 dark:bg-dark-surface py-2 pl-12 pr-10 rounded-full text-[15px] focus:bg-white dark:focus:bg-dark-bg border border-transparent focus:border-primary-500 outline-none transition-colors dark:text-dark-text"
                            />
                            {inputValue && (
                                <button
                                    type="button"
                                    onClick={() => setInputValue('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text p-1"
                                >
                                    <FiX size={16} />
                                </button>
                            )}
                        </form>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100 dark:border-dark-border overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => handleTabChange('top')}
                            className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'top' ? 'font-bold text-gray-900 dark:text-dark-text border-b-2 border-primary-500' : 'font-medium text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface'}`}>
                            {t('search.top', { defaultValue: 'Top' })}
                        </button>
                        <button
                            onClick={() => handleTabChange('latest')}
                            className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'latest' ? 'font-bold text-gray-900 dark:text-dark-text border-b-2 border-primary-500' : 'font-medium text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface'}`}>
                            {t('search.latest', { defaultValue: 'Latest' })}
                        </button>
                        <button
                            onClick={() => handleTabChange('people')}
                            className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'people' ? 'font-bold text-gray-900 dark:text-dark-text border-b-2 border-primary-500' : 'font-medium text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface'}`}>
                            {t('search.people', { defaultValue: 'People' })}
                        </button>
                        <button
                            onClick={() => handleTabChange('media')}
                            className={`flex-1 py-3 text-[15px] transition-colors ${activeTab === 'media' ? 'font-bold text-gray-900 dark:text-dark-text border-b-2 border-primary-500' : 'font-medium text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface'}`}>
                            {t('search.media', { defaultValue: 'Media' })}
                        </button>
                    </div>
                </div>

                {/* Results Container */}
                <div className="pb-20">
                    {isLoading && (activeTab === 'people' ? users : posts).length === 0 ? (
                        <div className="flex justify-center py-20">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : (activeTab === 'people' ? users : posts).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
                            <div className="w-20 h-20 bg-gray-50 dark:bg-dark-surface rounded-full flex items-center justify-center mb-6">
                                <FiSearch className="text-gray-300" size={40} />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                                {t('search.no_results_title', { defaultValue: 'No results' })}
                            </h2>
                            <p className="text-gray-500 dark:text-dark-text-secondary">
                                {t('search.no_results_desc', { defaultValue: 'We couldn\'t find anything for "{{query}}"', query })}
                            </p>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'people' ? (
                                <div className="divide-y divide-gray-100 dark:divide-dark-border">
                                    {users.map((user) => (
                                        <div
                                            key={user.id}
                                            onClick={() => navigate(`/profile/${user.handle}`)}
                                            className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface cursor-pointer transition-colors"
                                        >
                                            <UserHoverCard user={user}>
                                                <div onClick={(e) => e.stopPropagation()}>
                                                    <Avatar src={user.avatarUrl || user.avatar} alt={user.displayName || user.handle || '?'} size="lg" />
                                                </div>
                                            </UserHoverCard>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <UserHoverCard user={user}>
                                                        <span className="font-bold text-gray-900 dark:text-dark-text truncate">{user.displayName || user.handle || 'Unknown'}</span>
                                                    </UserHoverCard>
                                                    {user.isVerified && <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={14} />}
                                                </div>
                                                <div className="text-gray-500 dark:text-dark-text-secondary text-[15px] truncate">@{user.handle}</div>
                                                {user.bio && (
                                                    <div className="text-gray-900 dark:text-dark-text text-[15px] mt-1 line-clamp-2">{user.bio}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <Feed 
                                    posts={posts} 
                                    isLoading={isLoading}
                                    hasMore={hasMore}
                                    onLoadMore={handleLoadMore}
                                    emptyMessage={t('search.no_results_title', { defaultValue: 'No results' })}
                                />
                            )}
                        </>
                    )}
                </div>
        </div>
    );
};

export default SearchPage;
