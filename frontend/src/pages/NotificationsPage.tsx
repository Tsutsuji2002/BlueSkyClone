import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../redux/slices/notificationsSlice';
import NotificationItem from '../components/notifications/NotificationItem';
import { FiMenu } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { Notification } from '../types';
import { RootState } from '../redux/store';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const NotificationsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { notifications, isLoading, error } = useAppSelector((state: RootState) => state.notifications);
    const { isSessionSettled, isReverifying } = useAppSelector((state: RootState) => state.auth);
    const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');

    useEffect(() => {
        if (!isSessionSettled || isReverifying) return;
        dispatch(fetchNotifications()).then(() => {
            dispatch(markAllNotificationsAsRead());
        });
    }, [dispatch, isSessionSettled, isReverifying]);

    const handleNotificationClick = (id: string) => {
        dispatch(markNotificationAsRead(id));
    };

    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter((n: Notification) => n.type === 'mention');

    const tabs = [
        { id: 'all', label: t('notifications.tabs.all', 'All') },
        { id: 'mentions', label: t('notifications.tabs.mentions', 'Mentions') },
    ];

    useDocumentTitle(t('notifications.title'));

    return (
        <div className="min-h-screen border-r border-gray-200 dark:border-dark-border">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-[#DCE2EA] dark:border-dark-border">
                {/* Title & Actions Row */}
                <div className="flex items-center justify-between px-4 sm:px-5 min-h-[52px]">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => dispatch(openMobileMenu())}
                            className="lg:hidden p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                            aria-label={t('common.menu', 'Menu')}
                        >
                            <FiMenu size={22} className="text-gray-700 dark:text-dark-text" />
                        </button>
                        <h1 className="text-[19px] sm:text-xl font-bold text-gray-900 dark:text-white leading-[22px] tracking-[0.25px]">
                            {t('notifications.title')}
                        </h1>
                    </div>
                    <Link
                        to="/settings/notifications"
                        aria-label={t('settings.notifications', 'Notification settings')}
                        className="w-[33px] h-[33px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface text-[#526580] dark:text-[#8798B0] transition-colors flex-shrink-0"
                    >
                        <svg fill="none" width="22" height="22" viewBox="0 0 24 24" className="text-current pointer-events-none">
                            <path
                                fill="currentColor"
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M11.1 2a1 1 0 0 0-.832.445L8.851 4.57 6.6 4.05a1 1 0 0 0-.932.268l-1.35 1.35a1 1 0 0 0-.267.932l.52 2.251-2.126 1.417A1 1 0 0 0 2 11.1v1.8a1 1 0 0 0 .445.832l2.125 1.417-.52 2.251a1 1 0 0 0 .268.932l1.35 1.35a1 1 0 0 0 .932.267l2.251-.52 1.417 2.126A1 1 0 0 0 11.1 22h1.8a1 1 0 0 0 .832-.445l1.417-2.125 2.251.52a1 1 0 0 0 .932-.268l1.35-1.35a1 1 0 0 0 .267-.932l-.52-2.251 2.126-1.417A1 1 0 0 0 22 12.9v-1.8a1 1 0 0 0-.445-.832L19.43 8.851l.52-2.251a1 1 0 0 0-.268-.932l-1.35-1.35a1 1 0 0 0-.932-.267l-2.251.52-1.417-2.126A1 1 0 0 0 12.9 2h-1.8Zm-.968 4.255L11.635 4h.73l1.503 2.255a1 1 0 0 0 1.057.42l2.385-.551.566.566-.55 2.385a1 1 0 0 0 .42 1.057L20 11.635v.73l-2.255 1.503a1 1 0 0 0-.42 1.057l.551 2.385-.566.566-2.385-.55a1 1 0 0 0-1.057.42L12.365 20h-.73l-1.503-2.255a1 1 0 0 0-1.057-.42l-2.385.551-.566-.566.55-2.385a1 1 0 0 0-.42-1.057L4 12.365v-.73l2.255-1.503a1 1 0 0 0 .42-1.057L6.123 6.69l.566-.566 2.385.55a1 1 0 0 0 1.057-.42ZM8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm4-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"
                            />
                        </svg>
                    </Link>
                </div>

                {/* Tabs */}
                <div className="flex" role="tablist">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className="flex-1 flex flex-col items-center justify-center pt-1 pb-0 hover:bg-gray-50/50 dark:hover:bg-dark-surface/50 transition-colors cursor-pointer"
                        >
                            <div
                                className={cn(
                                    "relative text-[15px] leading-[20px] pb-3 tracking-[0.25px] font-semibold text-center transition-colors",
                                    activeTab === tab.id
                                        ? "text-gray-900 dark:text-white"
                                        : "text-[#405168] dark:text-[#8798B0]"
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#006AFF] rounded-full" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications List */}
            <div className="flex flex-col">
                {error && (
                    <div className="p-4 m-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-center text-sm">
                        {error}
                    </div>
                )}
                {isLoading && notifications.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="inline-block w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notification: Notification) => (
                        <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onClick={() => handleNotificationClick(notification.id)}
                        />
                    ))
                ) : (
                    <div className="p-12 text-center">
                        <p className="text-gray-500 dark:text-dark-text-secondary">
                            {activeTab === 'all'
                                ? t('notifications.no_notifications')
                                : t('notifications.no_mentions')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
