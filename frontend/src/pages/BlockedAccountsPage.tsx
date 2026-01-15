import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';

const BlockedAccountsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <MainLayout>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('moderation.blocked_accounts_title')}
                    </h1>
                </div>

                <div className="p-4">
                    <div className="p-4 bg-gray-50 dark:bg-dark-surface/30 border-b border-gray-200 dark:border-dark-border mb-6">
                        <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary text-center leading-relaxed">
                            {t('moderation.blocked_accounts_info')}
                        </p>
                    </div>

                    <div className="max-w-md mx-auto mt-8 bg-gray-50/50 dark:bg-dark-surface/20 rounded-xl p-8 text-center border border-gray-100 dark:border-dark-border">
                        <p className="text-gray-600 dark:text-dark-text-secondary text-[15px] leading-relaxed">
                            {t('moderation.no_blocked_accounts')}
                        </p>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default BlockedAccountsPage;
