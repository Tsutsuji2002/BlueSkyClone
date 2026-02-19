import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiX } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { TrendingTopic } from '../../types';

const TrendingSection: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { topics: trendingTopics } = useAppSelector((state: RootState) => state.trending);
    const settings = useAppSelector((state: RootState) => state.auth.settings);

    if (settings?.openTrendingTopics === false) {
        return null;
    }

    return (
        <div className="bg-gray-50 dark:bg-dark-surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <FiTrendingUp className="text-primary-500" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                        {t('sidebar.trending_header', { defaultValue: 'Chủ đề nổi trội' })}
                    </h2>
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <FiX size={18} />
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {trendingTopics.map((topic: TrendingTopic) => (
                    <button
                        key={topic.id}
                        onClick={() => navigate(`/trending/${topic.hashtag.replace('#', '')}`)}
                        className="px-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-full text-sm font-semibold text-gray-900 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors"
                    >
                        {topic.hashtag.replace('#', '')}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default TrendingSection;
