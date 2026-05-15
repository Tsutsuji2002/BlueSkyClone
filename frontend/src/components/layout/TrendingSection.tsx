import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiMoreHorizontal } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { fetchTrending } from '../../redux/slices/trendingSlice';
import { updateNotificationSettings } from '../../redux/slices/authSlice';
import ConfirmModal from '../common/ConfirmModal';
import { formatCount } from '../../utils/formatNumber';

const TrendingSection: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { topics, isLoading } = useAppSelector((state: RootState) => state.trending);
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    useEffect(() => {
        if (settings?.openTrendingTopics !== false) {
            dispatch(fetchTrending());
        }
    }, [dispatch, settings?.openTrendingTopics]);

    if (settings?.openTrendingTopics === false) {
        return null;
    }

    if (!isLoading && (!topics || topics.length === 0)) {
        return null;
    }

    const handleHideTrending = () => {
        dispatch(updateNotificationSettings({ openTrendingTopics: false }));
    };

    return (
        <div className="border border-[#232e3e] rounded-[12px] p-[16px] mb-4 bg-transparent">
            <div className="flex flex-row items-center gap-1 pb-[12px]">
                <svg fill="none" width="16" height="16" viewBox="0 0 24 24">
                    <path fill="#FFFFFF" d="M15 7a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9.414L14.414 15a2 2 0 0 1-2.828 0L9 12.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L7.586 11a2 2 0 0 1 2.828 0L13 13.586 18.586 8H16a1 1 0 0 1-1-1Z" />
                </svg>
                <h2 className="text-[15px] font-semibold text-white flex-1 leading-[15px]">
                    Trending
                </h2>
                <button 
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="p-1 hover:bg-white/10 rounded-full text-[#8798b0] transition-colors -mr-1.5 -mt-1.5"
                >
                    <FiMoreHorizontal size={15} />
                </button>
            </div>

            <div className="flex flex-col gap-[4px]">
                {isLoading ? (
                    <div className="py-2 flex justify-center">
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    topics && topics.slice(0, 5).map((topic, index) => (
                        <button
                            key={topic.id || topic.hashtag}
                            onClick={() => {
                                const searchUrl = topic.link || `/search?query=${encodeURIComponent(topic.hashtag)}`;
                                navigate(searchUrl);
                            }}
                            className="flex flex-row items-center justify-start group cursor-pointer hover:underline decoration-white/20"
                        >
                            <div className="flex flex-row items-center gap-1">
                                <span className="text-[13.1px] text-[#526580] min-w-[16px] leading-[17px]">
                                    {index + 1}.
                                </span>
                                <span className="text-[13.1px] text-[#a5b2c5] group-hover:text-white transition-colors truncate leading-[17px]">
                                    {topic.hashtag.replace('#', '')}
                                </span>
                            </div>
                        </button>
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
