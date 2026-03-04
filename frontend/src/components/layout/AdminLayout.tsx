import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { FiUsers, FiCpu, FiMessageSquare, FiActivity, FiArrowLeft, FiTag, FiList, FiMessageCircle, FiShield, FiBell, FiMenu, FiX, FiHash, FiFileText } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const AdminLayout: React.FC = () => {
    const { user, isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const { mode } = useAppSelector((state: RootState) => state.theme);
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    // Mobile menu state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    // Close mobile menu when route changes
    React.useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const menuGroups = [
        {
            title: t('admin.dashboard.title'),
            items: [
                { path: '/admin/dashboard', icon: <FiActivity size={20} />, label: t('admin.dashboard.title') },
            ]
        },
        {
            title: t('admin.users.title'),
            items: [
                { path: '/admin/users', icon: <FiUsers size={20} />, label: t('admin.users.title') },
                { path: '/admin/lists', icon: <FiList size={20} />, label: t('admin.lists.title') },
            ]
        },
        {
            title: t('admin.content.title'),
            items: [
                { path: '/admin/posts', icon: <FiMessageSquare size={20} />, label: t('admin.posts.title') },
                { path: '/admin/feeds', icon: <FiCpu size={20} />, label: t('admin.feeds.title') },
                { path: '/admin/interests', icon: <FiTag size={20} />, label: t('admin.interests.title') },
                { path: '/admin/hashtags', icon: <FiHash size={20} />, label: t('admin.hashtags.title', 'Hashtags') },
                { path: '/admin/conversations', icon: <FiMessageCircle size={20} />, label: t('admin.conversations.title') },
            ]
        },
        {
            title: t('admin.safety.title'),
            items: [
                { path: '/admin/moderation', icon: <FiShield size={20} />, label: t('admin.moderation.title') },
                { path: '/admin/notifications', icon: <FiBell size={20} />, label: t('admin.notifications.title') },
                { path: '/admin/support', icon: <FiMessageSquare size={20} />, label: t('admin.support.title') },
                { path: '/admin/pages', icon: <FiFileText size={20} />, label: 'Legal Pages' },
            ]
        }
    ];

    // Redirect if not authenticated or not admin
    // Note: We'll implement a proper check logic, but for now rely on the user object
    if (!isAuthenticated || !user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className={`flex min-h-screen ${mode === 'dark' ? 'dark bg-dark-bg text-dark-text' : 'bg-gray-50 text-gray-900'}`}>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border z-30 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2" onClick={() => navigate('/admin')}>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        A
                    </div>
                    <span className="font-bold text-xl tracking-tight">Admin<span className="text-blue-500">{t('admin.panel')}</span></span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 -mr-2 text-gray-600 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full"
                >
                    {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                </button>
            </div>

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Admin Sidebar - Desktop & Mobile */}
            <div className={`
                fixed lg:sticky top-0 h-screen w-64 bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border z-50 transition-transform duration-300 ease-in-out flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="hidden lg:flex items-center gap-2 p-6 cursor-pointer" onClick={() => navigate('/home')}>
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        A
                    </div>
                    <span className="font-bold text-xl tracking-tight">Admin<span className="text-blue-500">{t('admin.panel')}</span></span>
                </div>

                <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100 dark:border-dark-border">
                    <span className="font-bold text-lg">Menu</span>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-6 py-6 overflow-y-auto">
                    {menuGroups.map((group, index) => (
                        <div key={index}>
                            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                {group.title}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <button
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === item.path
                                            ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-surface'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-dark-border">
                    <button
                        onClick={() => navigate('/')}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-full text-lg font-medium hover:bg-gray-50 dark:hover:bg-dark-surface/50 text-gray-600 dark:text-dark-text-secondary transition-colors"
                    >
                        <FiArrowLeft size={24} />
                        {t('admin.back_to_app')}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 max-w-7xl mx-auto w-full pt-16 lg:pt-0">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
