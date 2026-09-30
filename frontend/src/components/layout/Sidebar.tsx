import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FiLogOut, FiUser, FiPlus, FiShield } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import ScrollToTopButton from '../common/ScrollToTopButton';
import { NAV_ITEMS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { openCreatePost } from '../../redux/slices/modalsSlice';
import { logoutAll, setSessionExpired } from '../../redux/slices/authSlice';
import ConfirmModal from '../common/ConfirmModal';
import { useLogoutMutation, useSwitchAccountMutation } from '../../redux/api/authApi';
import Avatar from '../common/Avatar';
import Dropdown from '../common/Dropdown';
import { BsPatchCheckFill } from 'react-icons/bs';
import { cn } from '../../utils/classNames';
import ButterflyLogo from '../common/ButterflyLogo';

// Active (Solid / Filled) Bluesky SVG Icons
const BlueskyActiveIcons: Record<string, React.ReactNode> = {
    home: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12.63 1.724a1 1 0 0 0-1.26 0l-8 6.5A1 1 0 0 0 3 9v11a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-6h4v6a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V9a1 1 0 0 0-.37-.776l-8-6.5Z" />
        </svg>
    ),
    search: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11 3a8 8 0 1 0 4.906 14.32l3.387 3.387a1.5 1.5 0 0 0 2.122-2.122l-3.387-3.387A8 8 0 0 0 11 3Z" />
        </svg>
    ),
    bell: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 5 13v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2a1 1 0 0 0-.293-.707L18 11.586V8a6 6 0 0 0-6-6Zm-3 16a3 3 0 0 0 6 0H9Z" />
        </svg>
    ),
    notifications: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 5 13v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2a1 1 0 0 0-.293-.707L18 11.586V8a6 6 0 0 0-6-6Zm-3 16a3 3 0 0 0 6 0H9Z" />
        </svg>
    ),
    mail: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.523.341 2.968.951 4.262l-.93 4.537a1 1 0 0 0 1.163 1.184l4.68-.876A9.968 9.968 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2ZM7.5 13.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
    ),
    messages: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 1.523.341 2.968.951 4.262l-.93 4.537a1 1 0 0 0 1.163 1.184l4.68-.876A9.968 9.968 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2ZM7.5 13.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
    ),
    feeds: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M9.124 3.008a1 1 0 0 1 .868 1.116L9.632 7h5.985l.39-3.124a1 1 0 0 1 1.985.248L17.632 7H20a1 1 0 1 1 0 2h-2.617l-.75 6H20a1 1 0 1 1 0 2h-3.617l-.39 3.124a1 1 0 1 1-1.985-.248l.36-2.876H8.382l-.39 3.124a1 1 0 1 1-1.985-.248L6.368 17H4a1 1 0 1 1 0-2h2.617l.75-6H4a1 1 0 1 1 0-2h3.617l.39-3.124a1 1 0 0 1 1.117-.868ZM9.383 9l-.75 6h5.984l.75-6H9.383Z" />
        </svg>
    ),
    lists: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M6 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2ZM3 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm9 0a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2h-7a1 1 0 0 1-1-1Zm-6 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm-3 1a3 3 0 1 1 6 0 3 3 0 0 1-6 0Zm9 0a1 1 0 0 1 1-1h7a1 1 0 1 1 0 2h-7a1 1 0 0 1-1-1Z" />
        </svg>
    ),
    saved: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
    ),
    user: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" d="M12 2a10 10 0 0 0-7.38 16.75C5.8 16.71 8.63 15 12 15s6.2 1.71 7.38 3.75A10 10 0 0 0 12 2zm0 4a3 3 0 1 1 0 6 3 3 0 0 1 0-6z" />
        </svg>
    ),
    settings: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
        </svg>
    ),
};

// Inactive (Outline / Line) Bluesky SVG Icons
const BlueskyInactiveIcons: Record<string, React.ReactNode> = {
    home: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
        </svg>
    ),
    search: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm-8 6a8 8 0 1 1 14.32 4.906l3.387 3.387a1 1 0 0 1-1.414 1.414l-3.387-3.387A8 8 0 0 1 3 11Z" />
        </svg>
    ),
    bell: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4.216 8.815a7.853 7.853 0 0 1 15.568 0l1.207 9.053A1 1 0 0 1 20 19h-3.354c-.904 1.748-2.607 3-4.646 3-2.039 0-3.742-1.252-4.646-3H4a1 1 0 0 1-.991-1.132l1.207-9.053ZM9.778 19c.61.637 1.399 1 2.222 1s1.613-.363 2.222-1H9.778ZM12 4a5.853 5.853 0 0 0-5.802 5.08L5.142 17h13.716l-1.056-7.92A5.853 5.853 0 0 0 12 4Z" />
        </svg>
    ),
    notifications: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4.216 8.815a7.853 7.853 0 0 1 15.568 0l1.207 9.053A1 1 0 0 1 20 19h-3.354c-.904 1.748-2.607 3-4.646 3-2.039 0-3.742-1.252-4.646-3H4a1 1 0 0 1-.991-1.132l1.207-9.053ZM9.778 19c.61.637 1.399 1 2.222 1s1.613-.363 2.222-1H9.778ZM12 4a5.853 5.853 0 0 0-5.802 5.08L5.142 17h13.716l-1.056-7.92A5.853 5.853 0 0 0 12 4Z" />
        </svg>
    ),
    mail: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4 12a8 8 0 1 1 4.445 7.169 1 1 0 0 0-.629-.088l-3.537.662.7-3.415a1 1 0 0 0-.09-.66A7.961 7.961 0 0 1 4 12Zm8-10C6.477 2 2 6.477 2 12c0 1.523.341 2.968.951 4.262l-.93 4.537a1 1 0 0 0 1.163 1.184l4.68-.876A9.968 9.968 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2ZM7.5 13.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
    ),
    messages: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M4 12a8 8 0 1 1 4.445 7.169 1 1 0 0 0-.629-.088l-3.537.662.7-3.415a1 1 0 0 0-.09-.66A7.961 7.961 0 0 1 4 12Zm8-10C6.477 2 2 6.477 2 12c0 1.523.341 2.968.951 4.262l-.93 4.537a1 1 0 0 0 1.163 1.184l4.68-.876A9.968 9.968 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2ZM7.5 13.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Zm4.5 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5Z" />
        </svg>
    ),
    feeds: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
        </svg>
    ),
    lists: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
    ),
    saved: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M9.7 16.895a4 4 0 0 1 4.6 0l3.7 2.6V6.5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v12.995l3.7-2.6Zm10.3 2.6c0 1.62-1.825 2.567-3.15 1.636l-3.7-2.6a2.001 2.001 0 0 0-2.3 0l-3.7 2.6C5.825 22.062 4 21.115 4 19.495V6.5a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v12.995Z" />
        </svg>
    ),
    user: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M12 4a8 8 0 0 0-5.935 13.365C7.56 15.895 9.612 15 12 15c2.388 0 4.44.894 5.935 2.365A8 8 0 0 0 12 4Zm4.412 14.675C15.298 17.636 13.792 17 12 17c-1.791 0-3.298.636-4.412 1.675A7.96 7.96 0 0 0 12 20a7.96 7.96 0 0 0 4.412-1.325ZM2 12C2 6.477 6.477 2 12 2s10 4.477 10 10a9.98 9.98 0 0 1-3.462 7.567A9.965 9.965 0 0 1 12 22a9.965 9.965 0 0 1-6.538-2.433A9.98 9.98 0 0 1 2 12Zm10-4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 2a4 4 0 1 1 8 0 4 4 0 0 1-8 0Z" />
        </svg>
    ),
    settings: (
        <svg fill="none" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true" style={{ color: 'currentColor' }}>
            <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M11.1 2a1 1 0 0 0-.832.445L8.851 4.57 6.6 4.05a1 1 0 0 0-.932.268l-1.35 1.35a1 1 0 0 0-.267.932l.52 2.251-2.126 1.417A1 1 0 0 0 2 11.1v1.8a1 1 0 0 0 .445.832l2.125 1.417-.52 2.251a1 1 0 0 0 .268.932l1.35 1.35a1 1 0 0 0 .932.267l2.251-.52 1.417 2.126A1 1 0 0 0 11.1 22h1.8a1 1 0 0 0 .832-.445l1.417-2.125 2.251.52a1 1 0 0 0 .932-.268l1.35-1.35a1 1 0 0 0 .267-.932l-.52-2.251 2.126-1.417A1 1 0 0 0 22 12.9v-1.8a1 1 0 0 0-.445-.832L19.43 8.851l.52-2.251a1 1 0 0 0-.268-.932l-1.35-1.35a1 1 0 0 0-.932-.267l-2.251.52-1.417-2.126A1 1 0 0 0 12.9 2h-1.8Zm-.968 4.255L11.635 4h.73l1.503 2.255a1 1 0 0 0 1.057.42l2.385-.551.566.566-.55 2.385a1 1 0 0 0 .42 1.057L20 11.635v.73l-2.255 1.503a1 1 0 0 0-.42 1.057l.551 2.385-.566.566-2.385-.55a1 1 0 0 0-1.057.42L12.365 20h-.73l-1.503-2.255a1 1 0 0 0-1.057-.42l-2.385.551-.566-.566.55-2.385a1 1 0 0 0-.42-1.057L4 12.365v-.73l2.255-1.503a1 1 0 0 0 .42-1.057L6.123 6.69l.566-.566 2.385.55a1 1 0 0 0 1.057-.42ZM8 12a4 4 0 1 1 8 0 4 4 0 0 1-8 0Zm4-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
        </svg>
    ),
};

const Sidebar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { user, savedAccounts } = useAppSelector((state) => state.auth);
    const unreadNotifications = useAppSelector((state) => state.notifications.unreadCount);
    const conversations = useAppSelector((state) => state.messages.conversations);
    const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

    const [logoutMutation] = useLogoutMutation();
    const [switchMutation] = useSwitchAccountMutation();
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

    const isMessagesPage = location.pathname.startsWith('/messages');

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
        navigate('/login', { state: { from: location } });
    };

    const handleSwitchAccount = async (account: any) => {
        if (account.refreshToken) {
            try {
                const data = await switchMutation({ refreshToken: account.refreshToken }).unwrap();
                dispatch({ type: 'auth/setAuth', payload: data });
                window.location.reload();
                return;
            } catch (err: any) {
                const status = err?.status || err?.originalStatus;
                if (status === 401) {
                    dispatch(setSessionExpired(account.did));
                } else {
                    console.warn('Switch failed with non-auth error, falling back to login form', err);
                }
            }
        }
        navigate('/login', { state: { prefillHandle: account.handle, from: location } });
    };

    const renderIcon = (key: string, isActive: boolean) => {
        const iconDict = isActive ? BlueskyActiveIcons : BlueskyInactiveIcons;
        return iconDict[key] || (isActive ? BlueskyActiveIcons.home : BlueskyInactiveIcons.home);
    };

    return (
        <div className={cn(
            "h-screen sticky top-0 flex flex-col py-3 px-1 sm:px-2 transition-all overflow-y-auto no-scrollbar border-r border-transparent items-end",
            isMessagesPage ? "w-[72px]" : "w-[72px] lg:w-full"
        )}>
            <div className={cn(
                "flex flex-col w-full lg:ml-auto items-start",
                !isMessagesPage && "lg:w-[240px]"
            )}>
                {/* Top Profile / Account Switcher Button */}
                {user ? (
                    <div className="w-full flex justify-center lg:justify-start mb-2">
                        <Dropdown
                            className="w-full"
                            trigger={
                                <button
                                    aria-label="Switch accounts"
                                    type="button"
                                    className="group flex items-center justify-between w-full rounded-full hover:bg-[#f0f3f4] active:bg-[#e4e7eb] dark:hover:bg-[#161e27] transition-all duration-200 outline-none cursor-pointer p-1 pr-2.5 gap-2 overflow-hidden"
                                >
                                    <div className="relative z-10 flex-shrink-0 transition-transform duration-200 group-hover:scale-[0.85] group-hover:-translate-x-1 origin-left">
                                        <div className="w-10 h-10 relative">
                                            <div className="overflow-hidden w-10 h-10 rounded-full bg-gray-50">
                                                <Avatar
                                                    src={user.avatarUrl || user.avatar}
                                                    alt={user.displayName}
                                                    size="md"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="absolute inset-0 border border-[#dce2ea] dark:border-dark-border opacity-60 pointer-events-none rounded-full" />
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "flex-1 flex flex-col text-left min-w-0 transition-opacity duration-150 opacity-0 group-hover:opacity-100 overflow-hidden",
                                        !isMessagesPage && "lg:flex"
                                    )}>
                                        <div className="font-bold text-[12.5px] tracking-[0.1px] text-gray-900 dark:text-white truncate leading-[15px] max-w-full">
                                            {user.displayName}
                                        </div>
                                        <div className="text-[10.8px] tracking-[0.1px] text-[#536471] dark:text-[#8798B0] truncate leading-[13.5px] max-w-full">
                                            @{user.handle}
                                        </div>
                                    </div>
                                    <svg fill="none" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" className={cn(
                                        "flex-shrink-0 text-[#536471] dark:text-[#8798B0] transition-opacity duration-150 opacity-0 group-hover:opacity-100 ml-auto",
                                        !isMessagesPage && "lg:block"
                                    )}>
                                        <path fill="currentColor" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M2 12a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm16 0a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm-6-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                                    </svg>
                                </button>
                            }
                            items={[
                                {
                                    id: 'header',
                                    content: (
                                        <div className="text-[13.1px] tracking-[0.25px] text-[#8798B0] font-semibold px-[10px] py-1 leading-[17px] select-none">
                                            {t('auth.login.switch_account')}
                                        </div>
                                    ),
                                    disabled: true,
                                },
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
                                {
                                    id: 'go-profile',
                                    label: t('nav.go_profile'),
                                    icon: <FiUser className="text-[20px]" />,
                                    onClick: () => navigate(`/profile/${user.handle}`),
                                },
                                {
                                    id: 'add-account',
                                    label: t('auth.login.other_account'),
                                    icon: <FiPlus className="text-[20px]" />,
                                    onClick: handleAddAccount,
                                },
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
                    <div className="px-3 mb-4 mt-2 flex justify-center lg:justify-start" onClick={() => navigate('/')}>
                        <ButterflyLogo className="w-9 h-9 text-primary-500 cursor-pointer" />
                    </div>
                )}

                {/* Navigation Links */}
                <nav className="flex-1 flex flex-col w-full" role="navigation">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path ||
                            (item.path === '/profile' && location.pathname.startsWith('/profile'));
                        const badgeCount = item.id === 'notifications' ? unreadNotifications : (item.id === 'messages' ? unreadMessages : 0);

                        return (
                            <div key={item.id} className="flex justify-center lg:justify-start w-full my-[1px]">
                                <Link
                                    aria-label={t(`nav.${item.id}`)!}
                                    to={item.id === 'profile' ? `/profile/${user?.handle}` : item.path}
                                    className={cn(
                                        'group flex items-center py-2.5 px-3 rounded-full transition-colors outline-none gap-3.5',
                                        isActive 
                                            ? 'text-gray-900 dark:text-white font-bold bg-[#f0f3f4] dark:bg-[#161e27]'
                                            : 'text-gray-900 dark:text-gray-100 font-normal hover:bg-[#f0f3f4] dark:hover:bg-[#161e27]'
                                    )}
                                >
                                    <div className={cn(
                                        "relative flex-shrink-0 flex items-center justify-center w-[28px] h-[28px]",
                                        !isMessagesPage && "lg:mr-0.5"
                                    )}>
                                        {renderIcon(item.icon, isActive) || renderIcon(item.id, isActive)}
                                        {badgeCount > 0 && (
                                            <span className="absolute -top-1 -right-2 min-w-[18px] h-[18px] bg-primary-500 text-white text-[11px] px-1 rounded-full flex items-center justify-center font-bold shadow-sm border border-white dark:border-dark-bg">
                                                {badgeCount > 9 ? '9+' : badgeCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className={cn(
                                        "hidden flex-shrink-0 pr-2",
                                        !isMessagesPage && "lg:block"
                                    )}>
                                        <span className={cn(
                                            "text-[18.8px] leading-[24px] tracking-[0.25px] truncate",
                                            isActive ? "font-bold" : "font-normal"
                                        )}>
                                            {t(`nav.${item.id}`)}
                                        </span>
                                    </div>
                                </Link>
                            </div>
                        );
                    })}

                    {/* Admin Nav Item (if user is admin) */}
                    {user?.role === 'admin' && (
                        <div className="flex justify-center lg:justify-start w-full my-[1px]">
                            <button
                                aria-label={t('nav.admin')!}
                                onClick={() => navigate('/admin')}
                                className={cn(
                                    'group flex items-center py-2.5 px-3 rounded-full transition-colors outline-none gap-3.5',
                                    location.pathname.startsWith('/admin')
                                        ? 'text-gray-900 dark:text-white font-bold bg-[#f0f3f4] dark:bg-[#161e27]'
                                        : 'text-gray-900 dark:text-gray-100 font-normal hover:bg-[#f0f3f4] dark:hover:bg-[#161e27]'
                                )}
                            >
                                <div className={cn(
                                    "relative flex-shrink-0 flex items-center justify-center w-[28px] h-[28px]",
                                    !isMessagesPage && "lg:mr-0.5"
                                )}>
                                    <FiShield size={28} strokeWidth={2} />
                                </div>
                                <div className={cn(
                                    "hidden flex-shrink-0 pr-2",
                                    !isMessagesPage && "lg:block"
                                )}>
                                    <span className={cn(
                                        "text-[18.8px] leading-[24px] tracking-[0.25px] truncate",
                                        location.pathname.startsWith('/admin') ? "font-bold" : "font-normal"
                                    )}>
                                        {t('nav.admin')}
                                    </span>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Compose / New Post Button */}
                    <div className="mt-3 mb-4 flex justify-center lg:justify-start w-full">
                        <button
                            aria-label={t('common.create_post')}
                            onClick={() => dispatch(openCreatePost())}
                            className={cn(
                                "flex items-center justify-center bg-[#006AFF] hover:bg-[#0059E0] text-white transition-colors rounded-full shadow-sm gap-2.5",
                                isMessagesPage ? "w-[48px] h-[48px]" : "lg:w-fit lg:py-[10px] lg:px-5 w-[48px] h-[48px]"
                            )}
                        >
                            <div className="flex items-center justify-center w-[20px] h-[20px] flex-shrink-0">
                                <svg fill="none" width="16" height="16" viewBox="0 0 24 24" style={{ color: 'rgb(255, 255, 255)', pointerEvents: 'none' }}>
                                    <path fill="#FFFFFF" stroke="none" strokeWidth="0" strokeLinecap="butt" strokeLinejoin="miter" fillRule="evenodd" clipRule="evenodd" d="M3 16.8V7.2c0-.544-.001-1.011.03-1.395.033-.395.104-.789.297-1.167a3 3 0 0 1 1.31-1.31c.379-.193.772-.265 1.168-.297C6.188 2.999 6.657 3 7.2 3H11a1 1 0 1 1 0 2H7.2c-.576 0-.949 0-1.232.023-.272.022-.373.06-.422.085a1 1 0 0 0-.437.437c-.025.05-.062.15-.085.422C5.001 6.251 5 6.623 5 7.2v9.6c0 .577.001.95.024 1.232.023.272.06.373.085.422a1 1 0 0 0 .437.437c.05.025.15.063.422.085.283.023.656.024 1.232.024h9.6c.576 0 .949-.001 1.232-.024.272-.022.373-.06.422-.085a1 1 0 0 0 .437-.437c.025-.049.062-.15.085-.422.023-.283.024-.655.024-1.232V13a1 1 0 1 1 2 0v3.8c0 .543.001 1.011-.03 1.395-.033.395-.104.788-.297 1.167a3 3 0 0 1-1.31 1.311c-.379.193-.772.264-1.168.296-.383.031-.852.031-1.395.031H7.2c-.543 0-1.012 0-1.395-.031-.396-.032-.789-.103-1.167-.296a3 3 0 0 1-1.31-1.311c-.194-.379-.265-.772-.298-1.167C3 17.81 3 17.343 3 16.8M16.629 2.957a3 3 0 0 1 4.242 0l.172.171a3 3 0 0 1 0 4.243L13 15.414a2 2 0 0 1-1.414.586H9a1 1 0 0 1-1-1v-2.586A2 2 0 0 1 8.586 11zM10 14h1.586l8.043-8.043a1 1 0 0 0 0-1.414l-.172-.172a1 1 0 0 0-1.414 0L10 12.414z" />
                                </svg>
                            </div>
                            <span className={cn(
                                "hidden text-[15px] font-bold tracking-[0.25px]",
                                !isMessagesPage && "lg:inline"
                            )}>
                                {t('common.new_post')}
                            </span>
                        </button>
                    </div>
                </nav>
            </div>

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
