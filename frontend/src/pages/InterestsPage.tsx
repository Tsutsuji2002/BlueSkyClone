import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import MainLayout from '../components/layout/MainLayout';

import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { RootState } from '../redux/store';
import { fetchInterestsList } from '../redux/slices/trendingSlice';

const InterestsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { interests: INTEREST_TAGS } = useAppSelector((state: RootState) => state.trending);
    const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

    useEffect(() => {
        dispatch(fetchInterestsList());

        const stored = localStorage.getItem('selected_interests');
        if (stored) {
            setSelectedInterests(JSON.parse(stored));
        } else {
            setSelectedInterests(['art', 'books', 'developers', 'technology']);
        }
    }, [dispatch]);

    const toggleInterest = (interest: string) => {
        const newSelection = selectedInterests.includes(interest)
            ? selectedInterests.filter(i => i !== interest)
            : [...selectedInterests, interest];

        setSelectedInterests(newSelection);
        localStorage.setItem('selected_interests', JSON.stringify(newSelection));
    };

    return (
        <MainLayout>
            <div className="bg-white dark:bg-dark-bg min-h-screen">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('content.my_interests')}
                    </h1>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-gray-500 dark:text-dark-text-secondary mb-6 leading-relaxed border-b border-gray-100 dark:border-dark-border pb-4">
                        {t('content.my_interests_desc')}
                    </p>

                    <div className="flex flex-wrap gap-3">
                        {INTEREST_TAGS.map((tag) => {
                            const isSelected = selectedInterests.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    onClick={() => toggleInterest(tag)}
                                    className={`px-5 py-2 rounded-full text-[15px] font-bold transition-all ${isSelected
                                        ? 'bg-gray-900 border-gray-900 text-white dark:bg-white dark:border-white dark:text-black'
                                        : 'bg-gray-100 border-transparent text-gray-900 dark:bg-dark-surface dark:text-dark-text hover:bg-gray-200 dark:hover:bg-dark-hover border dark:border-dark-border'
                                        }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default InterestsPage;
