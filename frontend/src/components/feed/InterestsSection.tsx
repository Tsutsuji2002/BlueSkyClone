import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiX, FiGrid } from 'react-icons/fi';
import InterestsEditor from './InterestsEditor';

const InterestsSection: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);

    if (!isVisible) return null;

    return (
        <div className="p-4 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
            <section className="bg-gray-50/50 dark:bg-dark-surface/30 rounded-2xl p-4 border border-gray-100 dark:border-dark-border relative transition-all">
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                >
                    <FiX size={20} />
                </button>

                <div className="flex items-center gap-2 mb-4 text-primary-600 dark:text-primary-400">
                    <FiGrid size={20} />
                    <h2 className="text-lg font-bold">
                        {t('interests.title')}
                    </h2>
                </div>

                <div className="mb-4">
                    <InterestsEditor variant="condensed" limit={15} />
                </div>

                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-4 leading-normal">
                    {t('interests.widget_desc')}
                </p>

                <button
                    onClick={() => navigate('/interests')}
                    className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-full transition-colors text-sm shadow-sm"
                >
                    {t('interests.edit_btn')}
                </button>
            </section>
        </div>
    );
};

export default InterestsSection;
