import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiSearch, FiHash, FiX, FiCheckSquare, FiSquare, FiTrendingUp } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import { AdminHashtag } from '../../types/admin';
import ConfirmModal from '../../components/common/ConfirmModal';

const HashtagManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [hashtags, setHashtags] = useState<AdminHashtag[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [selectedHashtags, setSelectedHashtags] = useState<Set<number>>(new Set());
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'single' | 'bulk';
        id?: number;
    }>({ isOpen: false, type: 'single' });

    const fetchHashtags = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminService.getHashtags(0, 1000, searchQuery);
            setHashtags(result.items);
        } catch (error) {
            console.error('Failed to fetch hashtags:', error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchHashtags();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchHashtags]);

    const handleDeleteHashtag = async () => {
        if (confirmModal.id === undefined) return;
        const id = confirmModal.id;

        try {
            await adminService.deleteHashtag(id);
            setHashtags(prev => prev.filter(h => h.id !== id));
            setSelectedHashtags(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
            console.error('Failed to delete hashtag:', error);
            alert('Failed to delete hashtag');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedHashtags.size === 0) return;

        try {
            await Promise.all(Array.from(selectedHashtags).map(id => adminService.deleteHashtag(id)));
            fetchHashtags();
            setSelectedHashtags(new Set());
            setConfirmModal({ ...confirmModal, isOpen: false });
        } catch (error) {
            console.error('Failed to delete hashtags:', error);
            alert('Failed to delete some hashtags');
        }
    };

    const toggleSelection = (id: number) => {
        setSelectedHashtags(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">{t('admin.hashtags.title', 'Hashtag Management')}</h1>
                    <p className="text-gray-600 dark:text-dark-text-secondary">{t('admin.hashtags.desc', 'View and manage user-generated hashtags.')}</p>
                </div>
                <div className="flex gap-2">
                    {selectedHashtags.size > 0 && (
                        <button
                            onClick={() => setConfirmModal({ isOpen: true, type: 'bulk' })}
                            className="px-4 py-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                        >
                            <FiTrash2 size={20} />
                            {t('common.delete')} ({selectedHashtags.size})
                        </button>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.hashtags.search_placeholder', 'Search hashtags...')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Hashtags Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-dark-text-secondary">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-4"></div>
                        <p>{t('admin.dashboard.loading')}</p>
                    </div>
                ) : hashtags.length === 0 ? (
                    <div className="col-span-full border-2 border-dashed border-gray-200 dark:border-dark-border rounded-2xl py-12 text-center text-gray-500 dark:text-dark-text-secondary">
                        <FiHash size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg">
                            {searchQuery ? t('admin.hashtags.no_results', 'No hashtags found.') : t('admin.hashtags.no_hashtags', 'No hashtags in the system yet.')}
                        </p>
                    </div>
                ) : (
                    hashtags.map((hashtag) => (
                        <div
                            key={hashtag.id}
                            className={`bg-white dark:bg-dark-surface rounded-xl border p-4 hover:shadow-md transition-all group ${selectedHashtags.has(hashtag.id)
                                ? 'border-primary-500 ring-1 ring-primary-500'
                                : 'border-gray-200 dark:border-dark-border'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                        onClick={() => toggleSelection(hashtag.id)}
                                        className="text-gray-400 hover:text-primary-500"
                                    >
                                        {selectedHashtags.has(hashtag.id) ? (
                                            <FiCheckSquare size={20} className="text-primary-500" />
                                        ) : (
                                            <FiSquare size={20} />
                                        )}
                                    </button>
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white">
                                        <FiHash size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate flex items-center gap-1">
                                            #{hashtag.name}
                                            {hashtag.postsCount > 10 && <FiTrendingUp className="text-green-500" size={14} />}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                            {t('admin.hashtags.posts_count', { count: hashtag.postsCount })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'single', id: hashtag.id })}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title={t('common.delete')}
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.type === 'bulk' ? handleBulkDelete : handleDeleteHashtag}
                title={confirmModal.type === 'bulk' ? t('admin.hashtags.bulk_delete_title', 'Bulk Delete Hashtags') : t('admin.hashtags.delete_title', 'Delete Hashtag')}
                message={confirmModal.type === 'bulk'
                    ? t('admin.hashtags.bulk_delete_confirm', `Are you sure you want to delete ${selectedHashtags.size} hashtags?`)
                    : t('admin.hashtags.delete_confirm', 'Are you sure you want to delete this hashtag?')
                }
                confirmLabel={t('common.delete')}
                variant="danger"
            />
        </div>
    );
};

export default HashtagManagementPage;
