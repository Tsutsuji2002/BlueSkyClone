import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { openMobileMenu, closeMobileMenu } from '../../redux/slices/modalsSlice';

import Avatar from '../common/Avatar';
import { useTranslation } from 'react-i18next';
import { FiMenu, FiX, FiHash } from 'react-icons/fi';
import { RootState } from '../../redux/store';

const TopBar: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const user = useAppSelector((state: RootState) => state.auth.user);
    const isMobileMenuOpen = useAppSelector((state: RootState) => state.modals.mobileMenu);

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
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full"
                    >
                        <FiMenu size={24} className="text-gray-700 dark:text-dark-text" />
                    </button>

                    {/* Logo */}
                    <svg
                        className="w-8 h-8 text-primary-500 cursor-pointer"
                        viewBox="0 0 64 64"
                        fill="currentColor"
                        onClick={() => navigate('/')}
                    >
                        <path d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805zm36.254 0C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.579-6.732-13.873-2.745z" />
                    </svg>

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
