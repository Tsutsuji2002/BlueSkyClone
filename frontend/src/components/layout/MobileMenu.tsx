import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../../constants';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { closeMobileMenu } from '../../redux/slices/modalsSlice';
import Avatar from '../common/Avatar';
import { useTranslation } from 'react-i18next';
import { FiX } from 'react-icons/fi';
import { RootState } from '../../redux/store';

const MobileMenu: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const user = useAppSelector((state: RootState) => state.auth.user);
    const isOpen = useAppSelector((state: RootState) => state.modals.mobileMenu);

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
                    {user && (
                        <div
                            className="mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-surface p-2 rounded-xl transition-colors"
                            onClick={() => {
                                navigate(`/profile/${user.handle}`);
                                dispatch(closeMobileMenu());
                            }}
                        >
                            <Avatar
                                src={user.avatar}
                                alt={user.displayName}
                                size="lg"
                                className="mb-3"
                            />
                            <p className="font-bold text-gray-900 dark:text-dark-text">{user.displayName}</p>
                            <p className="text-sm text-gray-500 dark:text-dark-text-secondary">@{user.handle}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-gray-700 dark:text-dark-text">
                                    <strong>{user.followingCount}</strong> đang theo dõi
                                </span>
                                <span className="text-gray-700 dark:text-dark-text">
                                    <strong>{user.followersCount}</strong> người theo dõi
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation Items */}
                <nav className="p-4">
                    {NAV_ITEMS.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    navigate(item.id === 'profile' ? `/profile/${user?.handle}` : item.path);
                                    dispatch(closeMobileMenu());
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-lg mb-2 transition-colors ${isActive
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-500 font-semibold'
                                    : 'hover:bg-gray-100 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text'
                                    }`}
                            >
                                <span className="text-xl">{t(`nav.${item.id}`)}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer Links */}
                <div className="p-4 border-t border-gray-200 dark:border-dark-border">
                    <button className="text-primary-500 hover:underline text-sm block mb-2">
                        Điều khoản dịch vụ
                    </button>
                    <button className="text-primary-500 hover:underline text-sm block">
                        Chính sách bảo mật
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileMenu;
