import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiTrash2, FiExternalLink, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { AdminList } from '../../types/admin';
import ConfirmModal from '../../components/common/ConfirmModal';

import UserListModal from '../../components/admin/UserListModal';
import { formatDistanceToNow } from 'date-fns';

const ListManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [lists, setLists] = useState<AdminList[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [take] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal State
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    const handleViewMembers = (listId: string) => {
        setSelectedListId(listId);
        setIsUserModalOpen(true);
    };

    const fetchLists = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminService.getLists(skip, take, searchQuery);
            setLists(data.items);
            setTotal(data.totalCount);
        } catch (error) {
            console.error('Failed to fetch lists:', error);
        } finally {
            setLoading(false);
        }
    }, [skip, take, searchQuery]);

    useEffect(() => {
        fetchLists();
    }, [fetchLists]);

    const handleDelete = async () => {
        if (!confirmDeleteId) return;
        try {
            await adminService.deleteList(confirmDeleteId);
            setConfirmDeleteId(null);
            fetchLists();
        } catch (error) {
            console.error('Failed to delete list:', error);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('admin.lists.title')}
                </h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                    {t('admin.lists.desc')}
                </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.lists.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSkip(0);
                        }}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Lists Table */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.lists.name_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.lists.owner_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.lists.members_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.lists.created_at_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.lists.actions_header')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.dashboard.loading')}
                                    </td>
                                </tr>
                            ) : lists.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.lists.no_results', 'No lists found')}
                                    </td>
                                </tr>
                            ) : (
                                lists.map((list) => (
                                    <tr key={list.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                                    {list.name.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-dark-text">
                                                        {list.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-dark-text-secondary truncate max-w-xs">
                                                        {list.description || t('common.no_description')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/profile/${list.ownerHandle}`} className="flex items-center gap-2 hover:underline">
                                                <span className="text-sm font-medium text-gray-900 dark:text-dark-text">
                                                    @{list.ownerHandle}
                                                </span>
                                                <FiExternalLink size={14} className="text-gray-400" />
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {list.membersCount}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {formatDistanceToNow(new Date(list.createdAt), { addSuffix: true })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleViewMembers(list.id)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title={t('admin.lists.view_members', 'View Members')}
                                                >
                                                    <FiUsers size={18} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDeleteId(list.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title={t('common.delete')}
                                                >
                                                    <FiTrash2 size={18} />
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

            <UserListModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                title={t('admin.lists.members_title', 'List Members')}
                fetchData={(skip, take, search) => adminService.getListMembers(selectedListId!, skip, take, search)}
            />
            <ConfirmModal
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleDelete}
                title={t('admin.lists.delete_confirm_title', 'Delete List')}
                message={t('admin.lists.delete_confirm_message', 'Are you sure you want to delete this list? This action cannot be undone.')}
                confirmLabel={t('common.delete')}
                variant="danger"
            />
        </div>
    );
};

export default ListManagementPage;
