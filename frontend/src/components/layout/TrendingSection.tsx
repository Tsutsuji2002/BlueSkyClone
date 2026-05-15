import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiX, FiChevronRight, FiMoreHorizontal } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { Feed } from '../../types';
import { fetchTrendingFeeds } from '../../redux/slices/feedsSlice';
import { updateNotificationSettings } from '../../redux/slices/authSlice';
import ConfirmModal from '../common/ConfirmModal';
import { cn } from '../../utils/classNames';

const TrendingSection: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { trendingFeeds, isLoading } = useAppSelector((state: RootState) => state.feeds);
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        if (settings?.openTrendingTopics !== false) {
            dispatch(fetchTrendingFeeds({ limit: 5 }));
        }
    }, [dispatch, settings?.openTrendingTopics]);

    if (settings?.openTrendingTopics === false) {
        return null;
    }

    if (!isLoading && (!trendingFeeds || trendingFeeds.length === 0)) {
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
                        {t('sidebar.trending_header', { defaultValue: 'Trending Feeds' })}
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
                    trendingFeeds && trendingFeeds.slice(0, 5).map((feed: Feed, index) => (
                        <button
                            key={feed.id || feed.uri}
                            onClick={() => {
                                navigate(`/profile/${feed.creator?.handle || feed.creator?.did || 'unknown'}/feed/${feed.tid || feed.uri?.split('/').pop() || ''}`);
                            }}
                            className="flex items-center gap-3 text-left group cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition p-2 rounded -mx-2"
                        >
                            <span className="text-[13px] font-medium text-gray-500 min-w-[12px]">
                                {index + 1}.
                            </span>
                            <div className="w-6 h-6 rounded bg-primary-100 flex-shrink-0 overflow-hidden relative">
                                {feed.avatarUrl ? (
                                    <img src={feed.avatarUrl} alt={feed.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                                        <span className="text-white text-[10px] uppercase">{feed.name.substring(0, 2)}</span>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className="text-[14px] font-medium text-gray-900 dark:text-[#a5b2c5] group-hover:text-primary-500 dark:group-hover:text-primary-400 transition truncate block">
                                    {feed.name}
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
                title={t('sidebar.hide_trending_title', { defaultValue: 'Hide trending feeds?' })}
                message={t('sidebar.hide_trending_message', { defaultValue: 'You can always turn them back on in settings.' })}
                confirmLabel={t('sidebar.hide', { defaultValue: 'Hide' })}
                cancelLabel={t('common.cancel', { defaultValue: 'Cancel' })}
                variant="danger"
            />
        </div>
    );
};

export default TrendingSection;
