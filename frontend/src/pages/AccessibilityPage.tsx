import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft } from 'react-icons/fi';
import { cn } from '../utils/classNames';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import { RootState } from '../redux/store';

const AccessibilityPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const dispatch = useAppDispatch();
    const settings = useAppSelector((state: RootState) => state.auth.settings);

    const handleToggle = (key: string, value: boolean) => {
        dispatch(updateNotificationSettings({ [key]: value }));
    };

    const SettingsToggle = ({
        label,
        value,
        onChange
    }: {
        label: string;
        value: boolean;
        onChange: (val: boolean) => void;
    }) => (
        <div className="flex items-center justify-between py-4 border-b border-gray-50 dark:border-dark-border/50 last:border-0 cursor-pointer group" onClick={() => onChange(!value)}>
            <span className="text-[15px] font-medium text-gray-700 dark:text-dark-text group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                {label}
            </span>
            <div className={cn(
                "w-6 h-6 rounded flex items-center justify-center transition-all border-2",
                value
                    ? "bg-blue-500 border-blue-500 text-white"
                    : "bg-white border-gray-200 dark:bg-dark-bg dark:border-gray-700"
            )}>
                {value && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
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
                        {t('accessibility.title')}
                    </h1>
                </div>

                <div className="p-6">
                    <section className="flex items-start gap-4">
                        <div className="mt-1 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full border-2 border-gray-900 dark:border-dark-text flex items-center justify-center p-0.5">
                                <svg className="w-full h-full text-gray-900 dark:text-dark-text" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
                                </svg>
                            </div>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-[17px] font-bold text-gray-900 dark:text-dark-text mb-4">
                                {t('accessibility.alt_text_header')}
                            </h2>
                            <div className="flex flex-col">
                                <SettingsToggle
                                    label={t('accessibility.require_alt_text')}
                                    value={settings?.requireAltText ?? false}
                                    onChange={(val) => handleToggle('requireAltText', val)}
                                />
                                <SettingsToggle
                                    label={t('accessibility.larger_alt_badge')}
                                    value={settings?.largerAltBadge ?? false}
                                    onChange={(val) => handleToggle('largerAltBadge', val)}
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </MainLayout>
    );
};

export default AccessibilityPage;
