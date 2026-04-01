import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    FiArrowLeft,
    FiHash,
    FiMessageSquare,
    FiHome,
    FiSmartphone,
    FiInfo,
    FiChevronRight,
    FiPlay
} from 'react-icons/fi';
import { cn } from '../utils/classNames';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { updateNotificationSettings, updateSettings } from '../redux/slices/authSlice';
import { RootState } from '../redux/store';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const ContentSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const dispatch = useAppDispatch();
    const settings = useAppSelector((state: RootState) => state.auth.settings);

    const handleToggle = (key: string, value: boolean) => {
        dispatch(updateSettings({ [key]: value })); // Optimistic UI update
        dispatch(updateNotificationSettings({ [key]: value }));
    };

    const MenuLinkItem = ({
        icon,
        label,
        onClick
    }: {
        icon: React.ReactNode;
        label: string;
        onClick?: () => void;
    }) => (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-50 dark:border-dark-border/50"
        >
            <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                <span className="text-gray-500 dark:text-dark-text-secondary">{icon}</span>
                <span className="font-medium text-[15px]">{label}</span>
            </div>
            <FiChevronRight className="text-gray-400 dark:text-dark-text-secondary" />
        </button>
    );

    const ToggleItem = ({
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
        <div className="px-4 py-4 flex items-center justify-between border-b border-gray-50 dark:border-dark-border/50">
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
                        : "bg-white border-gray-300 dark:bg-dark-bg dark:border-gray-600"
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

    useDocumentTitle(t('content.title'));

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
                        {t('content.title')}
                    </h1>
                </div>

                <div className="pb-20">
                    <section>
                        <MenuLinkItem
                            icon={<FiHash size={20} />}
                            label={t('content.manage_saved_feeds')}
                            onClick={() => navigate('/feeds/settings')}
                        />
                        <MenuLinkItem
                            icon={<FiMessageSquare size={20} />}
                            label={t('content.discussion_settings')}
                            onClick={() => navigate('/settings/content/discussion')}
                        />
                        <MenuLinkItem
                            icon={<FiHome size={20} />}
                            label={t('content.following_feed_settings')}
                            onClick={() => navigate('/settings/content/following-feed')}
                        />
                        <MenuLinkItem
                            icon={<FiSmartphone size={20} />}
                            label={t('content.external_media')}
                            onClick={() => navigate('/settings/content/external-media')}
                        />
                        <MenuLinkItem
                            icon={<FiInfo size={20} />}
                            label={t('content.my_interests')}
                            onClick={() => navigate('/interests')}
                        />
                    </section>

                    <section className="mt-4 border-t border-gray-100 dark:border-dark-border">
                        <ToggleItem
                            icon={<FiPlay size={20} />}
                            label={t('content.autoplay_video_gif')}
                            value={settings?.autoplayVideoGif ?? true}
                            onChange={(val) => handleToggle('autoplayVideoGif', val)}
                        />
                        <ToggleItem
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                            label={t('content.open_trending_topics')}
                            value={settings?.openTrendingTopics ?? true}
                            onChange={(val) => handleToggle('openTrendingTopics', val)}
                        />
                        <ToggleItem
                            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
                            label={t('content.enable_video_discover')}
                            value={settings?.enableVideoDiscover ?? true}
                            onChange={(val) => handleToggle('enableVideoDiscover', val)}
                        />
                    </section>
                </div>
            </div>
    );
};

export default ContentSettingsPage;
