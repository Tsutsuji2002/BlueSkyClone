import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import Avatar from '../common/Avatar';
import api from '../../utils/api';

const OnboardingCard: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAppSelector((state: RootState) => state.auth);
    const [suggestionData, setSuggestionData] = useState<{avatar: string, displayName: string}[]>([]);
    const [isHidden, setIsHidden] = useState(false);

    const isGoalReached = user && user.followingCount >= 10;

    // Move all hooks to the top before any early returns
    // Memoize the avatar display to avoid unnecessary re-renders
    const avatarDisplay = useMemo(() => {
        const totalSlots = 10;
        const filledSlots = Math.min(suggestionData.length, 3); // Show max 3 actual avatars
        const emptySlots = totalSlots - filledSlots;

        return (
            <div className="flex items-center">
                {/* Actual avatars (max 3) */}
                {suggestionData.slice(0, 3).map((data, i) => (
                    <div
                        key={`avatar-${i}`}
                        className="relative rounded-full border border-[#232e3e]"
                        style={{
                            width: '31.4165px',
                            height: '31.4165px',
                            marginLeft: i === 0 ? '0px' : '-7.35162px',
                            zIndex: 10 - i,
                            backgroundColor: '#111822'
                        }}
                    >
                        <Avatar
                            src={data.avatar}
                            alt={data.displayName}
                            size="sm"
                            className="!rounded-full !w-full !h-full"
                        />
                    </div>
                ))}

                {/* Placeholder avatars */}
                {[...Array(emptySlots)].map((_, i) => {
                    const zIndex = 7 - i;
                    return (
                        <div
                            key={`placeholder-${i}`}
                            className="flex items-center justify-center rounded-full border border-[#232e3e]"
                            style={{
                                width: '33.4165px',
                                height: '33.4165px',
                                marginLeft: '-7.35162px',
                                zIndex,
                                backgroundColor: '#405168'
                            }}
                        >
                            <svg
                                fill="none"
                                width="16.708229426433917"
                                height="16.708229426433917"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    fill="#19222E"
                                    d="M12.233 2a4.433 4.433 0 1 0 0 8.867 4.433 4.433 0 0 0 0-8.867ZM12.233 12.133c-3.888 0-6.863 2.263-8.071 5.435-.346.906-.11 1.8.44 2.436.535.619 1.36.996 2.25.996h10.762c.89 0 1.716-.377 2.25-.996.55-.636.786-1.53.441-2.436-1.208-3.173-4.184-5.435-8.072-5.435Z"
                                />
                            </svg>
                        </div>
                    );
                })}
            </div>
        );
    }, [suggestionData]);

    // Optimized data loading with useCallback
    const loadAvatars = useCallback(async () => {
        if (!user) return;

        try {
            // Fetch people the user already follows
            const followingResponse = await api.get<{following: any[]}>(`/users/${user.id}/following?limit=10`).catch(() => ({ data: { following: [] } }));
            const followedResults = followingResponse.data?.following || [];

            if (followedResults.length > 0) {
                setSuggestionData(followedResults.slice(0, 10).map((u: any) => ({
                    avatar: u.avatarUrl || u.avatar || '',
                    displayName: u.displayName || u.handle || '?'
                })));
            } else {
                setSuggestionData([]);
            }
        } catch (error) {
            console.error('Failed to load avatars for onboarding card', error);
        }
    }, [user]);

    useEffect(() => {
        if (user && !isHidden) {
            loadAvatars();
        }
    }, [user, isHidden, loadAvatars]);

    // Memoized event handlers
    const handleDismiss = useCallback(() => {
        setIsHidden(true);
    }, []);

    const handleFindPeople = useCallback(() => {
        navigate('/search');
    }, [navigate]);

    // Early return after all hooks are defined
    if (isHidden || !user || user.followingCount >= 50) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl p-4 relative mb-3" style={{ backgroundColor: 'rgb(25, 34, 46)' }}>
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[15px] text-white" style={{ letterSpacing: '0.25px', lineHeight: '15px' }}>
                    {isGoalReached
                        ? t('sidebar.discover_people', { defaultValue: 'Discover people to follow' })
                        : t('sidebar.follow_ten', { defaultValue: 'Follow 10 people to get started' })
                    }
                </h3>
                <button
                    onClick={handleDismiss}
                    aria-label="Dismiss getting started guide"
                    className="flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                    style={{
                        height: '25px',
                        width: '25px',
                        backgroundColor: 'rgba(0, 0, 0, 0)'
                    }}
                >
                    <div style={{ zIndex: 20, width: '15px', height: '15px', marginLeft: '0px', marginRight: '0px' }}>
                        <div style={{ position: 'absolute', width: '12px', height: '12px', top: '50%', left: '50%', transform: 'translateX(-6px) translateY(-6px)' }}>
                            <svg fill="none" width="12" viewBox="0 0 24 24" height="12" style={{ color: 'rgb(135, 152, 176)', pointerEvents: 'none' }}>
                                <path fill="#8798B0" d="M4.293 4.293a1 1 0 0 1 1.414 0L12 10.586l6.293-6.293a1 1 0 1 1 1.414 1.414L13.414 12l6.293 6.293a1 1 0 0 1-1.414 1.414L12 13.414l-6.293 6.293a1 1 0 0 1-1.414-1.414L10.586 12 4.293 5.707a1 1 0 0 1 0-1.414Z" />
                            </svg>
                        </div>
                    </div>
                </button>
            </div>

            <div className="flex flex-col gap-3">
                <div className="flex flex-row flex-1">
                    {avatarDisplay}
                </div>

                <button
                    onClick={handleFindPeople}
                    aria-label="Find people to follow"
                    className="flex items-center justify-center rounded-full transition-colors hover:opacity-90"
                    style={{
                        backgroundColor: 'rgb(0, 106, 255)',
                        padding: '8px 14px',
                        gap: '5px'
                    }}
                >
                    <span className="text-[13.1px] font-medium text-white text-center" style={{ letterSpacing: '0.25px', lineHeight: '17px' }}>
                        {t('onboarding.find_people', { defaultValue: 'Find people to follow' })}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default OnboardingCard;
