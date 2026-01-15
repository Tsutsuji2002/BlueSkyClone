import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo } from 'react-icons/fi';
import { cn } from '../utils/classNames';

const ExternalMediaPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const mediaProviders = [
        'YouTube', 'YouTube Shorts', 'Vimeo', 'Twitch', 'GIPHY', 'Spotify', 'Apple Music', 'SoundCloud', 'Flickr'
    ];

    const [enabledProviders, setEnabledProviders] = useState<string[]>([]);

    const toggleProvider = (provider: string) => {
        setEnabledProviders(prev =>
            prev.includes(provider)
                ? prev.filter(p => p !== provider)
                : [...prev, provider]
        );
    };

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
                        {t('content.external_media_title')}
                    </h1>
                </div>

                <div className="pb-20">
                    {/* Info Banner */}
                    <div className="m-4 border border-gray-200 dark:border-dark-border rounded-xl p-4 flex gap-4 bg-gray-50/10">
                        <FiInfo className="text-gray-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary leading-snug">
                            {t('content.external_media_info')}
                        </p>
                    </div>

                    <div className="px-6 py-4">
                        <h2 className="font-bold text-gray-900 dark:text-dark-text text-[15px] mb-6">
                            {t('content.enable_embed_for')}
                        </h2>

                        <div className="space-y-4">
                            {mediaProviders.map(provider => (
                                <button
                                    key={provider}
                                    onClick={() => toggleProvider(provider)}
                                    className="w-full flex items-center justify-between group"
                                >
                                    <span className="text-[17px] font-bold text-gray-900 dark:text-dark-text">
                                        {provider}
                                    </span>
                                    <div className={cn(
                                        "w-6 h-6 rounded flex items-center justify-center transition-colors border-2",
                                        enabledProviders.includes(provider)
                                            ? "bg-blue-500 border-blue-500 text-white"
                                            : "bg-gray-100 border-gray-200 dark:bg-dark-surface dark:border-gray-700"
                                    )}>
                                        {enabledProviders.includes(provider) && (
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default ExternalMediaPage;
