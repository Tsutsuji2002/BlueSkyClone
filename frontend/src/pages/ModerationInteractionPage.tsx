import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo, FiGlobe, FiChevronDown } from 'react-icons/fi';
import { cn } from '../utils/classNames';

const ModerationInteractionPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [replyAccess, setReplyAccess] = useState('everyone'); // everyone, unmentioned
    const [allowQuote, setAllowQuote] = useState(true);

    // Reply settings checkboxes
    const [followers, setFollowers] = useState(false);
    const [follows, setFollows] = useState(false);
    const [mentions, setMentions] = useState(false);

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
                        {t('moderation.interaction_title')}
                    </h1>
                </div>

                <div className="p-4">
                    {/* Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 flex gap-3">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-800 dark:text-blue-100 leading-snug">
                            {t('moderation.interaction_info')}
                        </p>
                    </div>

                    {/* Who can reply section */}
                    <h2 className="font-bold text-gray-900 dark:text-dark-text mb-3">
                        {t('moderation.who_can_reply')}
                    </h2>

                    <div className="flex gap-4 mb-4">
                        <button
                            onClick={() => setReplyAccess('everyone')}
                            className={cn(
                                "flex-1 flex items-center gap-2 p-3 rounded-lg border transition-all",
                                replyAccess === 'everyone'
                                    ? "bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "bg-gray-50 border-transparent text-gray-500 dark:bg-dark-surface dark:text-dark-text-secondary"
                            )}
                        >
                            <div className={cn(
                                "w-5 h-5 rounded-full border flex items-center justify-center",
                                replyAccess === 'everyone' ? "border-blue-500 bg-blue-500" : "border-gray-400"
                            )}>
                                {replyAccess === 'everyone' && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="font-semibold">{t('moderation.anyone')}</span>
                        </button>

                        <button
                            onClick={() => setReplyAccess('none')}
                            className={cn(
                                "flex-1 flex items-center gap-2 p-3 rounded-lg border transition-all",
                                replyAccess === 'none'
                                    ? "bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "bg-gray-50 border-transparent text-gray-500 dark:bg-dark-surface dark:text-dark-text-secondary"
                            )}
                        >
                            <div className={cn(
                                "w-5 h-5 rounded-full border flex items-center justify-center",
                                replyAccess === 'none' ? "border-blue-500 bg-blue-500" : "border-gray-400"
                            )}>
                                {replyAccess === 'none' && <div className="w-2 h-2 bg-white rounded-full" />}
                            </div>
                            <span className="font-semibold">{t('moderation.no_one')}</span>
                        </button>
                    </div>

                    <div className="space-y-3 mb-4">
                        {[
                            { label: t('moderation.followers'), state: followers, setter: setFollowers },
                            { label: t('moderation.following'), state: follows, setter: setFollows },
                            { label: t('moderation.mentioned'), state: mentions, setter: setMentions },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-surface/50 rounded-lg">
                                <button
                                    onClick={() => item.setter(!item.state)}
                                    className={cn(
                                        "w-6 h-6 rounded border flex items-center justify-center transition-colors",
                                        item.state
                                            ? "bg-blue-500 border-blue-500 text-white"
                                            : "bg-white border-gray-300 dark:bg-dark-bg dark:border-gray-600"
                                    )}
                                >
                                    {item.state && <div className="w-2 h-2 bg-white rounded-sm" />} {/* Simple checkmark */}
                                </button>
                                <span className="text-gray-700 dark:text-dark-text font-medium">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    <div className="relative mb-8">
                        <button className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-surface/50 rounded-lg text-gray-500 dark:text-dark-text-secondary">
                            <span>{t('moderation.select_list')}</span>
                            <FiChevronDown size={20} />
                        </button>
                    </div>

                    {/* Quote Post Toggle */}
                    <div className="px-4 py-4 flex items-center justify-between border border-gray-100 dark:border-dark-border bg-blue-50/50 dark:bg-dark-surface/30 rounded-xl mb-8">
                        <div className="flex items-center gap-3">
                            <div className="text-gray-900 dark:text-dark-text font-bold">
                                <span className="text-lg mr-2">""</span>
                                {t('moderation.allow_quote')}
                            </div>
                        </div>
                        <button
                            onClick={() => setAllowQuote(!allowQuote)}
                            className={cn(
                                "w-12 h-7 rounded-full relative transition-colors duration-200 ease-in-out",
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
                    <button className="w-full py-3 bg-blue-100 hover:bg-blue-200 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 font-bold rounded-full transition-colors">
                        {t('moderation.save')}
                    </button>
                </div>
            </div>
        </MainLayout>
    );
};

export default ModerationInteractionPage;
