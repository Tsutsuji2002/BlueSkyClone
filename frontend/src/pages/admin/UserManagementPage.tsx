import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiShield, FiShieldOff, FiCheckCircle, FiXCircle, FiUser } from 'react-icons/fi';
import { API_BASE_URL } from '../../constants';
import Avatar from '../../components/common/Avatar';

interface AdminUser {
    id: string;
    handle: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
    followersCount: number;
    postsCount: number;
    isBanned: boolean;
    isVerified: boolean;
    createdAt: string;
    role: string;
}

interface PaginatedResult {
    items: AdminUser[];
    total: number;
    skip: number;
    take: number;
}

const UserManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [take] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                skip: skip.toString(),
                take: take.toString(),
                ...(searchQuery && { search: searchQuery })
            });

            const response = await fetch(`${API_BASE_URL}/admin/users?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data: PaginatedResult = await response.json();
                setUsers(data.items);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [skip, searchQuery]);

    const handleBan = async (userId: string, isBanned: boolean) => {
        try {
            const token = localStorage.getItem('token');
            const endpoint = isBanned ? 'unban' : 'ban';
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/${endpoint}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Failed to update ban status:', error);
        }
    };

    const handleVerify = async (userId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/verify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchUsers();
            }
        } catch (error) {
            console.error('Failed to toggle verification:', error);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">{t('admin.users.title')}</h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">{t('admin.users.desc')}</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.users.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSkip(0);
                        }}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_user')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_email')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_stats')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_role')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.dashboard.loading')}
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.users.no_users')}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={user.avatarUrl || (user as any).avatar}
                                                    alt={user.handle}
                                                    size="md"
                                                />
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-dark-text flex items-center gap-2">
                                                        {user.displayName || user.handle}
                                                        {user.isVerified && <FiCheckCircle className="text-primary-500" size={16} />}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-dark-text-secondary">@{user.handle}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {user.email}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            <div>{t('admin.users.posts_count', { count: user.postsCount })}</div>
                                            <div>{t('admin.users.followers_count', { count: user.followersCount })}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.isBanned ? (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                    {t('admin.users.status_banned')}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    {t('admin.users.status_active')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleBan(user.id, user.isBanned)}
                                                    className={`p-2 rounded-lg transition-colors ${user.isBanned
                                                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                        : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        }`}
                                                    title={user.isBanned ? t('admin.users.unban_title') : t('admin.users.ban_title')}
                                                >
                                                    {user.isBanned ? <FiShield size={18} /> : <FiShieldOff size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleVerify(user.id)}
                                                    className={`p-2 rounded-lg transition-colors ${user.isVerified
                                                        ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                                                        : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-bg'
                                                        }`}
                                                    title={user.isVerified ? t('admin.users.unverify_title') : t('admin.users.verify_title')}
                                                >
                                                    <FiCheckCircle size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
                        {t('admin.users.showing_range', { start: skip + 1, end: Math.min(skip + take, total), total: total })}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setSkip(Math.max(0, skip - take))}
                            disabled={skip === 0}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('common.back')}
                        </button>
                        <button
                            onClick={() => setSkip(skip + take)}
                            disabled={skip + take >= total}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-dark-text bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {t('auth.signup.next')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserManagementPage;
