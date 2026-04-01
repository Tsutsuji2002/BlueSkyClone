import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { updateNotificationSettings } from '../redux/slices/authSlice';
import { FiArrowLeft, FiHeart, FiUserPlus, FiMessageSquare, FiAtSign, FiRepeat, FiBell, FiCpu, FiCheck } from 'react-icons/fi';
import { RiDoubleQuotesL } from 'react-icons/ri';
import { BsArrowRepeat } from 'react-icons/bs';
import { UserSettings } from '../types';

const NotificationTypeSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { type } = useParams<{ type: string }>();
    const { t } = useTranslation();
    const { settings } = useAppSelector(state => state.auth);

    const fieldMap = useMemo(() => {
        const map: Record<string, { push: keyof UserSettings; inApp: keyof UserSettings; notify: keyof UserSettings }> = {
            likes: { notify: 'notifyLikes', push: 'pushNotifyLikes', inApp: 'inAppNotifyLikes' },
            followers: { notify: 'notifyFollowers', push: 'pushNotifyFollowers', inApp: 'inAppNotifyFollowers' },
            reply: { notify: 'notifyReplies', push: 'pushNotifyReplies', inApp: 'inAppNotifyReplies' },
            mention: { notify: 'notifyMentions', push: 'pushNotifyMentions', inApp: 'inAppNotifyMentions' },
            quote: { notify: 'notifyQuotes', push: 'pushNotifyQuotes', inApp: 'inAppNotifyQuotes' },
            repost: { notify: 'notifyReposts', push: 'pushNotifyReposts', inApp: 'inAppNotifyReposts' },
            activity: { notify: 'notifyActivity', push: 'pushNotifyActivity', inApp: 'inAppNotifyActivity' },
            likes_reposts: { notify: 'notifyLikesOfReposts', push: 'pushNotifyLikesOfReposts', inApp: 'inAppNotifyLikesOfReposts' },
            reposts_reposts: { notify: 'notifyRepostsOfReposts', push: 'pushNotifyRepostsOfReposts', inApp: 'inAppNotifyRepostsOfReposts' },
            others: { notify: 'notifyOthers', push: 'pushNotifyOthers', inApp: 'inAppNotifyOthers' },
        };
        return map;
    }, []);

    const currentTypeKey = type || 'likes';
    const fields = fieldMap[currentTypeKey] || fieldMap['likes'];

    const notifyEnabled = settings ? !!settings[fields.notify] : true;
    const pushEnabled = settings ? !!settings[fields.push] : true;
    const inAppEnabled = settings ? !!settings[fields.inApp] : true;

    const handleToggleNotify = () => {
        dispatch(updateNotificationSettings({ [fields.notify]: !notifyEnabled }));
    };

    const handleTogglePush = () => {
        dispatch(updateNotificationSettings({ [fields.push]: !pushEnabled }));
    };

    const handleToggleInApp = () => {
        dispatch(updateNotificationSettings({ [fields.inApp]: !inAppEnabled }));
    };

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

    const Toggle = ({ enabled, onToggle, label, sublabel }: { enabled: boolean; onToggle: () => void; label: string; sublabel?: string }) => (
        <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors border ${enabled ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-dark-bg border-gray-300 dark:border-gray-600'}`}>
                <input type="checkbox" className="hidden" checked={enabled} onChange={onToggle} />
                {enabled && <FiCheck className="text-white w-4 h-4" style={{ strokeWidth: 3 }} />}
            </div>
            <div className="flex flex-col">
                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{label}</span>
                {sublabel && <span className="text-xs text-gray-500">{sublabel}</span>}
            </div>
        </label>
    );

    return (
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

                <div className="space-y-6 mb-6">
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-dark-text-secondary uppercase tracking-wide">
                        {t('notifications.settings', 'Notification channels')}
                    </h3>
                    <Toggle
                        enabled={notifyEnabled}
                        onToggle={handleToggleNotify}
                        label={t('notifications.enabled', 'Enable notifications')}
                        sublabel={t('notifications.enabled_desc', 'Receive this type of notification')}
                    />
                    <Toggle
                        enabled={inAppEnabled}
                        onToggle={handleToggleInApp}
                        label={t('notifications.in_app', 'In-app')}
                        sublabel={t('notifications.in_app_desc', 'Show in your notification feed')}
                    />
                    <Toggle
                        enabled={pushEnabled}
                        onToggle={handleTogglePush}
                        label={t('notifications.push', 'Push')}
                        sublabel={t('notifications.mobile_only', 'Mobile notification')}
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">
                        {t('notifications.from')}
                    </h3>
                    <div className="space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full border bg-blue-600 border-blue-600`}>
                                <FiCheck className="text-white w-4 h-4" style={{ strokeWidth: 3 }} />
                            </span>
                            <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('notifications.from_all')}</span>
                        </label>
                        <p className="text-xs text-gray-400 mt-4 italic">{t('notifications.settings_saved_locally', 'Settings are saved to your account.')}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default NotificationTypeSettingsPage;
