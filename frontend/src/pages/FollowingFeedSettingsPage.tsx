import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo, FiMessageSquare, FiRepeat, FiMessageCircle, FiActivity } from 'react-icons/fi';
import { cn } from '../utils/classNames';

const FollowingFeedSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [showReplies, setShowReplies] = useState(true);
    const [showReposts, setShowReposts] = useState(true);
    const [showQuotes, setShowQuotes] = useState(true);
    const [experimental, setExperimental] = useState(false);

    const SettingsItem = ({
        icon,
        label,
        value,
        onChange
    }: {
        icon: React.ReactNode;
        label: string;
        value: boolean;
        onChange: (val: boolean) => void;
    }) => (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-dark-bg border-b border-gray-50 dark:border-dark-border/50">
            <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                <span className="text-gray-500 dark:text-dark-text-secondary">{icon}</span>
                <span className="font-medium text-[15px]">{label}</span>
            </div>
            <button
                onClick={() => onChange(!value)}
                className={cn(
                    "w-6 h-6 rounded flex items-center justify-center transition-colors border-2",
                    value
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-gray-200 dark:bg-dark-bg dark:border-gray-700"
                )}
            >
                {value && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </button>
        </div>
    );

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
                        {t('content.following_feed_settings')}
                    </h1>
                </div>

                <div className="pb-20">
                    {/* Info Banner */}
                    <div className="m-4 border border-blue-200 dark:border-blue-900 rounded-xl p-4 flex gap-4 bg-blue-50/20">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-800 dark:text-dark-text leading-snug">
                            {t('content.following_settings_info')}
                        </p>
                    </div>

                    <div className="flex flex-col">
                        <SettingsItem
                            icon={<FiMessageSquare size={20} />}
                            label={t('content.show_replies')}
                            value={showReplies}
                            onChange={setShowReplies}
                        />
                        <SettingsItem
                            icon={<FiRepeat size={20} />}
                            label={t('content.show_reposts')}
                            value={showReposts}
                            onChange={setShowReposts}
                        />
                        <SettingsItem
                            icon={<FiMessageCircle size={20} />}
                            label={t('content.show_quote_posts')}
                            value={showQuotes}
                            onChange={setShowQuotes}
                        />
                    </div>

                    {/* Experimental Section */}
                    <div className="mt-8">
                        <div className="px-4 mb-4 flex items-center gap-3">
                            <FiActivity className="text-gray-500" size={20} />
                            <h2 className="font-bold text-gray-900 dark:text-dark-text text-[15px]">
                                {t('content.experimental')}
                            </h2>
                        </div>
                        <div className="px-4 py-4 flex items-start justify-between border-t border-gray-100 dark:border-dark-border">
                            <p className="text-sm text-gray-700 dark:text-dark-text-secondary flex-1 mr-4">
                                {t('content.show_sample_saved_feeds')}
                            </p>
                            <button
                                onClick={() => setExperimental(!experimental)}
                                className={cn(
                                    "w-11 h-6 rounded-full relative transition-colors duration-200 ease-in-out shrink-0",
                                    experimental ? "bg-blue-500" : "bg-gray-200 dark:bg-dark-surface"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm",
                                    experimental ? "left-[22px]" : "left-0.5"
                                )} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default FollowingFeedSettingsPage;
