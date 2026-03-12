import React, { useState, useEffect } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../redux/slices/notificationsSlice';
import NotificationItem from '../components/notifications/NotificationItem';
import IconButton from '../components/common/IconButton';
import { FiCheckCircle, FiMenu } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/classNames';
import { Notification } from '../types';
import { RootState } from '../redux/store';
import { openMobileMenu } from '../redux/slices/modalsSlice';

const NotificationsPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { notifications, unreadCount, isLoading, error } = useAppSelector((state: RootState) => state.notifications);
    const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsAsRead());
    };

    const handleNotificationClick = (id: string) => {
        dispatch(markNotificationAsRead(id));
    };

    const filteredNotifications = activeTab === 'all'
        ? notifications
        : notifications.filter((n: Notification) => n.type === 'mention');

    const tabs = [
        { id: 'all', label: t('notifications.tabs.all') },
        { id: 'mentions', label: t('notifications.tabs.mentions') },
    ];

    return (
        <MainLayout hideTopBar={true} title={t('notifications.title')}>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-dark-bg/80 backdrop-blur-sm border-b border-gray-200 dark:border-dark-border">
                    <div className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => dispatch(openMobileMenu())}
                                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                            >
                                <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                                {t('notifications.title')}
                                {unreadCount > 0 && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-primary-500 text-white rounded-full align-middle">
                                        {unreadCount}
                                    </span>
                                )}
                            </h1>
                        </div>
                        <IconButton
                            icon={<FiCheckCircle size={20} />}
                            onClick={handleMarkAllRead}
                            tooltip={t('notifications.mark_all_read')}
                            variant="primary"
                        />
                    </div>

                    {/* Tabs */}
                    <div className="flex">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex-1 py-4 text-sm font-semibold transition-colors relative",
                                    activeTab === tab.id
                                        ? "text-gray-900 dark:text-dark-text"
                                        : "text-gray-500 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-surface/50"
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-500 rounded-full" />
                                )}
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
        </MainLayout>
    );
};

export default NotificationsPage;
