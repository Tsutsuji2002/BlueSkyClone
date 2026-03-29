import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiX, FiUserPlus } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import Button from '../common/Button';
import agent from '../../services/atpAgent';

const OnboardingCard: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAppSelector((state: RootState) => state.auth);
    const [suggestedAvatars, setSuggestedAvatars] = useState<string[]>([]);
    const [isHidden, setIsHidden] = useState(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                // Fetch suggestions to get avatars for the UI
                const response = await agent.app.bsky.actor.getSuggestions({ limit: 12 });
                if (response.success) {
                    const avatars = response.data.actors
                        .map((a: any) => a.avatar)
                        .filter(Boolean);
                    setSuggestedAvatars(avatars.slice(0, 9));
                }
            } catch (error) {
                console.error('Failed to fetch suggestions for onboarding card', error);
            }
        };

        if (user && user.followingCount < 10 && !isHidden) {
            fetchSuggestions();
        }
    }, [user?.followingCount, isHidden]);

    // Only show if user follows 9 or less people
    if (isHidden || !user || user.followingCount >= 10) {
        return null;
    }

    return (
        <div className="bg-[#15202b] dark:bg-[#15202b] rounded-2xl p-5 relative border border-gray-800 shadow-sm mb-4">
            <button 
                onClick={() => setIsHidden(true)}
                className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full text-gray-400 transition-colors"
                aria-label="Close"
            >
                <FiX size={18} />
            </button>

            <div className="flex flex-col gap-4">
                <h3 className="font-bold text-[17px] text-white pr-6 leading-tight">
                    {t('sidebar.follow_ten', { defaultValue: 'Follow 10 people to get started' })}
                </h3>

                <div className="flex items-center -space-x-2">
                    {suggestedAvatars.length > 0 ? (
                        suggestedAvatars.map((avatar, i) => (
                            <img 
                                key={i} 
                                src={avatar} 
                                alt="" 
                                className="h-9 w-9 rounded-full ring-2 ring-[#15202b] object-cover bg-gray-800"
                            />
                        ))
                    ) : (
                        // Skeleton placeholders
                        [...Array(6)].map((_, i) => (
                            <div key={i} className="h-9 w-9 rounded-full ring-2 ring-[#15202b] bg-gray-700 animate-pulse" />
                        ))
                    )}
                    {(suggestedAvatars.length >= 9 || suggestedAvatars.length === 0) && (
                        <div className="h-9 w-9 rounded-full ring-2 ring-[#15202b] bg-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold">
                            {user.followingCount}/10
                        </div>
                    )}
                </div>

                <Button
                    variant="primary"
                    fullWidth
                    className="rounded-full font-bold text-[15px] py-2.5 bg-[#0085ff] hover:bg-[#0074e0] border-none flex items-center justify-center gap-2"
                    onClick={() => navigate('/explore')}
                >
                    <FiUserPlus size={18} />
                    {t('sidebar.find_people', { defaultValue: 'Find people to follow' })}
                </Button>
            </div>
        </div>
    );
};

export default OnboardingCard;
