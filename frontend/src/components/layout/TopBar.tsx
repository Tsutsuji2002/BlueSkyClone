import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { openMobileMenu, closeMobileMenu } from '../../redux/slices/modalsSlice';

import { FiMenu, FiHash } from 'react-icons/fi';
import { RootState } from '../../redux/store';
import ButterflyLogo from '../common/ButterflyLogo';

const TopBar: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const isMobileMenuOpen = useAppSelector((state: RootState) => state.modals.mobileMenu);
    const unreadNotifications = useAppSelector((state: RootState) => state.notifications.unreadCount);
    const conversations = useAppSelector((state: RootState) => state.messages.conversations);
    const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
    const totalUnread = unreadNotifications + unreadMessages;

    const setIsMobileMenuOpen = (open: boolean) => {
        if (open) {
            dispatch(openMobileMenu());
        } else {
            dispatch(closeMobileMenu());
        }
    };

    return (
        <>
            {/* Top Bar */}
            <div className="lg:hidden sticky top-0 z-50 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                <div className="flex items-center justify-between p-4">
                    {/* Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full relative"
                    >
                        <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                        {totalUnread > 0 && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-primary-500 rounded-full border-2 border-white dark:border-dark-bg" />
                        )}
                    </button>

                    {/* Logo */}
                    <ButterflyLogo
                        className="w-8 h-8 text-primary-500 cursor-pointer"
                        onClick={() => navigate('/')}
                    />

                    {/* Feeds/Hash Icon */}
                    <button
                        onClick={() => navigate('/feeds')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full"
                    >
                        <FiHash size={24} className="text-gray-700 dark:text-dark-text" />
                    </button>
                </div>
            </div>

        </>
    );
};

export default TopBar;
