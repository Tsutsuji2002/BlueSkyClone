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

const TrendingSection: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [updateSettings] = useUpdateSettingsMutation();
    const { t } = useTranslation();
    const { topics, isLoading } = useAppSelector((state: RootState) => state.trending);
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

    // [OPTIMIZATION] The trending topics are now hydrated via the consolidated handshake 
    // in App.tsx. We don't need a separate fetch here unless topics are empty.
    const handshakeSettled = useAppSelector((state: RootState) => state.user.handshakeSettled);
    const [hasAttempted, setHasAttempted] = useState(false);

    useEffect(() => {
        if (handshakeSettled && (!topics || topics.length === 0) && !hasAttempted && !isLoading) {
            if (settings?.openTrendingTopics !== false) {
                setHasAttempted(true);
                dispatch(fetchTrending());
            }
        }
    }, [dispatch, topics, settings?.openTrendingTopics, handshakeSettled, hasAttempted, isLoading]);


    if (settings?.openTrendingTopics === false) {
        return null;
    }

    if (!isLoading && (!topics || topics.length === 0)) {
        return null;
    }

    const handleHideTrending = () => {
        updateSettings({ openTrendingTopics: false });
    };

    return (
        <div className="border border-[#DCE2EA] dark:border-[#232E3E] rounded-[16px] p-4 bg-white dark:bg-black transition-colors">
            <div className="flex flex-row items-center gap-1.5 pb-3">
                <svg fill="none" width="16" height="16" viewBox="0 0 24 24">
                    <path fill="currentColor" className="text-gray-900 dark:text-white" d="M15 7a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9.414L14.414 15a2 2 0 0 1-2.828 0L9 12.414l-5.293 5.293a1 1 0 0 1-1.414-1.414L7.586 11a2 2 0 0 1 2.828 0L13 13.586 18.586 8H16a1 1 0 0 1-1-1Z" />
                </svg>
                <h2 className="text-[15px] font-bold text-gray-900 dark:text-white flex-1 leading-tight">
                    Trending
                </h2>
                <button 
                    onClick={() => setIsConfirmModalOpen(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-[#8798b0] transition-colors -mr-1"
                >
                    <FiMoreHorizontal size={15} />
                </button>
            </div>

            <div className="flex flex-col gap-1">
                {isLoading ? (
                    <div className="py-2 flex justify-center">
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    topics && topics.slice(0, 5).map((topic, index) => (
                        <button
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
                            className="flex flex-row items-center justify-start group cursor-pointer w-full min-w-0 py-1"
                        >
                            <div className="flex flex-row items-baseline gap-1.5 min-w-0 w-full text-left">
                                <span className="text-[13.5px] font-medium text-[#526580] dark:text-[#8798b0] min-w-[16px] shrink-0">
                                    {index + 1}.
                                </span>
                                <span className="text-[13.5px] font-semibold text-gray-900 dark:text-[#e1e7ef] group-hover:text-primary-500 dark:group-hover:text-white group-hover:underline transition-colors truncate">
                                    {topic.displayName || topic.hashtag.replace('#', '')}
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
