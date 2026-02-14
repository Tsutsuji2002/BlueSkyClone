import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiTrash2, FiMessageCircle } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import { AdminConversation } from '../../types/admin';
import { formatDistanceToNow } from 'date-fns';
import ConfirmModal from '../../components/common/ConfirmModal';

const ConversationManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [conversations, setConversations] = useState<AdminConversation[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [take] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    // Confirmation state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        id: string;
    }>({ isOpen: false, id: '' });

    const fetchConversations = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adminService.getConversations(skip, take, searchQuery);
            setConversations(data.items || []);
            setTotal(data.totalCount || 0);
        } catch (error) {
            console.error('Failed to fetch conversations:', error);
        } finally {
            setLoading(false);
        }
    }, [skip, take, searchQuery]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const handleDelete = async () => {
        if (!confirmModal.id) return;
        try {
            await adminService.deleteConversation(confirmModal.id);
            fetchConversations();
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('admin.conversations.title')}
                </h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                    {t('admin.conversations.desc')}
                </p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.conversations.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSkip(0);
                        }}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Conversations Table */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.conversations.participants_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.conversations.last_message_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.conversations.updated_at_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.posts.table_created', 'Created At')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.conversations.actions_header')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.dashboard.loading')}
                                    </td>
                                </tr>
                            ) : conversations.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.conversations.no_results', 'No conversations found')}
                                    </td>
                                </tr>
                            ) : (
                                conversations.map((conv) => (
                                    <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                                                    <FiMessageCircle size={20} />
                                                </div>
                                                <div className="flex flex-wrap gap-1 max-w-xs">
                                                    {Array.isArray(conv.participants) && conv.participants.length > 0 ? (
                                                        conv.participants.map(p => (
                                                            <span key={p} className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">
                                                                @{p}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400 italic text-sm">{t('admin.conversations.no_participants', 'No participants')}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-dark-text-secondary text-xs font-bold border border-gray-200 dark:border-dark-border">
                                                {conv.messageCount} {t('nav.messages').toLowerCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {conv.lastActivity ? formatDistanceToNow(new Date(conv.lastActivity), { addSuffix: true }) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {new Date(conv.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => setConfirmModal({ isOpen: true, id: conv.id })}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title={t('common.delete')}
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
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
                        {t('admin.conversations.showing_range', { start: skip + 1, end: Math.min(skip + take, total), total: total })}
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
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={handleDelete}
                title={t('admin.conversations.delete_confirm_title', 'Delete conversation?')}
                message={t('admin.conversations.delete_confirm_message', 'Are you sure you want to delete this conversation? This action cannot be undone.')}
                confirmLabel={t('common.delete')}
                variant="danger"
            />
        </div>
    );
};

export default ConversationManagementPage;
