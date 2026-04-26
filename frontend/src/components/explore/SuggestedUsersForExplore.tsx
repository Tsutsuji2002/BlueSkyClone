import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronRight, FiCheck } from 'react-icons/fi';
import { API_BASE_URL } from '../../constants';
import Avatar from '../common/Avatar';
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
    { id: 'all', name: 'For You' },
    { id: 'art', name: 'Art' },
    { id: 'comics', name: 'Comics' },
    { id: 'gaming', name: 'Video Games' },
    { id: 'sports', name: 'Sports' },
    { id: 'music', name: 'Music' },
    { id: 'politics', name: 'Politics' },
    { id: 'photography', name: 'Photography' },
    { id: 'science', name: 'Science' },
    { id: 'news', name: 'News' },
    { id: 'animals', name: 'Animals' },
    { id: 'books', name: 'Books' },
    { id: 'comedy', name: 'Comedy' },
    { id: 'culture', name: 'Culture' },
    { id: 'software-dev', name: 'Software Dev' },
    { id: 'education', name: 'Education' },
    { id: 'finance', name: 'Finance' },
    { id: 'food', name: 'Food' },
    { id: 'journalism', name: 'Journalism' },
    { id: 'movies', name: 'Movies' },
    { id: 'nature', name: 'Nature' },
    { id: 'pets', name: 'Pets' },
    { id: 'tech', name: 'Tech' },
    { id: 'tv', name: 'TV' },
    { id: 'writers', name: 'Writers' },
];

const SuggestedUsersForExplore: React.FC = () => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(categories[0]);
    const [users, setUsers] = useState<SuggestedUser[]>([]);
    const [cachedUsers, setCachedUsers] = useState<Record<string, SuggestedUser[]>>({});
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const token = localStorage.getItem('token');
    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);

    useEffect(() => {
        // If we have cached users for this category, use them and skip re-fetch
        if (cachedUsers[selectedCategory.id]) {
            setUsers(cachedUsers[selectedCategory.id]);
            return;
        }

        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                // Determine limit based on category (5 for For You, 10 for others)
                const limit = selectedCategory.id === 'all' ? 5 : 10;
                
                const url = new URL(`${API_BASE_URL}/xrpc/app.bsky.unspecced.getSuggestedUsersForExplore`);
                url.searchParams.append('limit', limit.toString());
                
                if (selectedCategory.id !== 'all') {
                    url.searchParams.append('category', selectedCategory.id);
                }

                // Add a cache buster to ensure fresh results for the FIRST fetch
                url.searchParams.append('_t', Date.now().toString());

                const response = await fetch(url.toString(), {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (response.ok) {
                    const data = await response.json();
                    const suggestions = data.suggestions || data.actors || data.users || [];
                    setUsers(suggestions);
                    setCachedUsers(prev => ({ ...prev, [selectedCategory.id]: suggestions }));
                }
            } catch (error) {
                console.error('Failed to fetch suggested users:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, [selectedCategory, token, cachedUsers]);

    const handleFollow = async (did: string) => {
        if (!isAuthenticated) return;
        
        // Update local state
        const updatedUsers = users.map(u => 
            u.did === did 
                ? { ...u, viewer: { ...u.viewer, following: 'pending' } } 
                : u
        );
        setUsers(updatedUsers);
        
        // Update cache as well to keep consistency
        setCachedUsers(prev => ({
            ...prev,
            [selectedCategory.id]: updatedUsers
        }));
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
    };

    return (
        <section className="flex flex-col bg-black dark:bg-black">
            {/* Header Area */}
            <div className="flex flex-row items-center px-4 pt-6 pb-1 gap-2">
                <div className="z-20 w-6 h-6 -ml-0.5">
                    <svg fill="none" width="24" viewBox="0 0 24 24" height="24">
                        <path fill="#006AFF" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M12 4a8 8 0 0 0-5.935 13.365C7.56 15.895 9.612 15 12 15c2.388 0 4.44.894 5.935 2.365A8 8 0 0 0 12 4Zm4.412 14.675C15.298 17.636 13.792 17 12 17c-1.791 0-3.298.636-4.412 1.675A7.96 7.96 0 0 0 12 20a7.96 7.96 0 0 0 4.412-1.325ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10a9.98 9.98 0 0 1-3.462 7.567A9.965 9.965 0 0 1 12 22a9.965 9.965 0 0 1-6.538-2.433A9.98 9.98 0 0 1 2 12Zm10-4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 2a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"></path>
                    </svg>
                </div>
                <h2 className="text-[18.8px] tracking-[0.25px] font-bold text-white flex-1 leading-[18.8px] font-sans">
                    {t('explore.suggested_accounts', { defaultValue: 'Suggested accounts' })}
                </h2>
                <button 
                    aria-label="Search for more accounts" 
                    className="flex items-center justify-center bg-black h-[33px] w-[33px] rounded-full hover:bg-white/10 transition-colors"
                >
                    <div className="w-[17px] h-[17px]">
                        <svg fill="none" width="24" viewBox="0 0 24 24" height="24" style={{color: '#8798B0'}}>
                            <path fill="#8798B0" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 6a8 8 0 1 1 14.32 4.906l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387A8 8 0 0 1 3 11Z"></path>
                        </svg>
                    </div>
                </button>
            </div>

            {/* Tabs Area */}
            <div className="relative flex flex-row items-center py-3">
                <div 
                    ref={scrollRef}
                    className="flex flex-row overflow-x-auto no-scrollbar gap-2 px-4 select-none flex-1"
                >
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "flex flex-row items-center justify-center rounded-full px-4 py-2 border transition-all outline-none",
                                selectedCategory.id === cat.id
                                    ? "bg-[#111822] border-[#313f54] text-white"
                                    : "bg-black border-[#232e3e] text-[#a5b2c5] hover:bg-white/5"
                            )}
                        >
                            <span className="text-[13.1px] tracking-[0.25px] font-medium leading-[13.1px] whitespace-nowrap">
                                {cat.name}
                            </span>
                        </button>
                    ))}
                </div>
                
                {/* Scroll Button Overlay */}
                <div className="absolute top-0 right-0 bottom-0 flex justify-center items-center pr-4 pl-3 z-10 bg-gradient-to-l from-black via-black to-transparent">
                    <button 
                        onClick={scrollRight}
                        className="flex items-center justify-center p-2 border border-[#232e3e] bg-black rounded-full hover:bg-white/10 transition-colors"
                        style={{ height: '36px', width: '36px' }}
                    >
                        <FiChevronRight size={18} color="#A5B2C5" />
                    </button>
                </div>
            </div>

            {/* Users List */}
            <div className="flex flex-wrap gap-4 px-4 pb-6 mt-2 min-h-[100px]">
                {isLoading ? (
                    Array(selectedCategory.id === 'all' ? 5 : 6).fill(0).map((_, i) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-3 flex-1 min-w-[280px] h-[74px] rounded-xl border border-[#232e3e] animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/5" />
                                <div className="flex flex-col gap-2">
                                    <div className="w-24 h-4 bg-white/5 rounded" />
                                    <div className="w-16 h-3 bg-white/5 rounded" />
                                </div>
                            </div>
                            <div className="w-20 h-8 bg-white/5 rounded-full" />
                        </div>
                    ))
                ) : (
                    users.map((user) => (
                        <div 
                            key={`${selectedCategory.id}-${user.did}`}
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
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleFollow(user.did);
                                }}
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
                {users.length === 0 && !isLoading && (
                    <div className="w-full text-center py-8 text-[#a5b2c5] text-sm">
                        No suggested accounts found for this category.
                    </div>
                )}
            </div>
        </section>
    );
};

export default SuggestedUsersForExplore;
