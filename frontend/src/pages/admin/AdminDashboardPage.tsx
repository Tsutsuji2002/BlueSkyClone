import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
    FiUsers,
    FiActivity,
    FiCpu,
    FiTrendingUp,
    FiMessageSquare,
    FiList,
    FiMessageCircle,
    FiBell,
    FiShield,
    FiLifeBuoy,
    FiRefreshCw,
    FiArrowRight
} from 'react-icons/fi';
import { RootState } from '../../redux/store';
import { adminService } from '../../services/adminService';
import { AdminStats } from '../../types/admin';

const AdminDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAppSelector((state: RootState) => state.auth);
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalPosts: 0,
        totalFeeds: 0,
        activeUsersToday: 0,
        newPostsToday: 0,
        bannedUsers: 0,
        totalLists: 0,
        totalConversations: 0,
        totalNotifications: 0
    });
    const [loading, setLoading] = useState(true);
    const [isReindexing, setIsReindexing] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await adminService.getStats();
                setStats(data);
            } catch (error) {
                console.error('Failed to fetch admin stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const handleReindex = async () => {
        if (!window.confirm(t('admin.dashboard.reindex_confirm', 'Are you sure you want to reindex all data? This may take a while and cause high load.'))) {
            return;
        }
        setIsReindexing(true);
        try {
            await adminService.reindexSystem();
            alert(t('admin.dashboard.reindex_success', 'Reindexing started successfully'));
        } catch (error) {
            console.error(error);
            alert(t('admin.dashboard.reindex_error', 'Failed to start reindexing'));
        } finally {
            setIsReindexing(false);
        }
    };

    const statCards = [
        {
            title: t('admin.stats.total_users', 'Total Users'),
            value: stats.totalUsers,
            icon: FiUsers,
            gradient: 'from-blue-600 to-cyan-500',
            bgGlow: 'bg-blue-500/10',
            change: '+12%',
            path: '/admin/users'
        },
        {
            title: t('admin.stats.active_today', 'Active Today'),
            value: stats.activeUsersToday,
            icon: FiActivity,
            gradient: 'from-emerald-500 to-teal-500',
            bgGlow: 'bg-emerald-500/10',
            change: '+23%',
            path: '/admin/access-logs'
        },
        {
            title: t('admin.stats.total_posts', 'Total Posts'),
            value: stats.totalPosts,
            icon: FiMessageSquare,
            gradient: 'from-indigo-600 to-purple-600',
            bgGlow: 'bg-indigo-500/10',
            change: '+8%'
        },
        {
            title: t('admin.stats.new_posts_today', 'New Posts Today'),
            value: stats.newPostsToday,
            icon: FiTrendingUp,
            gradient: 'from-amber-500 to-orange-500',
            bgGlow: 'bg-amber-500/10',
            change: '+15%'
        },
        {
            title: t('admin.stats.total_feeds', 'Total Feeds'),
            value: stats.totalFeeds,
            icon: FiCpu,
            gradient: 'from-sky-500 to-blue-600',
            bgGlow: 'bg-sky-500/10',
            change: '+5%'
        },
        {
            title: t('admin.stats.total_lists', 'Total Lists'),
            value: stats.totalLists,
            icon: FiList,
            gradient: 'from-pink-500 to-rose-500',
            bgGlow: 'bg-pink-500/10',
            change: '+10%'
        },
        {
            title: t('admin.stats.total_conversations', 'Direct Messages'),
            value: stats.totalConversations,
            icon: FiMessageCircle,
            gradient: 'from-teal-500 to-emerald-600',
            bgGlow: 'bg-teal-500/10',
            change: '+7%'
        },
        {
            title: t('admin.stats.total_notifications', 'Broadcasts Sent'),
            value: stats.totalNotifications,
            icon: FiBell,
            gradient: 'from-violet-500 to-purple-600',
            bgGlow: 'bg-violet-500/10',
            change: '+30%',
            path: '/admin/notifications'
        },
        {
            title: t('admin.stats.banned_users', 'Suspended Accounts'),
            value: stats.bannedUsers,
            icon: FiShield,
            gradient: 'from-rose-500 to-red-600',
            bgGlow: 'bg-rose-500/10',
            change: '-2%',
            path: '/admin/moderation'
        }
    ];

    const quickActions = [
        {
            title: 'User Accounts',
            description: 'Manage users, roles and security restrictions',
            icon: FiUsers,
            path: '/admin/users',
            color: 'text-blue-500'
        },
        {
            title: 'Access Logs',
            description: 'Audit real-time logins and visitor sessions',
            icon: FiActivity,
            path: '/admin/access-logs',
            color: 'text-emerald-500'
        },
        {
            title: 'Content Moderation',
            description: 'Inspect reports, sanctions and safety flags',
            icon: FiShield,
            path: '/admin/moderation',
            color: 'text-rose-500'
        },
        {
            title: 'Support Helpdesk',
            description: 'Respond to community member assistance tickets',
            icon: FiLifeBuoy,
            path: '/admin/support',
            color: 'text-amber-500'
        }
    ];

    if (loading) {
        return (
            <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                        {t('admin.dashboard.loading', 'Loading platform statistics...')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Hero Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 p-8 text-white shadow-xl shadow-blue-500/15">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute right-20 -top-10 w-48 h-48 bg-sky-400/20 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-white tracking-wide border border-white/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Live System Analytics
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            {t('admin.dashboard.welcome', { name: user?.displayName || user?.handle })}
                        </h1>
                        <p className="text-white/80 text-sm max-w-xl font-normal leading-relaxed">
                            Welcome to the BlueSky management dashboard. Monitor users, real-time access logs, platform traffic, and maintain system health.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleReindex}
                            disabled={isReindexing}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-600 hover:bg-white/90 active:scale-95 font-bold text-xs shadow-lg transition-all"
                        >
                            <FiRefreshCw size={14} className={isReindexing ? 'animate-spin' : ''} />
                            <span>{isReindexing ? 'Reindexing...' : t('admin.dashboard.reindex_system', 'Reindex Elasticsearch')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Navigation Shortcuts */}
            <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Quick Navigation
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, idx) => (
                        <div
                            key={idx}
                            onClick={() => navigate(action.path)}
                            className="group cursor-pointer p-4 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] hover:border-blue-500/40 dark:hover:border-blue-500/40 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between"
                        >
                            <div className="flex items-center gap-3.5 min-w-0">
                                <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.04] ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                                    <action.icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {action.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {action.description}
                                    </p>
                                </div>
                            </div>
                            <FiArrowRight size={16} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Platform Performance Metrics
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {statCards.map((stat, index) => {
                        const CardWrapper = stat.path ? 'div' : 'div';
                        return (
                            <CardWrapper
                                key={index}
                                onClick={() => stat.path && navigate(stat.path)}
                                className={`
                                    p-6 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200/80 dark:border-white/[0.06] shadow-xs hover:shadow-lg transition-all duration-200 relative overflow-hidden group
                                    ${stat.path ? 'cursor-pointer hover:border-blue-500/30' : ''}
                                `}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-2xl bg-gradient-to-tr ${stat.gradient} text-white shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform duration-200`}>
                                        <stat.icon size={22} className="stroke-[2.2]" />
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        {stat.change}
                                    </span>
                                </div>

                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    {stat.title}
                                </h3>

                                <div className="flex items-baseline justify-between">
                                    <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                        {stat.value.toLocaleString()}
                                    </p>
                                    {stat.path && (
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                            View <FiArrowRight size={12} />
                                        </span>
                                    )}
                                </div>
                            </CardWrapper>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
