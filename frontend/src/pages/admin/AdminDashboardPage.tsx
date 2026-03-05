import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { FiUsers, FiActivity, FiCpu, FiTrendingUp, FiMessageSquare, FiList, FiMessageCircle, FiBell } from 'react-icons/fi';
import { RootState } from '../../redux/store';
import { adminService } from '../../services/adminService';
import { AdminStats } from '../../types/admin';

const AdminDashboardPage: React.FC = () => {
    const { t } = useTranslation();
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

    const statCards = [
        {
            title: t('admin.stats.total_users'),
            value: stats.totalUsers,
            icon: FiUsers,
            color: 'bg-blue-500',
            change: '+12%'
        },
        {
            title: t('admin.stats.total_posts'),
            value: stats.totalPosts,
            icon: FiMessageSquare,
            color: 'bg-green-500',
            change: '+8%'
        },
        {
            title: t('admin.stats.active_today'),
            value: stats.activeUsersToday,
            icon: FiActivity,
            color: 'bg-purple-500',
            change: '+23%'
        },
        {
            title: t('admin.stats.new_posts_today'),
            value: stats.newPostsToday,
            icon: FiTrendingUp,
            color: 'bg-orange-500',
            change: '+15%'
        },
        {
            title: t('admin.stats.total_feeds'),
            value: stats.totalFeeds,
            icon: FiCpu,
            color: 'bg-indigo-500',
            change: '+5%'
        },
        {
            title: t('admin.stats.total_lists'),
            value: stats.totalLists,
            icon: FiList,
            color: 'bg-pink-500',
            change: '+10%'
        },
        {
            title: t('admin.stats.total_conversations'),
            value: stats.totalConversations,
            icon: FiMessageCircle,
            color: 'bg-teal-500',
            change: '+7%'
        },
        {
            title: t('admin.stats.total_notifications'),
            value: stats.totalNotifications,
            icon: FiBell,
            color: 'bg-yellow-500',
            change: '+30%'
        },
        {
            title: t('admin.stats.banned_users'),
            value: stats.bannedUsers,
            icon: FiUsers,
            color: 'bg-red-500',
            change: '-2%'
        }
    ];

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 dark:text-dark-text-secondary">{t('admin.dashboard.loading')}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">{t('admin.dashboard.title')}</h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                    {t('admin.dashboard.welcome', { name: user?.displayName || user?.handle })}
                </p>
            </div>

            <div className="mb-6 flex justify-end">
                <button
                    onClick={async () => {
                        if (window.confirm(t('admin.dashboard.reindex_confirm'))) {
                            try {
                                await adminService.reindexSystem();
                                alert(t('admin.dashboard.reindex_success'));
                            } catch (error) {
                                console.error(error);
                                alert(t('admin.dashboard.reindex_error'));
                            }
                        }
                    }}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                    {t('admin.dashboard.reindex_system')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.color} p-3 rounded-lg`}>
                                <stat.icon className="text-white" size={24} />
                            </div>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-gray-600 dark:text-dark-text-secondary text-sm font-medium mb-1">
                            {stat.title}
                        </h3>
                        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">
                            {stat.value.toLocaleString()}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminDashboardPage;
