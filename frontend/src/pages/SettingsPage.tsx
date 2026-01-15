import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { logoutAsync } from '../redux/slices/authSlice';
import { openMobileMenu } from '../redux/slices/modalsSlice';
import { RootState } from '../redux/store';

import Avatar from '../components/common/Avatar';
import { useTranslation } from 'react-i18next';
import {
    FiArrowLeft, FiUserPlus, FiUser, FiLock, FiShield,
    FiBell, FiMonitor, FiLayout, FiMaximize, FiGlobe,
    FiHelpCircle, FiInfo, FiChevronRight, FiMenu
} from 'react-icons/fi';
import { cn } from '../utils/classNames';

const SettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const user = useAppSelector((state: RootState) => state.auth.user);


    const handleLogout = async () => {
        await dispatch(logoutAsync());
        navigate('/welcome');
    };

    const settingsItems = [
        { id: 'account', label: t('settings.account'), icon: <FiUser size={20} /> },
        { id: 'privacy', label: t('settings.privacy'), icon: <FiLock size={20} /> },
        { id: 'moderation', label: t('settings.moderation'), icon: <FiShield size={20} /> },
        { id: 'notifications', label: t('settings.notifications'), icon: <FiBell size={20} /> },
        { id: 'content', label: t('settings.content'), icon: <FiMonitor size={20} /> },
        { id: 'appearance', label: t('settings.appearance'), icon: <FiLayout size={20} />, active: true },
        { id: 'accessibility', label: t('settings.accessibility'), icon: <FiMaximize size={20} /> },
        { id: 'language', label: t('settings.language'), icon: <FiGlobe size={20} /> },
        { id: 'help', label: t('settings.help'), icon: <FiHelpCircle size={20} /> },
        { id: 'about', label: t('settings.about'), icon: <FiInfo size={20} /> },
    ];

    return (
        <MainLayout hideTopBar={true}>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => dispatch(openMobileMenu())}
                            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full flex-shrink-0"
                        >
                            <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors hidden sm:block"
                        >
                            <FiArrowLeft size={20} className="dark:text-dark-text" />
                        </button>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('settings.title')}
                    </h1>
                </div>

                {/* Profile Section */}
                <div className="flex flex-col items-center py-8 border-b border-gray-100 dark:border-dark-border">
                    <Avatar
                        src={user?.avatar}
                        alt={user?.displayName || ''}
                        size="2xl"
                        className="mb-4"
                    />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text uppercase tracking-tight">
                        {user?.handle}
                    </h2>
                    <p className="text-gray-500 dark:text-dark-text-secondary mt-1">
                        @{user?.handle}
                    </p>
                </div>

                {/* Add Account Action */}
                <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border">
                    <FiUserPlus size={22} className="text-gray-900 dark:text-dark-text" />
                    <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                        {t('settings.add_account')}
                    </span>
                </button>

                {/* Settings List */}
                <div className="flex flex-col">
                    {settingsItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'appearance') {
                                    navigate('/settings/appearance');
                                } else if (item.id === 'language') {
                                    navigate('/settings/language');
                                } else if (item.id === 'account') {
                                    navigate('/settings/account');
                                } else if (item.id === 'privacy') {
                                    navigate('/settings/privacy');
                                } else if (item.id === 'notifications') {
                                    navigate('/settings/notifications');
                                } else if (item.id === 'about') {
                                    navigate('/settings/about');
                                } else if (item.id === 'moderation') {
                                    navigate('/settings/moderation');
                                } else if (item.id === 'content') {
                                    navigate('/settings/content');
                                } else if (item.id === 'accessibility') {
                                    navigate('/settings/accessibility');
                                }
                            }}
                            className={cn(
                                "flex items-center justify-between px-4 py-4 transition-colors border-b border-gray-50 dark:border-dark-border/50 last:border-0",
                                item.active
                                    ? "bg-primary-50/30 dark:bg-primary-900/10"
                                    : "hover:bg-gray-50 dark:hover:bg-dark-surface/50"
                            )}
                        >
                            <div className="flex items-center gap-4 text-gray-900 dark:text-dark-text">
                                <span className="opacity-80">{item.icon}</span>
                                <span className="text-[15px] font-medium">{item.label}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>
                    ))}
                </div>

                {/* Logout Link */}
                <div className="p-4 mt-4">
                    <button
                        onClick={handleLogout}
                        className="text-red-500 font-medium hover:underline text-[15px]"
                    >
                        {t('settings.logout')}
                    </button>
                </div>
            </div>
        </MainLayout>
    );
};

export default SettingsPage;
