import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { FiHome, FiSearch, FiBell, FiMail, FiUser, FiMessageCircle } from 'react-icons/fi';

// Map icon names to actual icon components
const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactElement> = {
        home: <FiHome size={24} />,
        search: <FiSearch size={24} />,
        bell: <FiBell size={24} />,
        mail: <FiMessageCircle size={24} />,
        user: <FiUser size={24} />,
    };
    return iconMap[iconName] || null;
};

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = useAppSelector((state) => state.auth.user);
    const unreadNotifications = useAppSelector((state) => state.notifications.unreadCount);
    const conversations = useAppSelector((state) => state.messages.conversations);
    const unreadMessages = conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);

    // Define mobile navigation items with their routes
    const mobileNavItems = [
        { id: 'home', icon: 'home', path: '/', label: 'Home' },
        { id: 'search', icon: 'search', path: '/explore', label: 'Search' },
        { id: 'notifications', icon: 'bell', path: '/notifications', label: 'Notifications' },
        { id: 'messages', icon: 'mail', path: '/messages', label: 'Messages' },
        { id: 'profile', icon: 'user', path: `/profile/${user?.handle}`, label: 'Profile' },
    ];

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-bg border-t border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-around h-16">
                {mobileNavItems.map((item) => {
                    const isActive = location.pathname === item.path ||
                        (item.id === 'profile' && location.pathname.startsWith('/profile'));

                    return (
                        <button
                            key={item.id}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                                ? 'text-primary-500'
                                : 'text-gray-600 dark:text-dark-text-secondary'
                                }`}
                        >
                            <div className="relative">
                                {getIcon(item.icon)}
                                {item.id === 'notifications' && unreadNotifications > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary-500 text-white text-[10px] px-1 rounded-full flex items-center justify-center font-bold">
                                        {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                    </span>
                                )}
                                {item.id === 'messages' && unreadMessages > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary-500 text-white text-[10px] px-1 rounded-full flex items-center justify-center font-bold">
                                        {unreadMessages > 9 ? '9+' : unreadMessages}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default BottomNav;
