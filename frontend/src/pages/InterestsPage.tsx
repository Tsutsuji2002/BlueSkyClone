import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import InterestsEditor from '../components/feed/InterestsEditor';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const InterestsPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    useDocumentTitle(t('content.my_interests'));

    return (
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

                    <InterestsEditor variant="full" />
                </div>
        </div>
    );
};

export default InterestsPage;
