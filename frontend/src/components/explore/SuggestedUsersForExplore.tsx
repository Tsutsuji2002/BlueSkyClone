import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiCheck } from 'react-icons/fi';
import { API_BASE_URL } from '../../constants';
import Avatar from '../common/Avatar';
import { cn } from '../../utils/classNames';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { SuggestedUser } from '../../types';
import UserHoverCard from '../common/UserHoverCard';
import { fetchSuggestedUsers, updateFollowStatus } from '../../redux/slices/suggestionsSlice';
import { followUserAsync, unfollowUserAsync } from '../../redux/slices/userSlice';
import { openAuthWall } from '../../redux/slices/modalsSlice';
import { useVerifiedFollowStatuses } from '../../hooks/useVerifiedFollowStatuses';

const categories = [
    { id: 'all', nameKey: 'explore.categories.all' },
    { id: 'art', nameKey: 'interests_tags.art' },
    { id: 'comics', nameKey: 'interests_tags.comics' },
    { id: 'gaming', nameKey: 'interests_tags.gaming' },
    { id: 'sports', nameKey: 'interests_tags.sports' },
    { id: 'music', nameKey: 'interests_tags.music' },
    { id: 'politics', nameKey: 'interests_tags.politics' },
    { id: 'photography', nameKey: 'interests_tags.photography' },
    { id: 'science', nameKey: 'interests_tags.science' },
    { id: 'news', nameKey: 'interests_tags.news' },
    { id: 'animals', nameKey: 'interests_tags.animals' },
    { id: 'books', nameKey: 'interests_tags.books' },
    { id: 'comedy', nameKey: 'interests_tags.comedy' },
    { id: 'culture', nameKey: 'interests_tags.culture' },
    { id: 'software-dev', nameKey: 'interests_tags.developers' },
    { id: 'education', nameKey: 'interests_tags.education' },
    { id: 'finance', nameKey: 'interests_tags.finance' },
    { id: 'food', nameKey: 'interests_tags.food' },
    { id: 'journalism', nameKey: 'interests_tags.journalism' },
    { id: 'movies', nameKey: 'interests_tags.movies' },
    { id: 'nature', nameKey: 'interests_tags.nature' },
    { id: 'pets', nameKey: 'interests_tags.pets' },
    { id: 'tech', nameKey: 'interests_tags.tech' },
    { id: 'tv', nameKey: 'interests_tags.tv' },
    { id: 'writers', nameKey: 'interests_tags.writers' },
];

const SuggestedUsersForExplore: React.FC = () => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(categories[0]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    
    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const { suggestionsByCategory, loadingStates } = useAppSelector((state: RootState) => state.suggestions);

    const allSuggestions = React.useMemo(() => {
        return Object.values(suggestionsByCategory).flat();
    }, [suggestionsByCategory]);

    const { resolveIsFollowing, resolveFollowingReference, updateVerifiedStatus } = useVerifiedFollowStatuses(allSuggestions as any[]);

    const fetchCategory = async (category: typeof categories[0]) => {
        // Skip if already loading or already fetched in Redux (unless it returned empty last time)
        const hasResults = suggestionsByCategory[category.id] && suggestionsByCategory[category.id].length > 0;
        if (loadingStates[category.id] || hasResults) return;

        dispatch(fetchSuggestedUsers({ 
            categoryId: category.id, 
            limit: category.id === 'all' ? 5 : 10 
        }));
    };

    // Pre-fetch ONLY "For You" immediately on mount
    useEffect(() => {
        const allCategory = categories.find(c => c.id === 'all');
        if (allCategory) fetchCategory(allCategory);
    }, []);

    // Ensure selected category is fetched if it changes
    useEffect(() => {
        if (!suggestionsByCategory[selectedCategory.id]) {
            fetchCategory(selectedCategory);
        }
    }, [selectedCategory.id]);

    const handleFollow = async (user: SuggestedUser) => {
        if (!isAuthenticated) {
            dispatch(openAuthWall());
            return;
        }
        
        const isFollowing = resolveIsFollowing(user as any);
        const did = user.did;

        try {
            if (isFollowing) {
                const followUri = resolveFollowingReference(user as any) || user.viewer?.following;
                if (!followUri) {
                    console.error('No follow URI found for unfollow');
                    return;
                }
                
                await dispatch(unfollowUserAsync({ userId: did, followUri })).unwrap();
                updateVerifiedStatus(user as any, { isFollowing: false });
                dispatch(updateFollowStatus({ did, isFollowing: false }));
            } else {
                const result = await dispatch(followUserAsync(did)).unwrap();
                updateVerifiedStatus(user as any, { isFollowing: true, followingReference: result.uri });
                dispatch(updateFollowStatus({ did, isFollowing: true, followUri: result.uri }));
            }
        } catch (error) {
            console.error('Failed to follow/unfollow:', error);
        }
    };

    const scrollRight = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
    };

    const currentUsers = suggestionsByCategory[selectedCategory.id] || [];
    const isLoading = loadingStates[selectedCategory.id];

    return (
        <section className="flex flex-col bg-white dark:bg-black border-y border-gray-100 dark:border-transparent mt-2">
            {/* Header Area */}
            <div className="flex flex-row items-center px-4 pt-6 pb-1 gap-2">
                <div className="z-20 w-6 h-6 -ml-0.5">
                    <svg fill="none" width="24" viewBox="0 0 24 24" height="24">
                        <path fill="#006AFF" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M12 4a8 8 0 0 0-5.935 13.365C7.56 15.895 9.612 15 12 15c2.388 0 4.44.894 5.935 2.365A8 8 0 0 0 12 4Zm4.412 14.675C15.298 17.636 13.792 17 12 17c-1.791 0-3.298.636-4.412 1.675A7.96 7.96 0 0 0 12 20a7.96 7.96 0 0 0 4.412-1.325ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10a9.98 9.98 0 0 1-3.462 7.567A9.965 9.965 0 0 1 12 22a9.965 9.965 0 0 1-6.538-2.433A9.98 9.98 0 0 1 2 12Zm10-4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 2a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"></path>
                    </svg>
                </div>
                <h2 className="text-[18.8px] tracking-[0.25px] font-bold text-gray-900 dark:text-white flex-1 leading-[18.8px] font-sans">
                    {t('explore.suggested_accounts', { defaultValue: 'Suggested accounts' })}
                </h2>
                <button 
                    aria-label="Search for more accounts" 
                    className="flex items-center justify-center bg-gray-100 dark:bg-black h-[33px] w-[33px] rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
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
                                    ? "bg-gray-900 dark:bg-[#111822] border-gray-900 dark:border-[#313f54] text-white"
                                    : "bg-white dark:bg-black border-gray-200 dark:border-[#232e3e] text-gray-600 dark:text-[#a5b2c5] hover:bg-gray-50 dark:hover:bg-white/5"
                            )}
                        >
                            <span className="text-[13.1px] tracking-[0.25px] font-medium leading-[13.1px] whitespace-nowrap">
                                {t(cat.nameKey)}
                            </span>
                        </button>
                    ))}
                </div>
                
                {/* Scroll Button Overlay */}
                <div className="absolute top-0 right-0 bottom-0 flex justify-center items-center pr-4 pl-3 z-10 bg-gradient-to-l from-white dark:from-black via-white dark:via-black to-transparent">
                    <button 
                        onClick={scrollRight}
                        className="flex items-center justify-center p-2 border border-gray-200 dark:border-[#232e3e] bg-white dark:bg-black rounded-full hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm dark:shadow-none"
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
                        <div key={i} className="flex items-center justify-between gap-3 p-3 flex-1 min-w-[280px] h-[74px] rounded-xl border border-gray-100 dark:border-[#232e3e] animate-pulse">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-white/5" />
                                <div className="flex flex-col gap-2">
                                    <div className="w-24 h-4 bg-gray-200 dark:bg-white/5 rounded" />
                                    <div className="w-16 h-3 bg-gray-200 dark:bg-white/5 rounded" />
                                </div>
                            </div>
                            <div className="w-20 h-8 bg-gray-200 dark:bg-white/5 rounded-full" />
                        </div>
                    ))
                ) : (
                    currentUsers.map((user) => (
                        <div 
                            key={`${selectedCategory.id}-${user.did}`}
                            onClick={() => navigate(`/profile/${user.handle}`)}
                            className="flex items-center justify-between gap-3 p-3 flex-1 min-w-[280px] rounded-xl border border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer group"
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <UserHoverCard user={user as any}>
                                    <div onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.handle}`); }}>
                                        <Avatar src={user.avatar} alt={user.displayName || user.handle} size="md" />
                                    </div>
                                </UserHoverCard>
                                <div className="flex flex-col min-w-0">
                                    <UserHoverCard user={user as any}>
                                        <span 
                                            className="font-bold text-gray-900 dark:text-dark-text truncate hover:underline"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.handle}`); }}
                                        >
                                            {user.displayName || user.handle}
                                        </span>
                                    </UserHoverCard>
                                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                        @{user.handle}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                     e.stopPropagation();
                                     handleFollow(user);
                                }}
                                disabled={user.viewer?.following === 'pending'}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-bold transition-all",
                                    resolveIsFollowing(user as any)
                                        ? "bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-white border border-gray-200 dark:border-dark-border"
                                        : "bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
                                )}
                            >
                                {user.viewer?.following === 'pending' ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : resolveIsFollowing(user as any) ? (
                                    t('profile.following')
                                ) : (
                                    t('profile.follow')
                                )}
                            </button>
                        </div>
                    ))
                )}
                {currentUsers.length === 0 && !isLoading && (
                    <div className="w-full text-center py-8 text-gray-500 dark:text-[#a5b2c5] text-sm">
                        {t('explore.no_suggested_accounts', { defaultValue: 'No suggested accounts found for this category.' })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default SuggestedUsersForExplore;
