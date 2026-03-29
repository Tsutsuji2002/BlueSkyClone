import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { closeMobileMenu } from '../../redux/slices/modalsSlice';
import Avatar from '../common/Avatar';
import { useTranslation } from 'react-i18next';
import {
    FiX, FiHome, FiSearch, FiBell, FiMail, FiUser, FiSettings,
    FiRss, FiList, FiBookmark, FiLogOut, FiSun, FiMoon, FiShield, FiHash, FiMessageCircle, FiHelpCircle, FiMessageSquare
} from 'react-icons/fi';
import { RootState } from '../../redux/store';
import { cn } from '../../utils/classNames';
import { useTheme } from '../../hooks/useTheme';
import { logoutAsync } from '../../redux/slices/authSlice';
import IconButton from '../common/IconButton';

const iconMap: Record<string, React.ReactNode> = {
    home: <FiHome size={22} />,
    search: <FiSearch size={22} />,
    bell: <FiBell size={22} />,
    mail: <FiMessageCircle size={22} />,
    feeds: <FiHash size={22} />,
    lists: <FiList size={22} />,
    saved: <FiBookmark size={22} />,
    user: <FiUser size={22} />,
    settings: <FiSettings size={22} />,
};

const MobileMenu: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { toggle, isDark } = useTheme();
    const user = useAppSelector((state: RootState) => state.auth.user);
    const isOpen = useAppSelector((state: RootState) => state.modals.mobileMenu);
    const unreadNotifications = useAppSelector((state: RootState) => state.notifications.unreadCount);
    const conversations = useAppSelector((state: RootState) => state.messages.conversations);
    const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

    // Local state to handle the transition timing
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    return (
        <div
            className={`lg:hidden fixed inset-0 z-[100] bg-black/50 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0'
                }`}
            onClick={() => dispatch(closeMobileMenu())}
        >
            <div
                className={`w-80 h-full bg-white dark:bg-dark-bg overflow-y-auto transform transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Menu Header */}
                <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                            {t('common.menu', { defaultValue: 'Menu' })}
                        </h2>
                        <button
                            onClick={() => dispatch(closeMobileMenu())}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full"
                        >
                            <FiX size={24} className="text-gray-700 dark:text-dark-text" />
                        </button>
                    </div>

                    {/* User Info */}
                    {user ? (
                        <div
                            className="mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface p-2 rounded-xl transition-colors"
                            onClick={() => {
                                navigate(`/profile/${user.handle}`);
                                dispatch(closeMobileMenu());
                            }}
                        >
                            <Avatar
                                src={user.avatarUrl || user.avatar}
                                alt={user.displayName}
                                size="lg"
                                className="mb-3"
                            />
                            <p className="font-bold text-gray-900 dark:text-dark-text text-xl">{user.displayName || user.handle}</p>
                            <p className="text-gray-500 dark:text-dark-text-secondary">@{user.handle}</p>
                            <div className="flex items-center gap-1.5 mt-2 text-sm">
                                <span className="text-gray-700 dark:text-dark-text">
                                    <strong>{user.followersCount}</strong> {t('profile.followers')}
                                </span>
                                <span className="text-gray-400 dark:text-dark-text-secondary">·</span>
                                <span className="text-gray-700 dark:text-dark-text">
                                    <strong>{user.followingCount}</strong> {t('profile.following')}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-2 text-center flex flex-col items-center">
                            <h3 className="text-xl font-black text-gray-900 dark:text-dark-text mb-4">
                                {t('auth.welcome.title', { defaultValue: 'Join the conversation!' })}
                            </h3>
                            <button
                                onClick={() => {
                                    dispatch(closeMobileMenu());
                                    navigate('/signup');
                                }}
                                className="w-full bg-primary-500 hover:bg-primary-600 text-white font-bold py-3 rounded-full mb-3 transition-colors"
                            >
                                {t('auth.welcome.create_account', { defaultValue: 'Create account' })}
                            </button>
                            <button
                                onClick={() => {
                                    dispatch(closeMobileMenu());
                                    navigate('/login');
                                }}
                                className="w-full bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-900 dark:text-dark-text font-bold py-3 rounded-full transition-colors"
                            >
                                {t('auth.welcome.login', { defaultValue: 'Log in' })}
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation Items */}
                <nav className="p-4">
                    {NAV_ITEMS.filter(item => user || ['home', 'search', 'feeds', 'lists'].includes(item.id)).map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/profile' && location.pathname.startsWith('/profile'));

                        const badgeCount = item.id === 'notifications' ? unreadNotifications : (item.id === 'messages' ? unreadMessages : 0);

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    navigate(item.id === 'profile' ? `/profile/${user?.handle}` : item.path);
                                    dispatch(closeMobileMenu());
                                }}
                                className={cn(
                                    "w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-1 transition-colors",
                                    isActive
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-500 font-bold'
                                        : 'hover:bg-gray-100 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text'
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
                                <span className="text-xl">{t(`nav.${item.id}`)}</span>
                            </button>
                        );
                    })}

                    {user?.role === 'admin' && (
                        <button
                            onClick={() => {
                                navigate('/admin');
                                dispatch(closeMobileMenu());
                            }}
                            className={cn(
                                "w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-1 transition-colors",
                                location.pathname.startsWith('/admin')
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-500 font-bold'
                                    : 'hover:bg-gray-100 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text'
                            )}
                        >
                            <FiShield size={22} />
                            <span className="text-xl">{t('nav.admin')}</span>
                        </button>
                    )}
                </nav>

                {/* Theme Toggle */}
                <div className="p-4 border-t border-gray-100 dark:border-dark-border">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-dark-text-secondary">
                            {isDark ? t('settings.dark_mode') : t('settings.light_mode')}
                        </span>
                        <IconButton
                            icon={isDark ? <FiSun size={20} /> : <FiMoon size={20} />}
                            onClick={toggle}
                            variant="default"
                        />
                    </div>
                </div>

                {/* Footer Links & Logout */}
                <div className="p-4 border-t border-gray-200 dark:border-dark-border">
                    {user && (
                        <button
                            onClick={async () => {
                                await dispatch(logoutAsync());
                                dispatch(closeMobileMenu());
                                navigate('/welcome');
                            }}
                            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl mb-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors font-bold"
                        >
                            <FiLogOut size={22} />
                            <span>{t('settings.logout_label')}</span>
                        </button>
                    )}

                    <div className="flex flex-col gap-2 px-4 mb-6">
                        <button
                            onClick={() => {
                                navigate('/settings/about');
                                dispatch(closeMobileMenu());
                            }}
                            className="text-[#0085ff] dark:text-primary-500 hover:underline text-sm font-medium text-left"
                        >
                            {t('signup.terms_link')}
                        </button>
                        <button
                            onClick={() => {
                                navigate('/about/privacy-policy');
                                dispatch(closeMobileMenu());
                            }}
                            className="text-[#0085ff] dark:text-primary-500 hover:underline text-sm font-medium text-left"
                        >
                            {t('signup.privacy_link')}
                        </button>
                    </div>

                    <div className="flex gap-2 px-2 mt-4">
                        <button
                            onClick={() => {
                                navigate('/support');
                                dispatch(closeMobileMenu());
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border rounded-full text-sm font-bold text-gray-900 dark:text-dark-text transition-all"
                        >
                            <FiMessageSquare size={18} />
                            {t('sidebar.feedback')}
                        </button>
                        <button
                            onClick={() => {
                                navigate('/support?category=other');
                                dispatch(closeMobileMenu());
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border rounded-full text-sm font-bold text-gray-900 dark:text-dark-text transition-all"
                        >
                            {t('sidebar.help')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileMenu;
