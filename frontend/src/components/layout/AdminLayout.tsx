import React, { useState, useEffect, useMemo } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import Avatar from '../common/Avatar';
import {
    FiGrid,
    FiUsers,
    FiActivity,
    FiList,
    FiShield,
    FiBell,
    FiLifeBuoy,
    FiFileText,
    FiArrowLeft,
    FiExternalLink,
    FiSun,
    FiMoon,
    FiMenu,
    FiX,
    FiChevronRight
} from 'react-icons/fi';

interface MenuItem {
    path: string;
    icon: React.ReactNode;
    label: string;
    badge?: string;
}

interface MenuGroup {
    title: string;
    items: MenuItem[];
}

const AdminLayout: React.FC = () => {
    const { user, isAuthenticated } = useAppSelector((state: RootState) => state.auth);
    const { isDark, toggle: toggleThemeMode } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Navigation Menu Groups without Content Management
    const menuGroups: MenuGroup[] = useMemo(() => [
        {
            title: t('admin.dashboard.group', 'Overview'),
            items: [
                {
                    path: '/admin/dashboard',
                    icon: <FiGrid size={19} />,
                    label: t('admin.dashboard.title', 'Dashboard'),
                },
            ]
        },
        {
            title: t('admin.users.group', 'User & Access'),
            items: [
                {
                    path: '/admin/users',
                    icon: <FiUsers size={19} />,
                    label: t('admin.users.title', 'User Accounts')
                },
                {
                    path: '/admin/access-logs',
                    icon: <FiActivity size={19} />,
                    label: 'Access Logs',
                    badge: 'Live'
                },
            ]
        },
        {
            title: t('admin.safety.group', 'Safety & Operations'),
            items: [
                {
                    path: '/admin/moderation',
                    icon: <FiShield size={19} />,
                    label: t('admin.moderation.title', 'Content Moderation')
                },
                {
                    path: '/admin/notifications',
                    icon: <FiBell size={19} />,
                    label: t('admin.notifications.title', 'Broadcasts')
                },
                {
                    path: '/admin/support',
                    icon: <FiLifeBuoy size={19} />,
                    label: t('admin.support.title', 'Support Requests')
                },
                {
                    path: '/admin/pages',
                    icon: <FiFileText size={19} />,
                    label: 'Legal & Static Pages'
                },
            ]
        }
    ], [t]);

    // Metadata map for breadcrumbs and header
    const pageMeta = useMemo(() => {
        const path = location.pathname;
        const map: Record<string, { title: string; category: string }> = {
            '/admin': { title: 'Dashboard', category: 'Overview' },
            '/admin/dashboard': { title: 'Dashboard', category: 'Overview' },
            '/admin/users': { title: 'User Accounts', category: 'User & Access' },
            '/admin/access-logs': { title: 'Access Logs', category: 'User & Access' },
            '/admin/lists': { title: 'User Lists', category: 'User & Access' },
            '/admin/moderation': { title: 'Content Moderation', category: 'Safety & Operations' },
            '/admin/notifications': { title: 'Broadcast Notifications', category: 'Safety & Operations' },
            '/admin/support': { title: 'Support Requests', category: 'Safety & Operations' },
            '/admin/pages': { title: 'Legal & Static Pages', category: 'Safety & Operations' },
            '/admin/posts': { title: 'Post Management', category: 'Content' },
            '/admin/feeds': { title: 'Feed Management', category: 'Content' },
            '/admin/interests': { title: 'Interest Management', category: 'Content' },
            '/admin/hashtags': { title: 'Hashtag Management', category: 'Content' },
            '/admin/conversations': { title: 'Conversation Management', category: 'Content' },
        };
        return map[path] || { title: 'Admin Console', category: 'Administration' };
    }, [location.pathname]);

    // Redirect if not authenticated or not admin
    if (!isAuthenticated || !user || user.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-200">
            {/* Mobile Top Header */}
            <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] z-40 flex items-center px-4 justify-between">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate('/admin/dashboard')}
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                        <FiShield size={19} className="stroke-[2.5]" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">BlueSky</span>
                        <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-md">Admin</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <button
                        onClick={toggleThemeMode}
                        aria-label="Toggle theme"
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition-all"
                    >
                        {isDark ? <FiSun size={19} className="text-amber-400" /> : <FiMoon size={19} />}
                    </button>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Toggle menu"
                        className="p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] rounded-xl transition-all"
                    >
                        {isMobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
                    </button>
                </div>
            </header>

            {/* Mobile Backdrop Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Navigation */}
            <aside
                className={`
                    fixed lg:sticky top-0 h-screen w-72 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-xl border-r border-slate-200/80 dark:border-white/[0.08] z-50 transition-transform duration-300 ease-out flex flex-col shadow-xl lg:shadow-none
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}
            >
                {/* Brand / Logo Section */}
                <div className="p-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                    <div
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => navigate('/admin/dashboard')}
                    >
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-500/10 transition-transform duration-300 group-hover:scale-105">
                            <FiShield size={20} className="stroke-[2.5]" />
                        </div>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                                    BlueSky
                                </span>
                                <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 rounded-md">
                                    Admin
                                </span>
                            </div>
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 tracking-wide">
                                Control Center
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5"
                    >
                        <FiX size={18} />
                    </button>
                </div>

                {/* Navigation Links Area with Custom Scrollbar */}
                <nav className="flex-1 px-3.5 py-4 space-y-6 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-1">
                            <h3 className="px-3 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 select-none">
                                {group.title}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <button
                                            key={item.path}
                                            onClick={() => navigate(item.path)}
                                            className={`
                                                w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group relative
                                                ${isActive
                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-blue-500'}`}>
                                                    {item.icon}
                                                </span>
                                                <span className="truncate tracking-tight">{item.label}</span>
                                            </div>

                                            {item.badge ? (
                                                <span
                                                    className={`
                                                        px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md
                                                        ${isActive
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/20'
                                                        }
                                                    `}
                                                >
                                                    {item.badge}
                                                </span>
                                            ) : (
                                                <FiChevronRight
                                                    size={15}
                                                    className={`transition-transform duration-200 ${isActive ? 'text-white/70 translate-x-0.5' : 'text-transparent group-hover:text-slate-400 group-hover:translate-x-0.5'}`}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Footer: Current Admin User & Back to App */}
                <div className="p-3.5 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-white/[0.04] border border-slate-200/70 dark:border-white/[0.06] mb-2.5 shadow-2xs">
                        <div className="relative flex-shrink-0">
                            <Avatar src={user.avatarUrl || user.avatar} size="sm" alt={user.displayName || user.handle} />
                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-[#0F172A] rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                                {user.displayName || user.handle}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                @{user.handle}
                            </p>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20">
                            Admin
                        </span>
                    </div>

                    <button
                        onClick={() => navigate('/home')}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/[0.06] hover:text-blue-600 dark:hover:text-blue-400 active:scale-[0.98] transition-all shadow-2xs group"
                    >
                        <FiArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
                        <span>{t('admin.back_to_app', 'Back to BlueSky')}</span>
                    </button>
                </div>
            </aside>

            {/* Main Area: Desktop Top Bar + Page Content */}
            <div className="flex-1 min-w-0 flex flex-col pt-16 lg:pt-0">
                {/* Desktop Top Bar */}
                <header className="hidden lg:flex sticky top-0 h-16 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] z-30 px-6 items-center justify-between">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2.5 text-sm">
                        <span className="font-semibold text-slate-400 dark:text-slate-500">Admin</span>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <span className="px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.05] rounded-md">
                            {pageMeta.category}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">/</span>
                        <h2 className="font-bold text-slate-900 dark:text-white tracking-tight">
                            {pageMeta.title}
                        </h2>
                    </div>

                    {/* Quick Controls */}
                    <div className="flex items-center gap-3">
                        {/* Live Health Status */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 select-none">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>System Operational</span>
                        </div>

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleThemeMode}
                            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-all shadow-2xs"
                        >
                            {isDark ? <FiSun size={17} className="text-amber-400" /> : <FiMoon size={17} />}
                        </button>

                        {/* View Live App */}
                        <button
                            onClick={() => navigate('/home')}
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold transition-all border border-blue-500/20"
                        >
                            <span>Live App</span>
                            <FiExternalLink size={13} />
                        </button>
                    </div>
                </header>

                {/* Outlet for Admin Pages */}
                <main className="flex-1 min-w-0 w-full overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
