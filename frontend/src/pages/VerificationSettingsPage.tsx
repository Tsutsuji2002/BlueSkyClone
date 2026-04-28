import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo, FiCheckCircle } from 'react-icons/fi';

const VerificationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [hideBadges, setHideBadges] = useState(false);

    return (
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
                    {t('moderation.verification_title')}
                </h1>
            </div>

            <div className="p-4 max-w-2xl mx-auto">
                {/* Info Banner */}
                <div className="bg-blue-50/10 dark:bg-blue-900/10 border border-blue-500/50 rounded-xl p-4 mb-8 flex gap-4">
                    <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                    <p className="text-[15px] text-gray-900 dark:text-dark-text leading-snug">
                        {t('moderation.verification_desc')} <a
                            href="https://bsky.social/about/blog/04-21-2025-verification"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                        >
                            {t('moderation.learn_more')}
                        </a>
                    </p>
                </div>
 
                {/* Settings Item */}
                <div
                    className="flex items-center justify-between py-2 cursor-pointer transition-colors"
                    onClick={() => setHideBadges(!hideBadges)}
                >
                    <div className="flex items-center gap-4">
                        <FiCheckCircle size={22} className="text-gray-900 dark:text-dark-text" />
                        <span className="text-[17px] font-medium text-gray-900 dark:text-dark-text">
                            {t('moderation.hide_verifications')}
                        </span>
                    </div>
                    <div className={`w-10 h-6 rounded-md flex items-center p-1 transition-colors ${hideBadges ? 'bg-blue-600' : 'bg-gray-300 dark:bg-dark-surface'}`}>
                        <div className={`w-4 h-4 bg-white rounded-sm transition-transform ${hideBadges ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerificationSettingsPage;
