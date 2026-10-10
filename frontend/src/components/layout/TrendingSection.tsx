import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMoreHorizontal } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { fetchTrending } from '../../redux/slices/trendingSlice';
import { useUpdateSettingsMutation } from '../../redux/api/authApi';
import ConfirmModal from '../common/ConfirmModal';
import { formatCount } from '../../utils/formatNumber';

import { TrendingTopic } from '../../types';

const TrendingSection: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [updateSettings] = useUpdateSettingsMutation();
    const { t } = useTranslation();
    const { topics, isLoading } = useAppSelector((state: RootState) => state.trending);
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const hasAttemptedRef = React.useRef(false);

    useEffect(() => {
        if ((!topics || topics.length === 0) && !hasAttemptedRef.current && !isLoading) {
            if (settings?.openTrendingTopics !== false) {
                hasAttemptedRef.current = true;
                dispatch(fetchTrending());
            }
        }
    }, [dispatch, topics, settings?.openTrendingTopics, isLoading]);

    if (settings?.openTrendingTopics === false) {
        return null;
    }

    const FALLBACK_TOPICS: TrendingTopic[] = [
        { id: '1', hashtag: 'Science', displayName: 'Science', postsCount: 14200 },
        { id: '2', hashtag: 'Bluesky', displayName: 'Bluesky', postsCount: 89000 },
        { id: '3', hashtag: 'Technology', displayName: 'Technology', postsCount: 34500 },
        { id: '4', hashtag: 'Photography', displayName: 'Photography', postsCount: 21300 },
        { id: '5', hashtag: 'Art', displayName: 'Art', postsCount: 51200 },
    ];

    const displayTopics = (topics && topics.length > 0) ? topics : (!isLoading ? FALLBACK_TOPICS : []);

    const handleHideTrending = () => {
        updateSettings({ openTrendingTopics: false });
    };

    return (
        <div className="border border-[#DCE2EA] dark:border-[#232E3E] rounded-[12px] p-[16px] bg-white dark:bg-black transition-colors">
            <div className="flex flex-row items-center gap-[4px] pb-[12px]">
                <svg fill="none" width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" className="text-black dark:text-white" fillRule="evenodd" clipRule="evenodd" d="M15 7a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9.414L14.414 15a2 2 0 0 1-2.828 0L9 12.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L7.586 11a2 2 0 0 1 2.828 0L13 13.586 18.586 8H16a1 1 0 0 1-1-1Z" />
                </svg>
                <div className="text-[15px] font-[600] text-black dark:text-white flex-1 leading-[20px]">
                    Trending
                </div>
                <button 
                    type="button"
                    aria-label="Trending options"
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="flex flex-row items-center justify-center h-[25px] w-[25px] rounded-[999px] bg-transparent hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                    <div className="z-20 w-[15px] h-[15px] relative flex items-center justify-center">
                        <svg fill="none" width="12" height="12" viewBox="0 0 24 24" className="text-[#526580] pointer-events-none">
                            <path fill="#526580" fillRule="evenodd" clipRule="evenodd" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                        </svg>
                    </div>
                </button>
            </div>

            <div className="flex flex-col gap-[4px]">
                {isLoading && (!displayTopics || displayTopics.length === 0) ? (
                    <div className="py-1 flex flex-col gap-[4px]">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-[4px] py-[2px] animate-pulse">
                                <div className="text-[13.1px] text-[#8798B0] leading-[17px] min-w-[16px]">{i}.</div>
                                <div className="h-[14px] bg-gray-200 dark:bg-white/10 rounded w-3/4" />
                            </div>
                        ))}
                    </div>
                ) : (
                    displayTopics.slice(0, 5).map((topic, index) => (
                        <div
                            key={topic.id || topic.hashtag}
                            onClick={() => {
                                const rawLink = topic.link || topic.uri;
                                if (rawLink) {
                                    if (rawLink.startsWith('/')) {
                                        navigate(rawLink);
                                        return;
                                    }
                                    if (rawLink.startsWith('at://')) {
                                        navigate(`/feeds/${encodeURIComponent(rawLink)}`);
                                        return;
                                    }
                                    if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
                                        try {
                                            const url = new URL(rawLink);
                                            navigate(url.pathname);
                                            return;
                                        } catch (e) {}
                                    }
                                }
                                const label = topic.displayName || topic.hashtag || '';
                                if (label.startsWith('#')) {
                                    navigate(`/tag/${encodeURIComponent(label.slice(1))}`);
                                } else {
                                    navigate(`/search?q=${encodeURIComponent(label)}`);
                                }
                            }}
                            className="flex flex-row items-center justify-start group cursor-pointer w-full min-w-0"
                        >
                            <div className="flex-1 flex flex-row items-baseline gap-[4px] min-w-0">
                                <div className="text-[13.1px] text-[#8798B0] leading-[17px] min-w-[16px] shrink-0 font-[400]">
                                    {index + 1}.
                                </div>
                                <div className="text-[13.1px] text-[#405168] dark:text-[#dce2ea] leading-[17px] flex-1 font-[400] truncate group-hover:underline">
                                    {topic.displayName || topic.hashtag.replace('#', '')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleHideTrending}
                title={t('sidebar.hide_trending_title', { defaultValue: 'Hide trending?' })}
                message={t('sidebar.hide_trending_message', { defaultValue: 'You can always turn them back on in settings.' })}
                confirmLabel={t('sidebar.hide', { defaultValue: 'Hide' })}
                cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
                variant="danger"
            />
        </div>
    );
};

export default TrendingSection;
