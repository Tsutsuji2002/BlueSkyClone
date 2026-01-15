import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiBell } from 'react-icons/fi';

const PostNotificationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [selectedOption, setSelectedOption] = useState<'anyone' | 'followers' | 'none'>('anyone');

    return (
        <MainLayout>
            <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings/privacy')}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('privacy.notify_posts')}
                    </h1>
                </div>

                <div className="p-4">
                    <div className="flex gap-3 mb-6">
                        <FiBell className="text-gray-900 dark:text-dark-text mt-1 shrink-0" size={24} />
                        <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                            {t('privacy.notify_posts_desc')}
                        </p>
                    </div>

                    <div className="space-y-1">
                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer">
                            <input
                                type="radio"
                                name="notification-privacy"
                                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                checked={selectedOption === 'anyone'}
                                onChange={() => setSelectedOption('anyone')}
                            />
                            <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.anyone_follows')}</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer">
                            <input
                                type="radio"
                                name="notification-privacy"
                                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                checked={selectedOption === 'followers'}
                                onChange={() => setSelectedOption('followers')}
                            />
                            <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.followers_i_follow')}</span>
                        </label>

                        <label className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg cursor-pointer">
                            <input
                                type="radio"
                                name="notification-privacy"
                                className="w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                checked={selectedOption === 'none'}
                                onChange={() => setSelectedOption('none')}
                            />
                            <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('privacy.no_one')}</span>
                        </label>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default PostNotificationSettingsPage;
