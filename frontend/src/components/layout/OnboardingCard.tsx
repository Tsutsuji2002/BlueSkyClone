import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiX, FiUsers } from 'react-icons/fi';
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
        <div className="bg-[#19222e] rounded-xl p-4 relative mb-3">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[15px] text-white">
                    {t('sidebar.follow_ten', { defaultValue: 'Follow 10 people to get started' })}
                </h3>
                <button 
                    onClick={() => setIsHidden(true)}
                    className="p-1 hover:bg-white/10 rounded-full text-[#8798b0] transition-colors"
                >
                    <FiX size={15} />
                </button>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex items-center -space-x-2">
                    {suggestedAvatars.length > 0 ? (
                        <>
                            {suggestedAvatars.map((avatar, i) => (
                                <div key={i} className="h-[32px] w-[32px] rounded-full ring-2 ring-[#19222e] overflow-hidden border border-[#232e3e]">
                                    <img src={avatar} alt="" className="h-full w-full object-cover" />
                                </div>
                            ))}
                            {suggestedAvatars.length < 5 && [...Array(5 - suggestedAvatars.length)].map((_, i) => (
                                <div key={`empty-${i}`} className="h-[32px] w-[32px] rounded-full ring-2 ring-[#19222e] bg-[#232e3e] flex items-center justify-center border border-[#232e3e]">
                                    <FiUsers className="text-[#526580]" size={16} />
                                </div>
                            ))}
                        </>
                    ) : (
                        [...Array(7)].map((_, i) => (
                            <div key={i} className="h-[32px] w-[32px] rounded-full ring-2 ring-[#19222e] bg-[#232e3e] flex items-center justify-center border border-[#232e3e]">
                                <FiUsers className="text-[#526580]" size={16} />
                            </div>
                        ))
                    )}
                </div>

                <Button
                    variant="primary"
                    fullWidth
                    className="rounded-full font-medium text-[13.1px] py-2 bg-[#006aff] hover:bg-[#005cd9] border-none"
                    onClick={() => navigate('/explore')}
                >
                    {t('sidebar.find_people', { defaultValue: 'Find people to follow' })}
                </Button>
            </div>
        </div>
    );
};

export default OnboardingCard;
