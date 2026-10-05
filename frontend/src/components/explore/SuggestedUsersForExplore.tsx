import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiChevronRight, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
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

// Optimistic follow state type definition
interface OptimisticFollowState {
    isFollowing: boolean;
    isLoading: boolean;
    followingReference?: string;
}

const categories = [
    { id: 'all', label: 'For You' },
    { id: 'art', label: 'Art' },
    { id: 'comics', label: 'Comics' },
    { id: 'books', label: 'Books' },
    { id: 'culture', label: 'Culture' },
    { id: 'software-dev', label: 'Software Dev' },
    { id: 'gaming', label: 'Video Games' },
    { id: 'journalism', label: 'Journalism' },
    { id: 'movies', label: 'Movies' },
    { id: 'music', label: 'Music' },
    { id: 'news', label: 'News' },
    { id: 'tech', label: 'Tech' },
    { id: 'sports', label: 'Sports' },
    { id: 'science', label: 'Science' },
    { id: 'writers', label: 'Writers' },
    { id: 'food', label: 'Food' },
    { id: 'politics', label: 'Politics' },
    { id: 'photography', label: 'Photography' },
    { id: 'animals', label: 'Animals' },
    { id: 'comedy', label: 'Comedy' },
    { id: 'education', label: 'Education' },
    { id: 'finance', label: 'Finance' },
    { id: 'nature', label: 'Nature' },
    { id: 'pets', label: 'Pets' },
    { id: 'tv', label: 'TV' },
];

const SuggestedUsersForExplore: React.FC = () => {
    const { t } = useTranslation();
    const [selectedCategory, setSelectedCategory] = useState(categories[0]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    
    // Initialize optimistic state for follow/unfollow actions
    const [optimisticState, setOptimisticState] = useState<Record<string, OptimisticFollowState>>({});
    
    const { isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const { suggestionsByCategory, loadingStates } = useAppSelector((state: RootState) => state.suggestions);

    const allSuggestions = React.useMemo(() => {
        return Object.values(suggestionsByCategory).flat();
    }, [suggestionsByCategory]);

    const { resolveIsFollowing, resolveFollowingReference, updateVerifiedStatus } = useVerifiedFollowStatuses(allSuggestions as any[]);

    // Helper: Get effective follow status (optimistic > hook)
    const getEffectiveFollowStatus = (user: SuggestedUser): boolean => {
        const userDid = user.did;
        if (optimisticState[userDid]) {
            return optimisticState[userDid].isFollowing;
        }
        return resolveIsFollowing(user as any);
    };

    // Helper: Get loading state for user
    const isUserLoading = (userDid: string): boolean => {
        return optimisticState[userDid]?.isLoading ?? false;
    };

    const fetchCategory = async (category: typeof categories[0]) => {
        // Skip if already loading or already fetched in Redux (unless it returned empty last time)
        const hasResults = suggestionsByCategory[category.id] && suggestionsByCategory[category.id].length > 0;
        if (loadingStates[category.id] || hasResults) return;

        dispatch(fetchSuggestedUsers({ 
            categoryId: category.id, 
            limit: category.id === 'all' ? 5 : 10 
        }));
    };

    // Ensure selected category is fetched on mount and when it changes
    useEffect(() => {
        // Initial fetch for the default category or when category changes
        fetchCategory(selectedCategory);
    }, [selectedCategory.id]);

    const handleFollow = async (user: SuggestedUser) => {
        // 1. Authentication check - MUST happen before any state updates
        if (!isAuthenticated) {
            dispatch(openAuthWall());
            return; // Return early to prevent optimistic updates
        }
        
        const did = user.did;
        const currentFollowStatus = getEffectiveFollowStatus(user);
        
        // 2. Prevent duplicate actions
        if (isUserLoading(did)) {
            return;
        }
        
        // 3. Set optimistic state immediately
        const newFollowStatus = !currentFollowStatus;
        setOptimisticState(prev => ({
            ...prev,
            [did]: {
                isFollowing: newFollowStatus,
                isLoading: true,
                followingReference: newFollowStatus ? prev[did]?.followingReference : undefined
            }
        }));

        try {
            // 4. Execute backend request
            if (newFollowStatus) {
                // Follow action
                const result = await dispatch(followUserAsync(did)).unwrap();
                
                // 5. Update hook state and Redux on success
                updateVerifiedStatus(user as any, { 
                    isFollowing: true, 
                    followingReference: result.uri 
                });
                dispatch(updateFollowStatus({ 
                    did, 
                    isFollowing: true, 
                    followUri: result.uri 
                }));
                
                // 6. Update optimistic state with confirmed URI
                setOptimisticState(prev => ({
                    ...prev,
                    [did]: {
                        isFollowing: true,
                        isLoading: false,
                        followingReference: result.uri
                    }
                }));
            } else {
                // Unfollow action
                const followUri = resolveFollowingReference(user as any) || 
                               optimisticState[did]?.followingReference || 
                               user.viewer?.following;
                
                if (!followUri) {
                    console.error('No follow URI found for unfollow');
                    toast.error(t('errors.unfollow_failed', { defaultValue: 'Failed to unfollow user' }));
                    // Revert optimistic state
                    setOptimisticState(prev => ({
                        ...prev,
                        [did]: {
                            isFollowing: currentFollowStatus,
                            isLoading: false
                        }
                    }));
                    return;
                }
                
                await dispatch(unfollowUserAsync({ userId: did, followUri })).unwrap();
                
                // Update hook state and Redux on success
                updateVerifiedStatus(user as any, { isFollowing: false });
                dispatch(updateFollowStatus({ did, isFollowing: false }));
                
                // Clear optimistic state entry
                setOptimisticState(prev => {
                    const newState = { ...prev };
                    delete newState[did];
                    return newState;
                });
            }
        } catch (error) {
            // 7. Error handling - revert optimistic state and show toast
            console.error('Failed to follow/unfollow:', error);
            
            const errorMessage = newFollowStatus
                ? t('errors.follow_failed', { defaultValue: 'Failed to follow user' })
                : t('errors.unfollow_failed', { defaultValue: 'Failed to unfollow user' });
            
            toast.error(errorMessage);
            
            // Revert to previous state
            setOptimisticState(prev => ({
                ...prev,
                [did]: {
                    isFollowing: currentFollowStatus,
                    isLoading: false,
                    followingReference: prev[did]?.followingReference
                }
            }));
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
        <section className="flex flex-col bg-white dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border mt-2">
            {/* Header Area */}
            <div className="flex flex-row items-center px-4 pt-6 pb-3 gap-2">
                <div className="z-20 w-5 h-5 -ml-0.5 flex items-center justify-center">
                    <svg fill="none" width="20" viewBox="0 0 24 24" height="20">
                        <path fill="currentColor" className="text-black dark:text-white" fillRule="evenodd" clipRule="evenodd" d="M12 4a8 8 0 0 0-5.935 13.365C7.56 15.895 9.612 15 12 15c2.388 0 4.44.894 5.935 2.365A8 8 0 0 0 12 4Zm4.412 14.675C15.298 17.636 13.792 17 12 17c-1.791 0-3.298.636-4.412 1.675A7.96 7.96 0 0 0 12 20a7.96 7.96 0 0 0 4.412-1.325ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10a9.98 9.98 0 0 1-3.462 7.567A9.965 9.965 0 0 1 12 22a9.965 9.965 0 0 1-6.538-2.433A9.98 9.98 0 0 1 2 12Zm10-4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 2a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z"></path>
                    </svg>
                </div>
                <h2 className="text-[16.9px] leading-[22px] tracking-[0.25px] font-semibold text-gray-900 dark:text-white flex-1 font-sans">
                    {t('explore.suggested_accounts', { defaultValue: 'Suggested accounts' })}
                </h2>
                <button 
                    aria-label="Search for more accounts" 
                    className="flex items-center justify-center bg-white dark:bg-dark-surface h-[33px] w-[33px] rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface/80 transition-colors"
                >
                    <div className="w-[17px] h-[17px] relative">
                        <div className="absolute w-[24px] h-[24px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <svg fill="none" width="24" viewBox="0 0 24 24" height="24" className="text-[#526580] pointer-events-none">
                                <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 6a8 8 0 1 1 14.32 4.906l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387A8 8 0 0 1 3 11Z"></path>
                            </svg>
                        </div>
                    </div>
                </button>
            </div>

            {/* Tabs Area */}
            <div className="relative flex flex-row items-center pb-3">
                <div 
                    ref={scrollRef}
                    className="flex flex-row overflow-x-auto no-scrollbar gap-2 px-4 select-none flex-1"
                >
                    {categories.map((cat) => {
                        const isActive = selectedCategory.id === cat.id;
                        const labelText = cat.label || cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat)}
                                className="flex flex-row items-center justify-center outline-none"
                            >
                                <div className={cn(
                                    "rounded-full px-4 py-2 border transition-all",
                                    isActive
                                        ? "bg-gray-50 dark:bg-dark-surface border-gray-300 dark:border-dark-border text-black dark:text-white"
                                        : "bg-white dark:bg-dark-bg border-[#dce2ea] dark:border-dark-border text-[#405168] dark:text-dark-text-secondary hover:bg-gray-50"
                                )}>
                                    <span className={cn(
                                        "text-[13.1px] tracking-[0.25px] leading-[17px] whitespace-nowrap",
                                        isActive ? "font-semibold" : "font-medium"
                                    )}>
                                        {labelText}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                
                {/* Scroll Button Overlay */}
                <div className="absolute top-0 right-0 bottom-0 flex justify-center items-center pr-4 pl-3 z-10 bg-gradient-to-l from-white dark:from-dark-bg via-white dark:via-dark-bg to-transparent">
                    <button 
                        onClick={scrollRight}
                        aria-label="Scroll right"
                        className="flex flex-row items-center justify-center border border-[#dce2ea] dark:border-dark-border bg-white dark:bg-dark-surface rounded-full hover:bg-gray-50 dark:hover:bg-dark-surface/80 transition-colors h-full aspect-square p-2"
                    >
                        <div className="z-20 w-[17px] h-[17px] -ml-[2px] -mr-[2px]">
                            <div className="absolute w-[16px] h-[16px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                <svg fill="none" width="16" viewBox="0 0 24 24" height="16" className="text-[#405168] pointer-events-none">
                                    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M21 12a1 1 0 0 1-.293.707l-6 6a1 1 0 0 1-1.414-1.414L17.586 13H4a1 1 0 1 1 0-2h13.586l-4.293-4.293a1 1 0 0 1 1.414-1.414l6 6A1 1 0 0 1 21 12Z"></path>
                                </svg>
                            </div>
                        </div>
                    </button>
                </div>
            </div>

            {/* Users List matching HTML structure */}
            <div className="flex flex-col w-full">
                {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                        <div key={i} className="p-4 border-t border-[#dce2ea] dark:border-dark-border animate-pulse flex gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-surface" />
                            <div className="flex-1 flex flex-col gap-2">
                                <div className="w-32 h-4 bg-gray-200 dark:bg-dark-surface rounded" />
                                <div className="w-24 h-3 bg-gray-200 dark:bg-dark-surface rounded" />
                            </div>
                        </div>
                    ))
                ) : (
                    currentUsers.map((user) => (
                        <div key={`${selectedCategory.id}-${user.did}`} className="flex flex-col w-full border-t border-[#dce2ea] dark:border-dark-border">
                            <div
                                onClick={() => navigate(`/profile/${user.handle}`)}
                                className="flex flex-col items-center justify-start w-full p-4 cursor-pointer hover:bg-[#eff2f6]/50 dark:hover:bg-dark-surface/50 transition-colors"
                            >
                                <div className="w-full flex flex-row items-center gap-2">
                                    <UserHoverCard user={user as any}>
                                        <div 
                                            className="inline-block"
                                            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.handle}`); }}
                                        >
                                            <div className="w-10 h-10 shrink-0 relative">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#f9fafb] dark:bg-dark-surface relative">
                                                    <img 
                                                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.handle)}&background=random`}
                                                        alt={user.displayName || user.handle}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                </div>
                                                <div className="absolute inset-0 border border-[#dce2ea] dark:border-dark-border rounded-full opacity-60 pointer-events-none" />
                                            </div>
                                        </div>
                                    </UserHoverCard>

                                    <div className="flex-1 min-w-0">
                                        <UserHoverCard user={user as any}>
                                            <div 
                                                className="inline-block"
                                                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${user.handle}`); }}
                                            >
                                                <div className="text-[15px] leading-[20px] font-semibold text-black dark:text-white truncate">
                                                    {user.displayName || user.handle}
                                                </div>
                                            </div>
                                        </UserHoverCard>
                                        <div className="text-[13.1px] leading-[17px] text-[#405168] dark:text-dark-text-secondary truncate">
                                            @{user.handle}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleFollow(user);
                                        }}
                                        disabled={isUserLoading(user.did)}
                                        className={cn(
                                            "flex flex-row items-center justify-center rounded-full px-3.5 py-2 gap-1.5 transition-all text-[13.1px] font-medium leading-[17px]",
                                            getEffectiveFollowStatus(user)
                                                ? "bg-gray-100 dark:bg-dark-surface text-gray-900 dark:text-white border border-[#dce2ea] dark:border-dark-border"
                                                : "bg-[#006aff] hover:bg-[#005cd6] text-white",
                                            isUserLoading(user.did) && "opacity-60 cursor-not-allowed"
                                        )}
                                    >
                                        {getEffectiveFollowStatus(user) ? t('profile.following', { defaultValue: 'Following' }) : t('profile.follow', { defaultValue: 'Follow' })}
                                    </button>
                                </div>

                                {user.description && (
                                    <div className="w-full pt-1">
                                        <p className="text-[13.1px] leading-[17px] text-black dark:text-white line-clamp-2 break-words">
                                            {user.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {currentUsers.length === 0 && !isLoading && (
                    <div className="w-full text-center py-8 text-[#405168] dark:text-dark-text-secondary text-[13.1px] border-t border-[#dce2ea] dark:border-dark-border">
                        {t('explore.no_suggested_accounts', { defaultValue: 'No suggested accounts found for this category.' })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default SuggestedUsersForExplore;
