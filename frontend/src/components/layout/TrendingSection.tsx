import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiX, FiChevronRight } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { TrendingTopic } from '../../types';
import { fetchTrending } from '../../redux/slices/trendingSlice';
import { cn } from '../../utils/classNames';

const TrendingSection: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { topics: trendingTopics, isLoading } = useAppSelector((state: RootState) => state.trending);
    const settings = useAppSelector((state: RootState) => state.auth.settings);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (settings?.openTrendingTopics !== false) {
            dispatch(fetchTrending());
        }
    }, [dispatch, settings?.openTrendingTopics]);

    if (!isVisible || settings?.openTrendingTopics === false) {
        return null;
    }

    if (!isLoading && trendingTopics.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-50 dark:bg-dark-surface rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                    <FiTrendingUp className="text-blue-500" size={18} />
                    <h2 className="text-[17px] font-bold text-gray-900 dark:text-dark-text">
                        {t('sidebar.trending_header', { defaultValue: 'Trending Topics' })}
                    </h2>
                </div>
                <button
                    onClick={() => setIsVisible(false)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-dark-hover rounded-full text-gray-400 transition-colors"
                >
                    <FiX size={18} />
                </button>
            </div>

            <div className="flex flex-col">
                {isLoading ? (
                    <div className="p-8 flex justify-center">
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    trendingTopics.slice(0, 5).map((topic: TrendingTopic) => (
                        <button
                            key={topic.id}
                            onClick={() => navigate(`/search?q=${encodeURIComponent(topic.hashtag)}`)}
                            className="flex flex-col px-4 py-3 hover:bg-gray-200/50 dark:hover:bg-dark-hover transition-colors text-left group"
                        >
                            <span className="text-[15px] font-bold text-primary-500 group-hover:underline leading-tight">
                                {topic.hashtag}
                            </span>
                            {topic.postsCount !== undefined && (
                                <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary mt-0.5">
                                    {topic.postsCount} {t('common.posts', { defaultValue: 'posts' })}
                                </span>
                            )}
                        </button>
                    ))
                )}
            </div>

            {!isLoading && trendingTopics.length > 5 && (
                <button
                    onClick={() => navigate('/trending')}
                    className="w-full flex items-center justify-between px-4 py-3 text-primary-500 hover:bg-gray-200/50 dark:hover:bg-dark-hover transition-colors text-[15px] font-medium"
                >
                    {t('common.show_more', { defaultValue: 'Hiển thị thêm' })}
                    <FiChevronRight size={18} />
                </button>
            )}
        </div>
    );
};

export default TrendingSection;
