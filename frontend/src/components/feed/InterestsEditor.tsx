import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { fetchInterestsList } from '../../redux/slices/trendingSlice';
import { cn } from '../../utils/classNames';
import { API_BASE_URL } from '../../constants';

interface InterestsEditorProps {
    variant?: 'condensed' | 'full';
    limit?: number;
    onSelectionChange?: (selected: string[]) => void;
}

const InterestsEditor: React.FC<InterestsEditorProps> = ({
    variant = 'condensed',
    limit,
    onSelectionChange
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { interests: availableInterests } = useAppSelector((state: RootState) => state.trending);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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
                    // Sync with localStorage for legacy/offline support
                    localStorage.setItem('selected_interests', JSON.stringify(data));
                    if (onSelectionChange) onSelectionChange(data);
                } else {
                    const stored = localStorage.getItem('selected_interests');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        setSelectedInterests(parsed);
                        if (onSelectionChange) onSelectionChange(parsed);
                    }
                }
            } catch (error) {
                const stored = localStorage.getItem('selected_interests');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    setSelectedInterests(parsed);
                    if (onSelectionChange) onSelectionChange(parsed);
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchSelectedInterests();
    }, [dispatch, onSelectionChange]);

    const toggleInterest = async (interest: string) => {
        const newSelection = selectedInterests.includes(interest)
            ? selectedInterests.filter(i => i !== interest)
            : [...selectedInterests, interest];

        setSelectedInterests(newSelection);
        localStorage.setItem('selected_interests', JSON.stringify(newSelection));
        if (onSelectionChange) onSelectionChange(newSelection);

        // Persist to backend
        try {
            const token = localStorage.getItem('token');
            if (token) {
                await fetch(`${API_BASE_URL}/user/interests`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newSelection)
                });
            }
        } catch (error) {
            console.error('Failed to save interests to backend:', error);
        }
    };

    const displayInterests = limit ? availableInterests.slice(0, limit) : availableInterests;

    if (isLoading && availableInterests.length === 0) {
        return (
            <div className="flex flex-wrap gap-2 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-dark-surface rounded-full" />
                ))}
            </div>
        );
    }

    return (
        <div className={cn("flex flex-wrap", variant === 'full' ? "gap-3" : "gap-2")}>
            {displayInterests.map((interest: string, index: number) => {
                const isSelected = selectedInterests.includes(interest);

                if (variant === 'full') {
                    return (
                        <button
                            key={index}
                            onClick={() => toggleInterest(interest)}
                            className={cn(
                                "px-5 py-2 rounded-full text-[15px] font-bold transition-all border",
                                isSelected
                                    ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black shadow-md'
                                    : 'bg-gray-100 border-transparent text-gray-900 dark:bg-dark-surface dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-hover dark:border-dark-border'
                            )}
                        >
                            {interest}
                        </button>
                    );
                }

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
    );
};

export default InterestsEditor;
