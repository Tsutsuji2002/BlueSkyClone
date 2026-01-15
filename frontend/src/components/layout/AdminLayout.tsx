import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { FiUsers, FiCpu, FiMessageSquare, FiActivity, FiArrowLeft, FiTag } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { checkIsAdmin } from '../../utils/authUtils'; // We'll create this

const AdminLayout: React.FC = () => {
    const { user, isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const { mode } = useAppSelector((state: RootState) => state.theme);
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Redirect if not authenticated or not admin
    // Note: We'll implement a proper check logic, but for now rely on the user object
    if (!isAuthenticated || !user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    const menuItems = [
        { path: '/admin/dashboard', icon: <FiActivity size={24} />, label: t('admin.dashboard.title') },
        { path: '/admin/users', icon: <FiUsers size={24} />, label: t('admin.users.title') },
        { path: '/admin/posts', icon: <FiMessageSquare size={24} />, label: t('admin.posts.title') },
        { path: '/admin/feeds', icon: <FiCpu size={24} />, label: t('admin.feeds.title') },
        { path: '/admin/interests', icon: <FiTag size={24} />, label: t('admin.interests.title') },
    ];

    return (
        <div className={`flex min-h-screen ${mode === 'dark' ? 'dark bg-dark-bg text-dark-text' : 'bg-gray-50 text-gray-900'}`}>
            {/* Admin Sidebar - Simplified version of Main Sidebar */}
            <div className="hidden lg:flex flex-col w-64 border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg sticky top-0 h-screen p-4">
                <div className="flex items-center gap-2 mb-8 px-2 cursor-pointer" onClick={() => navigate('/home')}>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        A
                    </div>
                    <span className="font-bold text-xl tracking-tight">Admin<span className="text-blue-500">Panel</span></span>
                </div>

                <nav className="flex-1 space-y-2">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-full text-lg font-medium transition-colors ${location.pathname === item.path
                                ? 'font-bold bg-gray-100 dark:bg-dark-surface'
                                : 'hover:bg-gray-50 dark:hover:bg-dark-surface/50 text-gray-600 dark:text-dark-text-secondary'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="pt-4 border-t border-gray-100 dark:border-dark-border">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-full text-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-surface/50 text-gray-600 dark:text-dark-text-secondary transition-colors"
                    >
                        <FiArrowLeft size={24} />
                        Back to App
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 max-w-7xl mx-auto w-full">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
