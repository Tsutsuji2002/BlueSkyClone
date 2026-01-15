import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { cn } from '../utils/classNames';

const VerificationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [hideVerifications, setHideVerifications] = useState(false);

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
                        {t('moderation.verification_title')}
                    </h1>
                </div>

                <div className="p-4">
                    {/* Info Banner */}
                    <div className="bg-white dark:bg-dark-bg border border-blue-500 rounded-xl p-4 mb-8 flex gap-4">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-900 dark:text-dark-text leading-snug">
                            {t('moderation.verification_info')}
                        </p>
                    </div>

                    {/* Hide Verification Marks Toggle */}
                    <div className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                            <FiCheckCircle size={24} />
                            <span className="font-medium text-[17px]">{t('moderation.hide_verifications')}</span>
                        </div>
                        <button
                            onClick={() => setHideVerifications(!hideVerifications)}
                            className={cn(
                                "w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out border-2",
                                hideVerifications
                                    ? "bg-blue-500 border-blue-500 shadow-[0_0_0_2px_rgba(59,130,246,0.1)]"
                                    : "bg-gray-100 border-gray-200 dark:bg-dark-surface dark:border-gray-600"
                            )}
                        >
                            <div className={cn(
                                "w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ease-in-out shadow-sm",
                                hideVerifications ? "left-[20px]" : "left-[2px]"
                            )} />
                        </button>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default VerificationSettingsPage;
