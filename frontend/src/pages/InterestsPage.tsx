import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import InterestsEditor from '../components/feed/InterestsEditor';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';

const InterestsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { interestsSaving, interestsToastTimestamp } = useAppSelector((state: RootState) => state.user);
    const [showToast, setShowToast] = useState(false);

    useDocumentTitle(t('content.my_interests'));

    useEffect(() => {
        if (interestsToastTimestamp) {
            setShowToast(true);
            const timer = setTimeout(() => {
                setShowToast(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [interestsToastTimestamp]);

    return (
        <div className="bg-white dark:bg-dark-bg min-h-screen relative">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-hover rounded-full transition-colors"
                        aria-label="Go back"
                    >
                        <FiArrowLeft size={20} className="text-gray-900 dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('content.my_interests')}
                    </h1>
                </div>

                {interestsSaving && (
                    <div className="w-4 h-4 border-2 border-[#dce2ea] dark:border-gray-600 border-t-black dark:border-t-white rounded-full animate-spin shrink-0 mr-2" />
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col gap-4">
                <div className="text-[13.1px] leading-[17px] text-[#405168] dark:text-dark-text-secondary">
                    Your selected interests help us serve you content you care about.
                </div>
                <div className="w-full border-t border-[#dce2ea] dark:border-dark-border" />

                <InterestsEditor variant="full" />
            </div>

            {/* Success Toast Notification */}
            {showToast && (
                <div className="fixed bottom-6 left-6 z-50 bg-white dark:bg-[#161e27] border border-[#e2e8f0] dark:border-dark-border rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center gap-3 animate-fadeIn">
                    <svg fill="none" viewBox="0 0 24 24" width="20" height="20" className="text-black dark:text-white shrink-0">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                        <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 12l3 3 5-5" />
                    </svg>
                    <span className="text-[14px] font-semibold text-black dark:text-white">
                        Your interests have been updated!
                    </span>
                </div>
            )}
        </div>
    );
};

export default InterestsPage;
