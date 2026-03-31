import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    FiHome, FiSearch, FiBell, FiSettings,
    FiSun, FiMoon, FiLogOut, FiEdit, FiList, FiBookmark, FiShield, FiHash, FiMessageCircle, FiUser
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useTheme } from '../../hooks/useTheme';
import { openCreatePost } from '../../redux/slices/modalsSlice';
import { logoutAsync } from '../../redux/slices/authSlice';
import Avatar from '../common/Avatar';
import Dropdown from '../common/Dropdown';
import { BsPatchCheckFill } from 'react-icons/bs';
import { cn } from '../../utils/classNames';
import ButterflyLogo from '../common/ButterflyLogo';

const iconMap: Record<string, React.ReactNode> = {
    home: <FiHome size={28} strokeWidth={2} />,
    search: <FiSearch size={28} strokeWidth={2} />,
    bell: <FiBell size={28} strokeWidth={2} />,
    mail: <FiMessageCircle size={28} strokeWidth={2} />,
    notifications: <FiBell size={28} strokeWidth={2} />,
    feeds: <FiHash size={28} strokeWidth={2} />,
    lists: <FiList size={28} strokeWidth={2} />,
    saved: <FiBookmark size={28} strokeWidth={2} />,
    user: <FiUser size={28} strokeWidth={2} />,
    settings: <FiSettings size={28} strokeWidth={2} />,
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
        <div className="h-screen sticky top-0 flex flex-col py-3 px-2 lg:px-4 w-[72px] xl:w-[280px] transition-all overflow-y-auto no-scrollbar border-r border-transparent">
            
            {/* Account Switcher - AT TOP */}
            {user ? (
                <div className="w-full flex justify-center xl:justify-start mb-2">
                    <Dropdown
                        trigger={
                            <button aria-label="Switch accounts" className="group flex items-center justify-center xl:justify-between p-2 lg:p-3 xl:px-4 xl:w-full rounded-full hover:bg-gray-200 dark:hover:bg-[#161e27] transition-colors gap-3 outline-none">
                                <div className="flex-shrink-0 relative z-10">
                                    <Avatar
                                        src={user.avatarUrl || user.avatar}
                                        alt={user.displayName}
                                        size="lg" // 48x48
                                    />
                                </div>
                                <div className="flex-1 min-w-0 hidden xl:flex flex-col text-left opacity-0 group-hover:opacity-100 transition-opacity duration-100 ease-in-out -ml-2">
                                    <div className="font-bold text-[15px] text-gray-900 dark:text-dark-text truncate leading-tight flex items-center gap-1">
                                        <span className="truncate">{user.displayName}</span>
                                        {user.isVerified && <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />}
                                    </div>
                                    <div className="text-[13px] text-gray-500 dark:text-dark-text-secondary truncate mt-0.5">
                                        @{user.handle}
                                    </div>
                                </div>
                                <div className="hidden xl:block flex-shrink-0 text-gray-400 dark:text-gray-500 pl-1 opacity-0 group-hover:opacity-100 transition-opacity duration-100 ease-in-out">
                                    <svg fill="none" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{color: 'currentcolor'}}><path fill="currentColor" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path></svg>
                                </div>
                            </button>
                        }
                        items={[
                            {
                                id: 'go-profile',
                                label: 'Go to profile',
                                icon: <FiUser />,
                                onClick: () => navigate(`/profile/${user.handle}`),
                            },
                            {
                                id: 'add-account',
                                label: 'Add another account',
                                icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" /></svg>,
                                onClick: () => {},
                            },
                            {
                                id: 'theme-toggle',
                                label: isDark ? t('settings.light_mode') : t('settings.dark_mode'),
                                icon: isDark ? <FiSun /> : <FiMoon />,
                                onClick: toggle,
                            },
                            {
                                id: 'logout',
                                label: 'Sign out',
                                icon: <FiLogOut />,
                                onClick: handleLogout,
                            },
                        ]}
                        align="left"
                    />
                </div>
            ) : (
                <div className="px-3 mb-4 mt-2 flex justify-center xl:justify-start" onClick={() => navigate('/')}>
                    <ButterflyLogo className="w-9 h-9 text-primary-500 cursor-pointer" />
                </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 space-y-1 w-full" role="navigation">
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path === '/profile' && location.pathname.startsWith('/profile'));

                    const badgeCount = item.id === 'notifications' ? unreadNotifications : (item.id === 'messages' ? unreadMessages : 0);

                    return (
                        <div key={item.id} className="flex justify-center xl:justify-start w-full">
                            <button
                                aria-label={t(`nav.${item.id}`)!}
                                onClick={() => navigate(item.id === 'profile' ? `/profile/${user?.handle}` : item.path)}
                                className={cn(
                                    'group flex items-center p-3 rounded-xl transition-none outline-none hover:bg-gray-200 dark:hover:bg-[#161e27]',
                                    isActive 
                                        ? 'font-bold text-gray-900 dark:text-white'
                                        : 'text-gray-800 dark:text-gray-100'
                                )}
                            >
                                <div className="relative flex-shrink-0 flex items-center justify-center w-[28px] h-[28px] xl:mr-4">
                                    {iconMap[item.icon]}
                                    {badgeCount > 0 && (
                                        <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] bg-primary-500 text-white text-[11px] px-1 rounded-full flex items-center justify-center font-bold shadow-sm border border-white dark:border-dark-bg">
                                            {badgeCount > 9 ? '9+' : badgeCount}
                                        </span>
                                    )}
                                </div>
                                <div className="hidden xl:block flex-shrink-0 xl:pr-5">
                                    <span className="text-[20px] truncate tracking-wide">{t(`nav.${item.id}`)}</span>
                                </div>
                            </button>
                        </div>
                    );
                })}

                {user?.role === 'admin' && (
                    <div className="flex justify-center xl:justify-start w-full">
                        <button
                            aria-label={t('nav.admin')!}
                            onClick={() => navigate('/admin')}
                            className={cn(
                                'group flex items-center p-3 rounded-xl transition-none outline-none hover:bg-gray-200 dark:hover:bg-[#161e27]',
                                location.pathname.startsWith('/admin')
                                    ? 'font-bold text-gray-900 dark:text-white'
                                    : 'text-gray-800 dark:text-gray-100'
                            )}
                        >
                            <div className="relative flex-shrink-0 flex items-center justify-center w-[28px] h-[28px] xl:mr-4">
                                <FiShield size={28} strokeWidth={2} />
                            </div>
                            <div className="hidden xl:block flex-shrink-0 xl:pr-5">
                                <span className="text-[20px] truncate tracking-wide">{t('nav.admin')}</span>
                            </div>
                        </button>
                    </div>
                )}
            </nav>

            {/* Post Button */}
            <div className="px-1 mt-6 mb-4 xl:pl-3 flex justify-center xl:justify-start w-full">
                <button
                    aria-label="Compose new post"
                    onClick={() => dispatch(openCreatePost())}
                    className="flex items-center justify-center bg-[#0085FF] hover:bg-[#0070DF] text-white transition-colors rounded-full xl:w-[90%] xl:py-[12px] xl:px-[24px] w-[52px] h-[52px] xl:h-[auto] shadow-md gap-2"
                >
                    <div className="flex items-center justify-center w-[20px] h-[20px] xl:mr-0.5">
                        <svg fill="none" width="18" viewBox="0 0 24 24" height="18" style={{color: 'rgb(255, 255, 255)'}}><path fill="#FFFFFF" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M17.293 2.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-9 9A1 1 0 0 1 12 16H9a1 1 0 0 1-1-1v-3a1 1 0 0 1 .293-.707l9-9ZM10 12.414V14h1.586l8-8L18 4.414l-8 8ZM3 4a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2H5v14h14v-6a1 1 0 1 1 2 0v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Z"></path></svg>
                    </div>
                    <span className="hidden xl:inline text-[16px] font-bold tracking-wide">
                        New Post
                    </span>
                </button>
            </div>
            
        </div>
    );
};

export default Sidebar;
