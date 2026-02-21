import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiX, FiGrid } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { fetchInterestsList } from '../../redux/slices/trendingSlice';
import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

const InterestsSection: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const { interests: INTEREST_TAGS } = useAppSelector((state: RootState) => state.trending);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        dispatch(fetchInterestsList());

        const fetchSelectedInterests = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/user/interests`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setSelectedInterests(data);
                    localStorage.setItem('selected_interests', JSON.stringify(data));
                } else {
                    // Fallback to localStorage if API fails
                    const stored = localStorage.getItem('selected_interests');
                    if (stored) setSelectedInterests(JSON.parse(stored));
                }
            } catch (error) {
                const stored = localStorage.getItem('selected_interests');
                if (stored) setSelectedInterests(JSON.parse(stored));
            }
        };

        fetchSelectedInterests();
    }, [dispatch]);

    const toggleInterest = async (interest: string) => {
        const newSelection = selectedInterests.includes(interest)
            ? selectedInterests.filter(i => i !== interest)
            : [...selectedInterests, interest];

        setSelectedInterests(newSelection);
        localStorage.setItem('selected_interests', JSON.stringify(newSelection));

        // Persist to backend
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/user/interests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newSelection)
            });
        } catch (error) {
            console.error('Failed to save interests to backend:', error);
        }
    };

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

                <div className="flex flex-wrap gap-2 mb-4">
                    {INTEREST_TAGS.slice(0, 15).map((interest: string, index: number) => {
                        const isSelected = selectedInterests.includes(interest);
                        return (
                            <button
                                key={index}
                                onClick={() => toggleInterest(interest)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full border text-sm font-medium transition-all shadow-sm",
                                    isSelected
                                        ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400'
                                        : 'bg-white dark:bg-dark-surface border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:border-primary-500 hover:text-primary-500 dark:hover:text-primary-400'
                                )}
                            >
                                {interest}
                            </button>
                        );
                    })}
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
