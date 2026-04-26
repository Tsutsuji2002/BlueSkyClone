import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiPlus, FiCheck } from 'react-icons/fi';
import { API_BASE_URL } from '../../constants';
import Avatar from '../common/Avatar';
import UserSkeleton from '../common/UserSkeleton';
import { cn } from '../../utils/classNames';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';

interface SuggestedUser {
    did: string;
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    viewer?: {
        following?: string;
        followedBy?: string;
    };
}

const categories = [
    { id: 'all', name: 'For You', term: '' },
    { id: 'art', name: 'Art', term: 'art' },
    { id: 'comics', name: 'Comics', term: 'comics' },
    { id: 'videogames', name: 'Video Games', term: 'gaming' },
    { id: 'sports', name: 'Sports', term: 'sports' },
    { id: 'music', name: 'Music', term: 'music' },
    { id: 'photography', name: 'Photography', term: 'photography' },
    { id: 'news', name: 'News', term: 'news' },
    { id: 'science', name: 'Science', term: 'science' },
    { id: 'nature', name: 'Nature', term: 'nature' },
    { id: 'pets', name: 'Pets', term: 'pets' },
    { id: 'politics', name: 'Politics', term: 'politics' },
];

const SuggestedUsersForExplore: React.FC = () => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(categories[0]);
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const token = localStorage.getItem('token');
    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);

    useEffect(() => {
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                const url = new URL(`${API_BASE_URL}/xrpc/app.bsky.unspecced.getSuggestedUsersForExplore`);
                url.searchParams.append('limit', '6');
                if (selectedCategory.id !== 'all') {
                    url.searchParams.append('category', selectedCategory.id);
                }

                const response = await fetch(url.toString(), {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (response.ok) {
                    const data = await response.json();
                    setUsers(data.suggestions || data.actors || []);
                }
            } catch (error) {
                console.error('Failed to fetch suggested users:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [selectedCategory, token]);

    const handleFollow = async (e: React.MouseEvent, did: string) => {
        e.stopPropagation();
        if (!isAuthenticated) return;
        // In a real app, this would dispatch a follow thunk
        // For this demo/implementation, we'll just optimistically update the UI
        setUsers(prev => prev.map(u => 
            u.did === did 
                ? { ...u, viewer: { ...u.viewer, following: 'pending' } } 
                : u
        ));
    };

    return (
        <section className="flex flex-col gap-4 mt-6">
            <div className="flex items-center gap-2 px-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                    <FiPlus size={18} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    {t('explore.suggested_accounts', { defaultValue: 'Suggested accounts' })}
                </h2>
            </div>

            {/* Categories Scroll */}
            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar px-2">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors",
                            selectedCategory.id === cat.id
                                ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                                : "bg-gray-100 dark:bg-dark-surface text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border"
                        )}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Users List */}
            <div className="flex flex-wrap gap-4 px-2">
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 flex-1 min-w-[280px] h-[74px] rounded-xl border border-gray-100 dark:border-dark-border animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-surface/50" />
                                <div className="flex flex-col gap-2">
                                    <div className="w-24 h-4 bg-gray-200 dark:bg-dark-surface/50 rounded" />
                                    <div className="w-16 h-3 bg-gray-200 dark:bg-dark-surface/50 rounded" />
                                </div>
                            </div>
                            <div className="w-20 h-8 bg-gray-200 dark:bg-dark-surface/50 rounded-full" />
                        </div>
                    ))
                ) : (
                    users.map((user) => (
                        <div 
                            key={user.did}
                            className="flex items-center justify-between gap-3 p-3 flex-1 min-w-[280px] rounded-xl border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar src={user.avatar} alt={user.displayName || user.handle} size="md" />
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                        {user.displayName || user.handle}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                        @{user.handle}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleFollow(e, user.did)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                                    user.viewer?.following 
                                        ? "bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-white"
                                        : "bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                                )}
                            >
                                {user.viewer?.following ? (
                                    <FiCheck size={16} />
                                ) : (
                                    t('profile.follow')
                                )}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};

export default SuggestedUsersForExplore;
