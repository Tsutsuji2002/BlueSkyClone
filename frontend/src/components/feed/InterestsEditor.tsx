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

const DEFAULT_INTERESTS = [
    "Animals", "Art", "Books", "Comedy", "Comics", "Culture",
    "Software Dev", "Education", "Finance", "Food", "Video Games",
    "Journalism", "Movies", "Music", "Nature", "News", "Pets",
    "Photography", "Politics", "Science", "Sports", "Tech", "TV", "Writers"
];

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

    // Combine availableInterests with DEFAULT_INTERESTS while preserving order and removing duplicates
    const combinedInterests = Array.from(
        new Set([...(availableInterests && availableInterests.length > 0 ? availableInterests : []), ...DEFAULT_INTERESTS])
    );

    const displayInterests = limit ? combinedInterests.slice(0, limit) : combinedInterests;

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
        <div className="flex flex-col gap-4">
            {selectedInterests.length < 2 && (
                <div className="p-3 rounded-lg border border-[#006aff] bg-white dark:bg-dark-surface flex flex-row items-center gap-2">
                    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
                        <path fill="#006AFF" fillRule="evenodd" clipRule="evenodd" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12Zm8-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0v-4a1 1 0 0 1-1-1Zm1-3a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z"></path>
                    </svg>
                    <div className="flex-1 text-[13.1px] leading-[17px] text-black dark:text-white">
                        We recommend selecting at least two interests.
                    </div>
                </div>
            )}

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
                                    "px-5 py-3 rounded-full text-[13.1px] font-semibold transition-all",
                                    isSelected
                                        ? 'bg-[#232e3e] dark:bg-white text-white dark:text-black shadow-sm'
                                        : 'bg-[#eff2f6] dark:bg-[#1f2937] text-[#232e3e] dark:text-gray-200 hover:bg-[#e2e8f0] dark:hover:bg-[#374151]'
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
                                "px-3.5 py-2 rounded-full text-[13.1px] font-semibold transition-all",
                                isSelected
                                    ? 'bg-[#232e3e] dark:bg-white text-white dark:text-black'
                                    : 'bg-[#eff2f6] dark:bg-[#1a2332] text-[#232e3e] dark:text-gray-300 hover:bg-[#e2e8f0] dark:hover:bg-[#2c3b54]'
                            )}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default InterestsEditor;
