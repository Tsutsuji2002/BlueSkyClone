import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
    FiHome, FiSearch, FiBell, FiSettings,
    FiSun, FiMoon, FiLogOut, FiEdit, FiList, FiBookmark, FiShield, FiHash, FiMessageCircle, FiUser, FiPlus
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ScrollToTopButton from '../common/ScrollToTopButton';
import { NAV_ITEMS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useTheme } from '../../hooks/useTheme';
import { openCreatePost } from '../../redux/slices/modalsSlice';
import { logout, logoutAll, setSessionExpired } from '../../redux/slices/authSlice';
import ConfirmModal from '../common/ConfirmModal';
import { useLogoutMutation, useSwitchAccountMutation } from '../../redux/api/authApi';
import Avatar from '../common/Avatar';
import Dropdown from '../common/Dropdown';
import { BsPatchCheckFill } from 'react-icons/bs';
import { cn } from '../../utils/classNames';
import ButterflyLogo from '../common/ButterflyLogo';
import { fetchUnreadCount } from '../../redux/slices/notificationsSlice';
import { fetchConversations } from '../../redux/slices/messagesSlice';
import { hydrateForAccount as hydrateFeedsForAccount } from '../../redux/slices/feedsSlice';
import { hydrateForAccount as hydrateListsForAccount } from '../../redux/slices/listsSlice';

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
    const { user, savedAccounts } = useAppSelector((state) => state.auth);
    const unreadNotifications = useAppSelector((state) => state.notifications.unreadCount);
    const conversations = useAppSelector((state) => state.messages.conversations);
    const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

    const [logoutMutation] = useLogoutMutation();
    const [switchMutation] = useSwitchAccountMutation();
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

    const handleLogout = () => {
        setShowLogoutConfirm(true);
    };

    const handleConfirmLogout = async () => {
        try {
            await logoutMutation().unwrap();
        } catch (err) {
            console.error('Logout API failed:', err);
        } finally {
            dispatch(logoutAll());
            navigate('/welcome');
        }
    };


    const handleAddAccount = () => {
        // Navigate to login WITHOUT logging out — the current session stays alive
        // until the new account successfully logs in (setAuth replaces the session)
        navigate('/login');
    };

    const handleSwitchAccount = async (account: any) => {
        // Try instant switch if account has a token
        if (account.refreshToken) {
            try {
                const data = await switchMutation({ refreshToken: account.refreshToken }).unwrap();
                dispatch({ type: 'auth/setAuth', payload: data });
                
                // [CRITICAL] Force a full page reload to ensure the "Entire UI" is cleared 
                // of any ghost data and every component re-fetches with the new session.
                window.location.reload();
                return;
            } catch (err: any) {
                const status = err?.status || err?.originalStatus;
                if (status === 401) {
                    // Token has expired (7-day grace period) → clear it, go to re-login
                    dispatch(setSessionExpired(account.did));
                } else {
                    console.warn('Switch failed with non-auth error, falling back to login form', err);
                }
            }
        }
        // No token or token expired → navigate to login with handle pre-filled
        navigate('/login', { state: { prefillHandle: account.handle } });
    };

    return (
        <div className="h-screen sticky top-0 flex flex-col py-3 px-2 lg:px-4 w-[72px] xl:w-full transition-all overflow-y-auto no-scrollbar border-r border-transparent">
            
            {/* Content Wrapper restricting to 240px width and pushing to right boundary */}
            <div className="flex flex-col w-full xl:w-[240px] xl:ml-auto">
            
            {/* Account Switcher - AT TOP (Refactored for Multi-Account as per Pic 3) */}
            {user ? (
                <div className="w-full flex justify-center xl:justify-start">
                    <Dropdown
                        trigger={
                            <button aria-label="Switch accounts" className="group flex items-center justify-center xl:justify-between py-1.5 px-2 xl:w-full rounded-xl bg-transparent hover:bg-gray-200 dark:hover:bg-[#161e27] transition-all duration-150 gap-2.5 outline-none">
                                <div className="flex-shrink-0 relative z-10 transform origin-left transition-transform duration-150 group-hover:scale-[0.85] group-hover:-translate-x-0.5">
                                    <Avatar
                                        src={user.avatarUrl || user.avatar}
                                        alt={user.displayName}
                                        size="md" // 40x40
                                    />
                                </div>
                                <div className="flex-1 min-w-0 hidden xl:flex flex-col text-left opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out -ml-2">
                                    <div className="font-bold text-[13.5px] text-gray-900 dark:text-dark-text truncate leading-tight flex items-center gap-1">
                                        <span className="truncate">{user.displayName}</span>
                                        {user.isVerified && <BsPatchCheckFill className="text-blue-500 flex-shrink-0" size={13} />}
                                    </div>
                                    <div className="text-[11.5px] text-gray-500 dark:text-dark-text-secondary truncate mt-[0.5px]">
                                        @{user.handle.length > 15 ? `${user.handle.substring(0, 15)}...` : user.handle}
                                    </div>
                                </div>
                                <div className="hidden xl:flex flex-shrink-0 text-gray-400 dark:text-gray-500 pl-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out items-center">
                                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{color: 'currentcolor'}}><path fill="currentColor" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path></svg>
                                </div>
                            </button>
                        }
                        items={[
                            // Header (based on HTML)
                            {
                                id: 'header',
                                content: (
                                    <div className="text-[13.1px] tracking-[0.25px] text-[#8798B0] font-semibold px-[10px] py-1 leading-[17px] select-none">
                                        {t('auth.login.switch_account')}
                                    </div>
                                ),
                                disabled: true,
                            },
                            // Active User
                            {
                                id: 'active-user',
                                content: (
                                    <div className="flex items-center gap-2 px-[10px] py-2 rounded-[4px] hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                                        <Avatar src={user.avatarUrl || user.avatar} alt={user.displayName} size="xs" className="w-5 h-5" />
                                        <div className="text-[13.1px] tracking-[0.25px] font-bold text-gray-900 dark:text-dark-text truncate flex-1">
                                            @{user.handle}
                                        </div>
                                    </div>
                                ),
                                disabled: true,
                            },
                            // Other Saved Accounts
                            ...savedAccounts
                                .filter(acc => acc.did !== user.did)
                                .map(acc => ({
                                    id: `switch-${acc.did}`,
                                    content: (
                                        <div className="flex items-center gap-2 px-[10px] py-2 rounded-[4px] hover:bg-gray-50 dark:hover:bg-dark-hover transition-colors">
                                            <Avatar src={acc.avatar} alt={acc.displayName} size="xs" className="w-5 h-5" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[13.1px] tracking-[0.25px] font-bold text-gray-900 dark:text-dark-text truncate w-full text-left">
                                                    @{acc.handle}
                                                </div>
                                            </div>
                                        </div>
                                    ),
                                    onClick: () => handleSwitchAccount(acc),
                                })),
                            { h: true, id: 'divider-1' } as any,
                            // Go to profile
                            {
                                id: 'go-profile',
                                label: t('nav.go_profile'),
                                icon: <FiUser className="text-[20px]" />,
                                onClick: () => navigate(`/profile/${user.handle}`),
                            },
                            // Add another account
                            {
                                id: 'add-account',
                                label: t('auth.login.other_account'),
                                icon: <FiPlus className="text-[20px]" />,
                                onClick: handleAddAccount,
                            },
                            // Sign out
                            {
                                id: 'logout',
                                label: t('auth.login.sign_out'),
                                icon: <FiLogOut className="text-[20px]" />,
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
            <nav className="flex-1 flex flex-col w-full" role="navigation">
                {NAV_ITEMS.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.path === '/profile' && location.pathname.startsWith('/profile'));

                    const badgeCount = item.id === 'notifications' ? unreadNotifications : (item.id === 'messages' ? unreadMessages : 0);

                    return (
                        <div key={item.id} className="flex justify-center xl:justify-start w-full">
                            <Link
                                aria-label={t(`nav.${item.id}`)!}
                                to={item.id === 'profile' ? `/profile/${user?.handle}` : item.path}
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
                                    <span className="text-[19px] truncate tracking-wide">{t(`nav.${item.id}`)}</span>
                                </div>
                            </Link>
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
                                <span className="text-[19px] truncate tracking-wide">{t('nav.admin')}</span>
                            </div>
                        </button>
                    </div>
                )}

            {/* Post Button */}
            <div className="mt-1 mb-4 flex justify-center xl:justify-start w-full">
                <button
                    aria-label={t('common.create_post')}
                    onClick={() => dispatch(openCreatePost())}
                    className="flex items-center justify-center bg-[#0085FF] hover:bg-[#0070DF] text-white transition-colors rounded-full xl:w-fit xl:py-[10px] xl:pl-[12px] xl:pr-[24px] w-[52px] h-[52px] shadow-md gap-3"
                >
                    <div className="flex items-center justify-center w-[18px] h-[18px] xl:mr-0.5">
                        <svg fill="none" width="16" viewBox="0 0 24 24" height="16" style={{color: 'rgb(255, 255, 255)'}}><path fill="#FFFFFF" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M17.293 2.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-9 9A1 1 0 0 1 12 16H9a1 1 0 0 1-1-1v-3a1 1 0 0 1 .293-.707l9-9ZM10 12.414V14h1.586l8-8L18 4.414l-8 8ZM3 4a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2H5v14h14v-6a1 1 0 1 1 2 0v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Z"></path></svg>
                    </div>
                    <span className="hidden xl:inline text-[15px] font-bold tracking-wide">
                        {t('common.new_post')}
                    </span>
                </button>
            </div>
            </nav>
            </div>

            {/* Scroll to top button - positioned at bottom-right of sidebar */}
            <ScrollToTopButton />
            
            <ConfirmModal
                isOpen={showLogoutConfirm}
                onClose={() => setShowLogoutConfirm(false)}
                onConfirm={handleConfirmLogout}
                title={t('auth.logout_confirm_title', 'Sign out?')}
                message={t('auth.logout_confirm_message', 'You will be signed out of all your accounts.')}
                confirmLabel={t('auth.logout_confirm_btn', 'Sign out')}
                variant="danger"
            />
        </div>
    );
};


export default Sidebar;
