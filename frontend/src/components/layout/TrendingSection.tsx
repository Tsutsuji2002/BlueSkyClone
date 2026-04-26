import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiX, FiChevronRight, FiMoreHorizontal } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { TrendingTopic } from '../../types';
import { fetchTrending } from '../../redux/slices/trendingSlice';
import { updateNotificationSettings } from '../../redux/slices/authSlice';
import ConfirmModal from '../common/ConfirmModal';
import { cn } from '../../utils/classNames';

const TrendingSection: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { topics: trendingTopics, isLoading } = useAppSelector((state: RootState) => state.trending);
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

    if (!isLoading && trendingTopics.length === 0) {
        return null;
    }

    const handleHideTrending = () => {
        dispatch(updateNotificationSettings({ openTrendingTopics: false }));
    };

    return (
        <div className="border border-gray-100 dark:border-dark-border rounded-2xl p-4 mb-4 bg-gray-100/30 dark:bg-dark-surface/30">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                    <svg fill="none" width="16" height="16" viewBox="0 0 24 24">
                        <path fill="currentColor" className="text-gray-900 dark:text-white" d="M15 7a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9.414L14.414 15a2 2 0 0 1-2.828 0L9 12.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L7.586 11a2 2 0 0 1 2.828 0L13 13.586 18.586 8H16a1 1 0 0 1-1-1Z" />
                    </svg>
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-dark-text">
                        {t('sidebar.trending_header', { defaultValue: 'Trending' })}
                    </h2>
                </div>
                <button 
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 dark:text-[#8798b0] transition-colors"
                >
                    <FiMoreHorizontal size={15} />
                </button>
            </div>

            <div className="flex flex-col gap-1">
                {isLoading ? (
                    <div className="py-4 flex justify-center">
                        <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    trendingTopics.slice(0, 5).map((topic: TrendingTopic, index) => (
                        <button
                            key={topic.id}
                            onClick={() => navigate(`/search?q=${encodeURIComponent('#' + topic.hashtag)}`)}
                            className="flex items-center gap-1 text-left group"
                        >
                            <span className="text-[13.1px] text-gray-500 min-w-[20px]">
                                {index + 1}.
                            </span>
                            <span className="text-[14px] font-medium text-gray-900 dark:text-[#a5b2c5] group-hover:underline truncate">
                                #{topic.hashtag}
                            </span>
                        </button>
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={isConfirmModalOpen}
                onClose={() => setIsConfirmModalOpen(false)}
                onConfirm={handleHideTrending}
                title={t('sidebar.hide_trending_title', { defaultValue: 'Hide trending topics?' })}
                message={t('sidebar.hide_trending_message', { defaultValue: 'You can always turn them back on in settings.' })}
                confirmLabel={t('sidebar.hide', { defaultValue: 'Hide' })}
                cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
                variant="danger"
            />
        </div>
    );
};


export default TrendingSection;
