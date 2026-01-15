import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiHeart, FiUserPlus, FiMessageSquare, FiAtSign, FiRepeat, FiBell, FiCpu, FiCheck } from 'react-icons/fi';
import { RiDoubleQuotesL } from 'react-icons/ri';
import { BsArrowRepeat } from 'react-icons/bs';

const NotificationTypeSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { type } = useParams<{ type: string }>();
    const { t } = useTranslation();

    // Mock state
    const [pushEnabled, setPushEnabled] = useState(true);
    const [inAppEnabled, setInAppEnabled] = useState(true);
    const [filter, setFilter] = useState<'all' | 'following'>('all');

    const typeConfig: Record<string, { icon: React.ReactNode, label: string, desc: string }> = {
        likes: { icon: <FiHeart size={24} />, label: t('notifications.likes'), desc: t('notifications.likes_desc') },
        followers: { icon: <FiUserPlus size={24} />, label: t('notifications.followers'), desc: t('notifications.followers_desc') },
        reply: { icon: <FiMessageSquare size={24} />, label: t('notifications.reply'), desc: t('notifications.reply_desc') },
        mention: { icon: <FiAtSign size={24} />, label: t('notifications.mention'), desc: t('notifications.mention_desc') },
        quote: { icon: <RiDoubleQuotesL size={24} />, label: t('notifications.quote'), desc: t('notifications.quote_desc') },
        repost: { icon: <FiRepeat size={24} />, label: t('notifications.repost'), desc: t('notifications.repost_desc') },
        activity: { icon: <FiBell size={24} />, label: t('notifications.activity'), desc: t('notifications.activity_desc') },
        likes_reposts: { icon: <FiHeart size={24} />, label: t('notifications.likes_reposts'), desc: t('notifications.likes_reposts_desc') },
        reposts_reposts: { icon: <BsArrowRepeat size={24} />, label: t('notifications.reposts_reposts'), desc: t('notifications.reposts_reposts_desc') },
        others: { icon: <FiCpu size={24} />, label: t('notifications.others'), desc: t('notifications.others_desc') },
    };

    const currentType = type && typeConfig[type] ? typeConfig[type] : typeConfig['likes'];

    return (
        <MainLayout>
            <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => navigate('/settings/notifications')}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('settings.notifications')}
                    </h1>
                </div>

                <div className="p-4">
                    <div className="flex gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-dark-border">
                        <div className="text-gray-900 dark:text-dark-text mt-1">
                            {currentType.icon}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-1">
                                {currentType.label}
                            </h2>
                            <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                                {currentType.desc}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6 pb-6 border-b border-gray-100 dark:border-dark-border mb-6">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${pushEnabled ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600'} border`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={pushEnabled}
                                    onChange={() => setPushEnabled(!pushEnabled)}
                                />
                                {pushEnabled && <FiCheck className="text-white w-4 h-4" style={{ strokeWidth: 3 }} />}
                            </div>
                            <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('notifications.push')}</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${inAppEnabled ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600'} border`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={inAppEnabled}
                                    onChange={() => setInAppEnabled(!inAppEnabled)}
                                />
                                {inAppEnabled && <FiCheck className="text-white w-4 h-4" style={{ strokeWidth: 3 }} />}
                            </div>
                            <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('notifications.in_app')}</span>
                        </label>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">
                            {t('notifications.from')}
                        </h3>
                        <div className="space-y-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full border ${filter === 'all' ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600'}`}>
                                    {filter === 'all' && <FiCheck className="text-white w-4 h-4" style={{ strokeWidth: 3 }} />}
                                </span>
                                <input
                                    type="radio"
                                    name="filter"
                                    className="hidden"
                                    checked={filter === 'all'}
                                    onChange={() => setFilter('all')}
                                />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('notifications.from_all')}</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <span className={`flex items-center justify-center w-6 h-6 rounded-full border ${filter === 'following' ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600'}`}>
                                    {filter === 'following' && <FiCheck className="text-white w-4 h-4" style={{ strokeWidth: 3 }} />}
                                </span>
                                <input
                                    type="radio"
                                    name="filter"
                                    className="hidden"
                                    checked={filter === 'following'}
                                    onChange={() => setFilter('following')}
                                />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('notifications.from_followers')}</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default NotificationTypeSettingsPage;
