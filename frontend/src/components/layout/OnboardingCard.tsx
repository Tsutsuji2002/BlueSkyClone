import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiX, FiUser } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import Button from '../common/Button';
import Avatar from '../common/Avatar';
import agent from '../../services/atpAgent';

const OnboardingCard: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAppSelector((state: RootState) => state.auth);
    const [suggestionData, setSuggestionData] = useState<{avatar: string, displayName: string}[]>([]);
    const [isHidden, setIsHidden] = useState(false);

    const isGoalReached = user && user.followingCount >= 10;
    
    useEffect(() => {
        const loadAvatars = async () => {
            if (!user) return;

            try {
                // 1. Fetch people the user already follows
                const actor = user.did || user.handle;
                
                const [followingResult, suggestionsResult] = await Promise.allSettled([
                    agent.app.bsky.graph.getFollows({ actor, limit: 10 }),
                    agent.app.bsky.actor.getSuggestions({ limit: 15 })
                ]);

                let followedResults: any[] = [];
                if (followingResult.status === 'fulfilled') {
                    const val = followingResult.value as any;
                    followedResults = val.data?.follows || val.follows || [];
                }

                let suggestedResults: any[] = [];
                if (suggestionsResult.status === 'fulfilled') {
                    const val = suggestionsResult.value as any;
                    const actors = val.data?.actors || val.actors || [];
                    const followedDids = new Set(followedResults.map(u => u.did));
                    suggestedResults = actors.filter((a: any) => a && a.did && !followedDids.has(a.did));
                }

                // 3. Combine: followers first, then suggestions
                const combined = [...followedResults, ...suggestedResults].slice(0, 10);
                
                if (combined.length > 0) {
                    setSuggestionData(combined.map(u => ({
                        avatar: u.avatar || '',
                        displayName: u.displayName || u.handle || '?'
                    })));
                } else {
                    // Emergency local fallback if both remote calls return empty (though network says 200)
                    console.warn('OnboardingCard: Both following and suggestions results were empty.');
                }
            } catch (error) {
                console.error('Failed to load avatars for onboarding card', error);
            }
        };

        if (user && !isHidden) {
            loadAvatars();
        }
    }, [user, isHidden]);

    // Show suggestions for longer, or permanently
    if (isHidden || !user || user.followingCount >= 50) {
        return null;
    }

    return (
        <div className="bg-gray-50 dark:bg-[#19222e] rounded-xl p-4 relative mb-3 border border-gray-100 dark:border-transparent">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[15px] text-gray-900 dark:text-white">
                    {isGoalReached 
                        ? t('sidebar.discover_people', { defaultValue: 'Discover people to follow' })
                        : t('sidebar.follow_ten', { defaultValue: 'Follow 10 people to get started' })
                    }
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
                    {suggestionData.length > 0 ? (
                        <>
                            {suggestionData.map((data, i) => (
                                <Avatar
                                    key={i}
                                    src={data.avatar}
                                    alt={data.displayName}
                                    size="sm"
                                    className="ring-2 ring-gray-50 dark:ring-[#19222e] z-[10]"
                                />
                            ))}
                            {suggestionData.length < 10 && [...Array(10 - suggestionData.length)].map((_, i) => (
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
                    size="md" 
                    onClick={() => navigate('/search')}
                    className="mt-2 font-bold py-2.5 rounded-full"
                >
                    {t('onboarding.find_people', { defaultValue: 'Tìm người để theo dõi' })} 
                    {suggestionData.length > 0 ? ` (${suggestionData.length})` : ''}
                </Button>
            </div>
        </div>
    );
};

export default OnboardingCard;
