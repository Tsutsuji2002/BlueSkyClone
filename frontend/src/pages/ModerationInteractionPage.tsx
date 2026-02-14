import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo, Figlobe, FiUsers, FiAtSign, FiXCircle } from 'react-icons/fi'; // Corrected icon imports
import { cn } from '../utils/classNames';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import { RootState } from '../redux/store'; // Ensure RootState is imported

const ModerationInteractionPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const settings = useAppSelector((state: RootState) => state.auth.settings);

    // Local state for immediate UI feedback
    const [replyRestriction, setReplyRestriction] = useState<string>('anyone');
    const [allowQuote, setAllowQuote] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (settings) {
            setReplyRestriction(settings.defaultReplyRestriction || 'anyone');
            setAllowQuote(settings.defaultAllowQuotes ?? true);
        }
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await dispatch(updateNotificationSettings({
                defaultReplyRestriction: replyRestriction,
                defaultAllowQuotes: allowQuote
            })).unwrap();
            // Optional: Show success toast
        } catch (error) {
            console.error("Failed to save settings", error);
        } finally {
            setIsSaving(false);
        }
    };

    const replyOptions = [
        {
            value: 'anyone',
            label: t('moderation.anyone'),
            icon: <Figlobe size={20} />,
            desc: "Everyone can reply to your posts"
        },
        {
            value: 'followed', /// Maps to 'followed' (users I follow) - usually implies mentioned users too
            label: t('moderation.following'),
            icon: <FiUsers size={20} />,
            desc: "Only people you follow can reply"
        },
        {
            value: 'mentioned',
            label: t('moderation.mentioned'),
            icon: <FiAtSign size={20} />,
            desc: "Only people you mention can reply"
        },
        {
            value: 'none',
            label: t('privacy.no_one'),
            icon: <FiXCircle size={20} />,
            desc: "No one can reply"
        }
    ];

    return (
        <MainLayout hideTopBar title={t('moderation.interaction_title')}>
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
                        {t('moderation.interaction_settings')}
                    </h1>
                </div>

                <div className="p-4 max-w-2xl mx-auto">
                    {/* Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex gap-3">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-800 dark:text-blue-100 leading-snug">
                            {t('moderation.interaction_info')}
                        </p>
                    </div>

                    {/* Who can reply section */}
                    <h2 className="font-bold text-gray-900 dark:text-dark-text mb-4 text-lg">
                        {t('moderation.who_can_reply')}
                    </h2>

                    <div className="space-y-3 mb-8">
                        {replyOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setReplyRestriction(option.value)}
                                className={cn(
                                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all",
                                    replyRestriction === option.value
                                        ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-900/20"
                                        : "bg-white dark:bg-dark-surface border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                )}
                            >
                                <div className={cn(
                                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                                    replyRestriction === option.value
                                        ? "border-blue-500 bg-blue-500"
                                        : "border-gray-400 dark:border-gray-500"
                                )}>
                                    {replyRestriction === option.value && <div className="w-2 h-2 bg-white rounded-full" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={cn(
                                            "text-gray-500 dark:text-gray-400",
                                            replyRestriction === option.value && "text-blue-600 dark:text-blue-400"
                                        )}>
                                            {option.icon}
                                        </span>
                                        <span className="font-semibold text-gray-900 dark:text-dark-text">
                                            {option.label}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 pl-7">
                                        {option.desc}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Quote Post Toggle */}
                    <div className="px-4 py-4 flex items-center justify-between border border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-surface/30 rounded-xl mb-8">
                        <div className="flex flex-col">
                            <span className="text-gray-900 dark:text-dark-text font-bold mb-1">
                                {t('moderation.allow_quote')}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Allow other users to quote your posts
                            </span>
                        </div>
                        <button
                            onClick={() => setAllowQuote(!allowQuote)}
                            className={cn(
                                "w-12 h-7 rounded-full relative transition-colors duration-200 ease-in-out shrink-0",
                                allowQuote ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                            )}
                        >
                            <div className={cn(
                                "w-6 h-6 bg-white rounded-full absolute top-0.5 transition-transform duration-200 ease-in-out shadow-sm",
                                allowQuote ? "left-[22px]" : "left-0.5"
                            )} />
                        </button>
                    </div>

                    {/* Save Button */}
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? t('common.saving') : t('moderation.save')}
                    </button>
                </div>
            </div>
        </MainLayout>
    );
};

export default ModerationInteractionPage;
