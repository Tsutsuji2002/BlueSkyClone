import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiChevronRight, FiHeart, FiUserPlus, FiMessageSquare, FiAtSign, FiRepeat, FiBell, FiCpu } from 'react-icons/fi';
import { RiDoubleQuotesL } from 'react-icons/ri';
import { BsArrowRepeat } from 'react-icons/bs';

const NotificationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const notificationTypes = [
        { id: 'likes', icon: <FiHeart size={20} />, label: t('notifications.likes'), desc: t('notifications.setting_summary') },
        { id: 'followers', icon: <FiUserPlus size={20} />, label: t('notifications.followers'), desc: t('notifications.setting_summary_simple') },
        { id: 'reply', icon: <FiMessageSquare size={20} />, label: t('notifications.reply'), desc: t('notifications.setting_summary') },
        { id: 'mention', icon: <FiAtSign size={20} />, label: t('notifications.mention'), desc: t('notifications.setting_summary') },
        { id: 'quote', icon: <RiDoubleQuotesL size={20} />, label: t('notifications.quote'), desc: t('notifications.setting_summary') },
        { id: 'repost', icon: <FiRepeat size={20} />, label: t('notifications.repost'), desc: t('notifications.setting_summary') },
        { id: 'activity', icon: <FiBell size={20} />, label: t('notifications.activity'), desc: t('notifications.setting_summary_push') },
        { id: 'likes_reposts', icon: <FiHeart size={20} />, label: t('notifications.likes_reposts'), desc: t('notifications.setting_summary') },
        { id: 'reposts_reposts', icon: <BsArrowRepeat size={20} />, label: t('notifications.reposts_reposts'), desc: t('notifications.setting_summary') },
        { id: 'others', icon: <FiCpu size={20} />, label: t('notifications.others'), desc: t('notifications.setting_summary_push') },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                <button
                    onClick={() => navigate('/settings')}
                    className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                >
                    <FiArrowLeft size={20} className="dark:text-dark-text" />
                </button>
                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                    {t('settings.notifications')}
                </h1>
            </div>

            <div className="flex flex-col">
                {notificationTypes.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => navigate(`/settings/notifications/${item.id}`)}
                        className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                    >
                        <div className="flex items-start gap-4">
                            <div className="mt-1 text-gray-900 dark:text-dark-text opacity-80">
                                {item.icon}
                            </div>
                            <div className="text-left">
                                <h3 className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{item.label}</h3>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">{item.desc}</p>
                            </div>
                        </div>
                        <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                    </button>
                ))}
            </div>
        </div>
    );
};

export default NotificationSettingsPage;
