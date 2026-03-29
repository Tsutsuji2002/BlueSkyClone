import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { RootState } from '../../redux/store';
import { fetchInterestsList } from '../../redux/slices/trendingSlice';
import { fetchSelectedInterests, saveSelectedInterests } from '../../redux/slices/userSlice';
import { cn } from '../../utils/classNames';

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
    const { selectedInterests, interestsLoading } = useAppSelector((state: RootState) => state.user);

    useEffect(() => {
        dispatch(fetchInterestsList());
        dispatch(fetchSelectedInterests());
    }, [dispatch]);

    useEffect(() => {
        if (onSelectionChange) onSelectionChange(selectedInterests);
    }, [selectedInterests, onSelectionChange]);

    const toggleInterest = (interest: string) => {
        const isPresent = selectedInterests.some(i => i.toLowerCase() === interest.toLowerCase());
        const newSelection = isPresent
            ? selectedInterests.filter(i => i.toLowerCase() !== interest.toLowerCase())
            : [...selectedInterests, interest];

        dispatch(saveSelectedInterests(newSelection));
    };

    const displayInterests = limit ? availableInterests.slice(0, limit) : availableInterests;

    if (interestsLoading && availableInterests.length === 0) {
        return (
            <div className="flex flex-wrap gap-2 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-8 w-20 bg-gray-200 dark:bg-dark-surface rounded-full" />
                ))}
            </div>
        );
    }

    return (
        <div className={cn("flex flex-wrap", variant === 'full' ? "gap-2.5" : "gap-2")}>
            {displayInterests.map((interest: string, index: number) => {
                const isSelected = selectedInterests.some(i => i.toLowerCase() === interest.toLowerCase());
                const label = t(`interests_tags.${interest.toLowerCase()}`, interest);

                if (variant === 'full') {
                    return (
                        <button
                            key={index}
                            onClick={() => toggleInterest(interest)}
                            className={cn(
                                "px-4 py-2 rounded-full text-[14px] font-bold transition-all",
                                isSelected
                                    ? 'bg-primary-500 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-[#1f2937] text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-[#374151]'
                            )}
                        >
                            {label}
                        </button>
                    );
                }

                return (
                    <button
                        key={index}
                        onClick={() => toggleInterest(interest)}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-[14px] font-bold transition-all",
                            isSelected
                                ? 'bg-primary-500 text-white'
                                : 'bg-gray-100 dark:bg-[#1a2332] text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2c3b54]'
                        )}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
};

export default InterestsEditor;
