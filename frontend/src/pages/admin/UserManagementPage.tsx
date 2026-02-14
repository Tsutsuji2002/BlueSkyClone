import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiShield, FiShieldOff, FiCheckCircle, FiMail, FiCalendar, FiInfo, FiX, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Avatar from '../../components/common/Avatar';
import { adminService } from '../../services/adminService';
import { AdminUser } from '../../types/admin';
import ConfirmModal from '../../components/common/ConfirmModal';

const UserManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [take] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'ban' | 'unban' | 'role';
        user: AdminUser | null;
        newRole?: string;
    }>({ isOpen: false, type: 'ban', user: null });

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsers(skip, take, searchQuery);
            setUsers(data.items);
            setTotal(data.totalCount);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    }, [skip, take, searchQuery]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleBan = async () => {
        const user = confirmModal.user;
        if (!user) return;
        try {
            if (user.isBanned) {
                await adminService.unbanUser(user.id);
            } else {
                await adminService.banUser(user.id);
            }
            setConfirmModal({ ...confirmModal, isOpen: false });
            fetchUsers();
            if (selectedUser?.id === user.id) {
                setSelectedUser({ ...user, isBanned: !user.isBanned });
            }
        } catch (error) {
            console.error('Failed to update ban status:', error);
        }
    };

    const handleVerify = async (userId: string) => {
        try {
            await adminService.toggleVerify(userId);
            fetchUsers();
            if (selectedUser?.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, isVerified: !prev.isVerified } : null);
            }
        } catch (error) {
            console.error('Failed to toggle verification:', error);
        }
    };

    const handleRoleChange = async () => {
        const { user, newRole } = confirmModal;
        if (!user || !newRole) return;
        setIsUpdatingRole(true);
        try {
            await adminService.changeUserRole(user.id, newRole);
            setConfirmModal({ ...confirmModal, isOpen: false });
            fetchUsers();
            if (selectedUser?.id === user.id) {
                setSelectedUser({ ...user, role: newRole });
            }
        } catch (error) {
            console.error('Failed to change role:', error);
            alert(t('admin.users.role_change_failed', 'Failed to change user role'));
        } finally {
            setIsUpdatingRole(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_role')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.users.table_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.dashboard.loading')}
                                    </td>
                                </tr>
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.users.no_users')}
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={user.avatarUrl}
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
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedUser(user)}
                                                    className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                                    title={t('admin.users.view_details', 'View Details')}
                                                >
                                                    <FiInfo size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({
                                                        isOpen: true,
                                                        type: user.isBanned ? 'unban' : 'ban',
                                                        user
                                                    })}
                                                    className={`p-2 rounded-lg transition-colors ${user.isBanned
                                                        ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                                        : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                                        }`}
                                                    title={user.isBanned ? t('admin.users.unban_title') : t('admin.users.ban_title')}
                                                >
                                                    {user.isBanned ? <FiShield size={18} /> : <FiShieldOff size={18} />}
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

            {/* User Details Drawer */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex justify-end transition-opacity duration-300">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedUser(null)} />
                    <div className="relative w-full max-w-md bg-white dark:bg-dark-surface h-full shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
                            <h2 className="text-xl font-bold dark:text-dark-text">{t('admin.users.user_details', 'User Details')}</h2>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Profile Header */}
                            <div className="flex flex-col items-center text-center">
                                <Avatar src={selectedUser.avatarUrl} alt={selectedUser.handle} size="xl" className="mb-4" />
                                <h3 className="text-2xl font-bold dark:text-dark-text">{selectedUser.displayName || selectedUser.handle}</h3>
                                <p className="text-gray-500 dark:text-dark-text-secondary">@{selectedUser.handle}</p>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => navigate(`/profile/${selectedUser.handle}`)}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-dark-bg dark:text-dark-text rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors font-medium"
                                    >
                                        <FiExternalLink size={18} />
                                        {t('admin.users.view_profile', 'View Profile')}
                                    </button>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl space-y-3">
                                    <div className="flex items-center gap-3 text-gray-600 dark:text-dark-text-secondary">
                                        <FiMail size={18} />
                                        <span>{selectedUser.email}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600 dark:text-dark-text-secondary">
                                        <FiCalendar size={18} />
                                        <span>{t('admin.users.joined_at', 'Joined at')} {formatDate(selectedUser.createdAt)}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-gray-600 dark:text-dark-text-secondary">
                                        <FiShield size={18} />
                                        <span>{t('admin.users.id', 'User ID')}: {selectedUser.id}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl text-center">
                                        <div className="text-2xl font-bold dark:text-dark-text">{selectedUser.postsCount}</div>
                                        <div className="text-sm text-gray-500">{t('admin.users.posts', 'Posts')}</div>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl text-center">
                                        <div className="text-2xl font-bold dark:text-dark-text">{selectedUser.followersCount}</div>
                                        <div className="text-sm text-gray-500">{t('admin.users.followers', 'Followers')}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Role Management */}
                            <div className="space-y-4">
                                <h4 className="font-semibold dark:text-dark-text">{t('admin.users.role_management', 'Role Management')}</h4>
                                <div className="flex items-center gap-4">
                                    <select
                                        value={selectedUser.role}
                                        onChange={(e) => setConfirmModal({
                                            isOpen: true,
                                            type: 'role',
                                            user: selectedUser,
                                            newRole: e.target.value
                                        })}
                                        disabled={isUpdatingRole}
                                        className="flex-1 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border p-2 rounded-lg font-medium focus:ring-2 focus:ring-primary-500 outline-none dark:text-dark-text disabled:opacity-50"
                                    >
                                        <option value="user">{t('admin.users.role_user', 'Standard User')}</option>
                                        <option value="admin">{t('admin.users.role_admin', 'Administrator')}</option>
                                    </select>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                                <h4 className="font-semibold dark:text-dark-text">{t('admin.users.danger_zone', 'Danger Zone')}</h4>
                                <button
                                    onClick={() => setConfirmModal({
                                        isOpen: true,
                                        type: selectedUser.isBanned ? 'unban' : 'ban',
                                        user: selectedUser
                                    })}
                                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg font-bold transition-colors ${selectedUser.isBanned
                                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-400'
                                        }`}
                                >
                                    {selectedUser.isBanned ? <FiShield size={20} /> : <FiShieldOff size={20} />}
                                    {selectedUser.isBanned ? t('admin.users.unban_user', 'Unban User') : t('admin.users.ban_user', 'Ban User')}
                                </button>
                                <button
                                    onClick={() => handleVerify(selectedUser.id)}
                                    className={`w-full flex items-center justify-center gap-2 p-3 rounded-lg font-bold transition-colors ${selectedUser.isVerified
                                        ? 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/40 dark:text-primary-400'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-dark-bg dark:text-dark-text-secondary'
                                        }`}
                                >
                                    <FiCheckCircle size={20} />
                                    {selectedUser.isVerified ? t('admin.users.unverify_user', 'Unverify User') : t('admin.users.verify_user', 'Verify User')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.type === 'role' ? handleRoleChange : handleBan}
                title={confirmModal.type === 'role'
                    ? t('admin.users.role_confirm_title', 'Change User Role')
                    : (confirmModal.type === 'ban' ? t('admin.users.ban_confirm_title', 'Ban User') : t('admin.users.unban_confirm_title', 'Unban User'))
                }
                message={confirmModal.type === 'role'
                    ? t('admin.users.role_confirm_message', 'Are you sure you want to change this user\'s role?')
                    : (confirmModal.type === 'ban'
                        ? t('admin.users.ban_confirm_message', 'Are you sure you want to ban this user? They will no longer be able to log in or access the platform.')
                        : t('admin.users.unban_confirm_message', 'Are you sure you want to unban this user?'))
                }
                confirmLabel={t('common.confirm')}
                variant={confirmModal.type === 'ban' ? 'danger' : 'primary'}
            />
        </div>
    );
};

export default UserManagementPage;
