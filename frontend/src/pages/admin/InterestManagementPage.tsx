import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiPlus, FiSearch, FiTag, FiX, FiUsers, FiCheckSquare, FiSquare } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import UserListModal from '../../components/admin/UserListModal';
import { API_BASE_URL } from '../../constants';
import { AdminInterest } from '../../types/admin';
import ConfirmModal from '../../components/common/ConfirmModal';

const InterestManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [interests, setInterests] = useState<AdminInterest[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [interestName, setInterestName] = useState('');

    // New state
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [selectedInterestName, setSelectedInterestName] = useState<string | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<Set<string>>(new Set());
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'single' | 'bulk';
        name?: string;
    }>({ isOpen: false, type: 'single' });

    const fetchInterests = useCallback(async () => {
        setLoading(true);
        try {
            const result = await adminService.getInterests(0, 1000, searchQuery);
            setInterests(result.items);
        } catch (error) {
            console.error('Failed to fetch interests:', error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchInterests();
    }, [fetchInterests]);

    const handleOpenAdd = () => {
        setInterestName('');
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setInterestName('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!interestName.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/interests`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: interestName.trim() })
            });

            if (response.ok) {
                handleCloseForm();
                fetchInterests();
            } else {
                const error = await response.json();
                alert(error.message || 'Operation failed');
            }
        } catch (error) {
            console.error('Failed to save interest:', error);
            alert('An error occurred while saving the interest.');
        }
    };

    const handleDeleteInterest = async () => {
        if (!confirmModal.name) return;
        const interest = confirmModal.name;

        try {
            await adminService.deleteInterest(interest);
            fetchInterests();
            setSelectedInterests(prev => {
                const next = new Set(prev);
                next.delete(interest);
                return next;
            });
        } catch (error) {
            console.error('Failed to delete interest:', error);
            alert('Failed to delete interest');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedInterests.size === 0) return;

        try {
            await Promise.all(Array.from(selectedInterests).map(name => adminService.deleteInterest(name)));
            fetchInterests();
            setSelectedInterests(new Set());
        } catch (error) {
            console.error('Failed to delete interests:', error);
            alert('Failed to delete some interests');
        }
    };

    const toggleSelection = (name: string) => {
        setSelectedInterests(prev => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    };

    const handleViewUsers = (name: string) => {
        setSelectedInterestName(name);
        setIsUserModalOpen(true);
    };

    const filteredInterests = interests.filter(interest => {
        if (!searchQuery) return true;
        return interest.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="p-6">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">{t('admin.interests.title')}</h1>
                    <p className="text-gray-600 dark:text-dark-text-secondary">{t('admin.interests.desc')}</p>
                </div>
                <div className="flex gap-2">
                    {selectedInterests.size > 0 && (
                        <button
                            onClick={() => setConfirmModal({ isOpen: true, type: 'bulk' })}
                            className="px-4 py-3 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
                        >
                            <FiTrash2 size={20} />
                            {t('common.delete')} ({selectedInterests.size})
                        </button>
                    )}
                    <button
                        onClick={handleOpenAdd}
                        className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <FiPlus size={20} />
                        {t('admin.interests.add_btn')}
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.interests.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold dark:text-dark-text">{t('admin.interests.add_title', 'Add New Interest')}</h2>
                            <button onClick={handleCloseForm} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg">
                                <FiX size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                                    {t('admin.interests.name_label', 'Interest Name')}
                                </label>
                                <input
                                    type="text"
                                    value={interestName}
                                    onChange={(e) => setInterestName(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    placeholder="e.g. Photography"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                                >
                                    {t('common.add', 'Add')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Interests Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500 dark:text-dark-text-secondary">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-500 border-t-transparent mb-4"></div>
                        <p>{t('admin.dashboard.loading')}</p>
                    </div>
                ) : filteredInterests.length === 0 ? (
                    <div className="col-span-full border-2 border-dashed border-gray-200 dark:border-dark-border rounded-2xl py-12 text-center text-gray-500 dark:text-dark-text-secondary">
                        <FiTag size={48} className="mx-auto mb-4 opacity-20" />
                        <p className="text-lg">
                            {searchQuery ? t('admin.interests.no_results') : t('admin.interests.no_interests')}
                        </p>
                    </div>
                ) : (
                    filteredInterests.map((interest) => (
                        <div
                            key={interest.name}
                            className={`bg-white dark:bg-dark-surface rounded-xl border p-4 hover:shadow-md transition-all group ${selectedInterests.has(interest.name)
                                ? 'border-primary-500 ring-1 ring-primary-500'
                                : 'border-gray-200 dark:border-dark-border'
                                }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <button
                                        onClick={() => toggleSelection(interest.name)}
                                        className="text-gray-400 hover:text-primary-500"
                                    >
                                        {selectedInterests.has(interest.name) ? (
                                            <FiCheckSquare size={20} className="text-primary-500" />
                                        ) : (
                                            <FiSquare size={20} />
                                        )}
                                    </button>
                                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FiTag className="text-white" size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-dark-text truncate">
                                            {interest.name}
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                            {t('admin.interests.users_count', { count: interest.usersCount || 0 })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleViewUsers(interest.name)}
                                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title={t('admin.interests.view_users', 'View Users')}
                                    >
                                        <FiUsers size={18} />
                                    </button>
                                    <button
                                        onClick={() => setConfirmModal({ isOpen: true, type: 'single', name: interest.name })}
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

            <UserListModal
                isOpen={isUserModalOpen}
                onClose={() => setIsUserModalOpen(false)}
                title={t('admin.interests.users_title', 'Interest Users')}
                fetchData={(skip, take, search) => adminService.getInterestUsers(selectedInterestName!, skip, take, search)}
            />

            {/* Summary Stats */}
            {!loading && interests.length > 0 && (
                <div className="mt-6 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20 rounded-xl p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">{t('admin.interests.total_interests')}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{interests.length}</p>
                        </div>
                        {searchQuery && (
                            <div>
                                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">{t('admin.interests.filtered_results')}</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text">{filteredInterests.length}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.type === 'bulk' ? handleBulkDelete : handleDeleteInterest}
                title={confirmModal.type === 'bulk' ? t('admin.interests.bulk_delete_title', 'Bulk Delete Interests') : t('admin.interests.delete_title', 'Delete Interest')}
                message={confirmModal.type === 'bulk'
                    ? t('admin.interests.bulk_delete_confirm', `Are you sure you want to delete ${selectedInterests.size} interests?`)
                    : t('admin.interests.delete_confirm', 'Are you sure you want to delete this interest?')
                }
                confirmLabel={t('common.delete')}
                variant="danger"
            />
        </div>
    );
};

export default InterestManagementPage;
