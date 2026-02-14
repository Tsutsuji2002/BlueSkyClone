import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../constants';

const InterestsSection: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const loadInterests = async () => {
        const storedInterests = localStorage.getItem('selected_interests');
        if (storedInterests) {
            setSelectedInterests(JSON.parse(storedInterests));
        } else {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_BASE_URL}/Interests`);
                if (response.ok) {
                    const data = await response.json();
                    // Take top 4-5 interests if many exist
                    const interests = data.slice(0, 5).map((i: any) => i.name);
                    setSelectedInterests(interests);
                }
            } catch (error) {
                console.error('Failed to fetch interests:', error);
            } finally {
                setIsLoading(false);
            }
        }
    }

    useEffect(() => {
        loadInterests();
    }, []);

    return (
        <div className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border p-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">
                {t('interests.title')}
            </h2>

            <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary mb-4">
                {t('interests.widget_desc')}
            </p>

            <div className="flex flex-wrap gap-2 mb-4">
                {selectedInterests.map((interest: string) => (
                    <span
                        key={interest}
                        className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/10 text-[15px] font-medium text-gray-700 dark:text-dark-text"
                    >
                        {interest}
                    </span>
                ))}
            </div>

            <button
                type="button"
                onClick={() => navigate('/interests')}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-full transition-colors text-[15px]"
            >
                {t('interests.edit_btn')}
            </button>
        </div>
    );
};

export default InterestsSection;
