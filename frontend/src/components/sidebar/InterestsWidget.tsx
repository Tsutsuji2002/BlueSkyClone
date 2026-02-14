import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiPlus } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

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
        <div className="bg-gray-50 dark:bg-dark-surface rounded-2xl p-4 mb-4 relative">
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 dark:text-dark-text-secondary dark:hover:text-dark-text rounded-full transition-colors"
            >
                <FiX size={16} />
            </button>

            <div className="flex items-center gap-2 mb-3">
                <div className="text-blue-600">
                    <FiPlus className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    {t('interests.title')}
                </h2>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                {displayInterests.map((interest: string) => (
                    <span
                        key={interest}
                        className="px-3 py-1.5 rounded-md bg-gray-200 dark:bg-dark-bg text-sm font-medium text-gray-700 dark:text-dark-text"
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
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-colors text-sm"
            >
                {t('interests.edit_btn')}
            </button>
        </div>
    );
};

export default InterestsWidget;
