import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiGrid } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../utils/classNames';

const InterestsWidget: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(true);

    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    const loadInterests = () => {
        const storedInterests = localStorage.getItem('selected_interests');
        const current = storedInterests ? JSON.parse(storedInterests) : [];
        setSelectedInterests(current);
    }

    useEffect(() => {
        loadInterests();
    }, []); // Reload when mounted

    if (!isVisible) return null;

    const displayInterests = selectedInterests.slice(0, 10); // Show max 10 chips

    return (
        <div className="bg-gray-50/50 dark:bg-dark-surface rounded-[24px] p-5 mb-4 relative border border-gray-100 dark:border-dark-border">
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:text-dark-text-secondary dark:hover:text-dark-text rounded-full transition-colors"
            >
                <FiX size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4">
                <div className="text-primary-500">
                    <FiGrid className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                    {t('interests.title')}
                </h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {displayInterests.map((interest: string) => (
                    <span
                        key={interest}
                        className="px-3 py-1.5 rounded-full bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-sm font-medium text-gray-700 dark:text-dark-text shadow-sm"
                    >
                        {interest}
                    </span>
                ))}
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
        </div>
    );
};

export default InterestsWidget;
