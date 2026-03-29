import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiX, FiUser } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { fetchFollowing } from '../../redux/slices/userSlice';
import Button from '../common/Button';
import agent from '../../services/atpAgent';

const OnboardingCard: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { user } = useAppSelector((state: RootState) => state.auth);
    const [avatars, setAvatars] = useState<string[]>([]);
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        const loadAvatars = async () => {
            if (!user) return;

            try {
                // 1. Fetch people the user already follows
                // Use DID if available, otherwise handle. Avoid using internal ID.
                const actor = user.did || user.handle;
                
                // Concurrently fetch following and suggestions for speed and reliability
                const [followingResult, suggestionsResult] = await Promise.allSettled([
                    dispatch(fetchFollowing({ actor, limit: 10 })).unwrap(),
                    agent.app.bsky.actor.getSuggestions({ limit: 15 })
                ]);

                let followedAvatars: string[] = [];
                if (followingResult.status === 'fulfilled') {
                    followedAvatars = followingResult.value.users
                        .map(u => u.avatarUrl || u.avatar)
                        .filter(Boolean) as string[];
                } else {
                    console.warn('Failed to fetch following for onboarding card:', followingResult.reason);
                }

                let suggestedAvatars: string[] = [];
                if (suggestionsResult.status === 'fulfilled' && suggestionsResult.value.success) {
                    suggestedAvatars = suggestionsResult.value.data.actors
                        .map((a: any) => a.avatar)
                        .filter(Boolean)
                        .filter((avg: string) => !followedAvatars.includes(avg));
                } else if (suggestionsResult.status === 'rejected') {
                    console.warn('Failed to fetch suggestions for onboarding card:', suggestionsResult.reason);
                }

                // 3. Combine: followers first, then suggestions
                const combined = [...followedAvatars, ...suggestedAvatars].slice(0, 10);
                setAvatars(combined);
            } catch (error) {
                console.error('Failed to load avatars for onboarding card', error);
            }
        };

        if (user && user.followingCount < 10 && !isHidden) {
            loadAvatars();
        }
    }, [user, isHidden, dispatch]);

    // Only show if user follows 9 or less people
    if (isHidden || !user || user.followingCount >= 10) {
        return null;
    }

    return (
        <div className="bg-gray-50 dark:bg-[#19222e] rounded-xl p-4 relative mb-3 border border-gray-100 dark:border-transparent">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">
                    {t('sidebar.follow_ten', { defaultValue: 'Follow 10 people to get started' })}
                </h3>
                <button 
                    onClick={() => setIsHidden(true)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-[#8798b0] transition-colors"
                >
                    <FiX size={15} />
                </button>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center -space-x-2">
                    {avatars.length > 0 ? (
                        <>
                            {avatars.map((avatar, i) => (
                                <div key={i} className="h-[32px] w-[32px] rounded-full ring-2 ring-gray-50 dark:ring-[#19222e] overflow-hidden border border-gray-200 dark:border-[#232e3e] z-[10]">
                                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                                </div>
                            ))}
                            {avatars.length < 10 && [...Array(10 - avatars.length)].map((_, i) => (
                                <div key={`empty-${i}`} className="h-[32px] w-[32px] rounded-full ring-2 ring-gray-50 dark:ring-[#19222e] bg-gray-100 dark:bg-[#232e3e] flex items-center justify-center border border-gray-200 dark:border-[#232e3e]">
                                    <FiUser className="text-gray-400 dark:text-[#526580]" size={16} />
                                </div>
                            ))}
                        </>
                    ) : (
                        [...Array(10)].map((_, i) => (
                            <div key={i} className="h-[32px] w-[32px] rounded-full ring-2 ring-gray-50 dark:ring-[#19222e] bg-gray-100 dark:bg-[#232e3e] flex items-center justify-center border border-gray-200 dark:border-[#232e3e]">
                                <FiUser className="text-gray-400 dark:text-[#526580]" size={16} />
                            </div>
                        ))
                    )}
                </div>

                <Button
                    variant="primary"
                    fullWidth
                    className="rounded-full font-bold text-[14.5px] py-2.5 bg-[#006aff] hover:bg-[#005cd9] border-none"
                    onClick={() => navigate('/explore')}
                >
                    {t('sidebar.find_people', { defaultValue: 'Find people to follow' })}
                </Button>
            </div>
        </div>
    );
};

export default OnboardingCard;
