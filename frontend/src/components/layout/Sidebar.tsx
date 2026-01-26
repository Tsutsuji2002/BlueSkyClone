import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiHome, FiSearch, FiBell, FiMail, FiUser, FiSettings,
    FiSun, FiMoon, FiLogOut, FiEdit, FiRss, FiList, FiBookmark, FiShield
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useTheme } from '../../hooks/useTheme';
import { openCreatePost } from '../../redux/slices/modalsSlice';
import { logoutAsync } from '../../redux/slices/authSlice';
import Button from '../common/Button';
import Avatar from '../common/Avatar';
import IconButton from '../common/IconButton';
import Dropdown from '../common/Dropdown';
import { cn } from '../../utils/classNames';

const iconMap: Record<string, React.ReactNode> = {
    home: <FiHome size={24} />,
    search: <FiSearch size={24} />,
    bell: <FiBell size={24} />,
    mail: <FiMail size={24} />,
    feeds: <FiRss size={24} />,
    lists: <FiList size={24} />,
    saved: <FiBookmark size={24} />,
    user: <FiUser size={24} />,
    settings: <FiSettings size={24} />,
};

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { toggle, isDark } = useTheme();
    const user = useAppSelector((state) => state.auth.user);
    const unreadNotifications = useAppSelector((state) => state.notifications.unreadCount);
    const conversations = useAppSelector((state) => state.messages.conversations);
    const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

    const handleLogout = async () => {
        await dispatch(logoutAsync());
        navigate('/welcome');
    };

    return (
        <div className="h-screen sticky top-0 flex flex-col p-3">
            {/* Logo */}
            <div className="p-3 mb-2">
                <svg
                    className="w-8 h-8 text-primary-500 cursor-pointer"
                    viewBox="0 0 64 64"
                    fill="currentColor"
                    onClick={() => navigate('/')}
                >
                    <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zm36.254 0C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.579-6.732-13.873-2.745z" />
                </svg>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path === '/profile' && location.pathname.startsWith('/profile'));

                    const badgeCount = item.id === 'notifications' ? unreadNotifications : (item.id === 'messages' ? unreadMessages : 0);

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.id === 'profile' ? `/profile/${user?.handle}` : item.path)}
                            className={cn(
                                'w-full flex items-center gap-4 px-3 py-2.5 rounded-full transition-colors text-left',
                                isActive || badgeCount > 0
                                    ? 'font-bold text-gray-900 dark:text-dark-text'
                                    : 'font-normal text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-surface'
                            )}
                        >
                            <div className="relative">
                                {iconMap[item.icon]}
                                {badgeCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary-500 text-white text-[10px] px-1 rounded-full flex items-center justify-center font-bold">
                                        {badgeCount > 9 ? '9+' : badgeCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-xl hidden xl:inline">{t(`nav.${item.id}`)}</span>
                        </button>
                    );
                })}

                {user?.role === 'admin' && (
                    <button
                        onClick={() => navigate('/admin')}
                        className={cn(
                            'w-full flex items-center gap-4 px-3 py-2.5 rounded-full transition-colors text-left',
                            location.pathname.startsWith('/admin')
                                ? 'font-bold text-gray-900 dark:text-dark-text'
                                : 'font-normal text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-surface'
                        )}
                    >
                        <div className="relative">
                            <FiShield size={24} />
                        </div>
                        <span className="text-xl hidden xl:inline">Admin</span>
                    </button>
                )}
            </nav>

            {/* Post Button */}
            <div className="px-3 mb-4">
                <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={() => dispatch(openCreatePost())}
                    className="hidden xl:flex"
                >
                    {t('common.post')}
                </Button>
                <button
                    onClick={() => dispatch(openCreatePost())}
                    className="xl:hidden w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white rounded-full flex items-center justify-center transition-colors"
                >
                    <FiEdit size={20} />
                </button>
            </div>

            {/* Theme Toggle */}
            <div className="space-y-2">
                <div className="flex items-center justify-between px-4">
                    <span className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        {isDark ? t('settings.dark_mode') : t('settings.light_mode')}
                    </span>
                    <IconButton
                        icon={isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
                        onClick={toggle}
                        variant="default"
                    />
                </div>
            </div>

            {/* User Profile */}
            {user && (
                <div className="p-3">
                    <Dropdown
                        trigger={
                            <button className="w-full flex items-center gap-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors">
                                <Avatar
                                    src={user.avatarUrl || user.avatar}
                                    alt={user.displayName}
                                    size="md"
                                />
                                <div className="flex-1 text-left hidden xl:block">
                                    <p className="font-semibold text-sm text-gray-900 dark:text-dark-text truncate">
                                        {user.displayName}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                        @{user.handle}
                                    </p>
                                </div>
                            </button>
                        }
                        items={[
                            {
                                id: 'logout',
                                label: t('settings.logout_label'),
                                icon: <FiLogOut />,
                                onClick: handleLogout,
                                danger: true,
                            },
                        ]}
                        align="right"
                    />
                </div>
            )}
        </div>
    );
};

export default Sidebar;
