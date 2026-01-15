import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiPlus, FiEdit2, FiSearch, FiTag, FiX } from 'react-icons/fi';
import { API_BASE_URL } from '../../constants';

interface Interest {
    id: number;
    name: string;
    usersCount?: number;
    createdAt?: string;
}

const InterestManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const [interests, setInterests] = useState<Interest[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingInterest, setEditingInterest] = useState<Interest | null>(null);
    const [interestName, setInterestName] = useState('');

    const fetchInterests = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/interests`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setInterests(data);
            } else {
                console.error('Failed to fetch interests:', response.statusText);
            }
        } catch (error) {
            console.error('Failed to fetch interests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInterests();
    }, []);

    const handleOpenAdd = () => {
        setEditingInterest(null);
        setInterestName('');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (interest: Interest) => {
        setEditingInterest(interest);
        setInterestName(interest.name);
        setIsFormOpen(true);
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingInterest(null);
        setInterestName('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!interestName.trim()) return;

        try {
            const token = localStorage.getItem('token');
            const url = editingInterest
                ? `${API_BASE_URL}/interests/${editingInterest.id}`
                : `${API_BASE_URL}/interests`;

            const method = editingInterest ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
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

    const handleDeleteInterest = async (interestId: number) => {
        if (!window.confirm(t('admin.interests.delete_confirm'))) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/interests/${interestId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchInterests();
            } else {
                alert('Failed to delete interest');
            }
        } catch (error) {
            console.error('Failed to delete interest:', error);
        }
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
                <button
                    onClick={handleOpenAdd}
                    className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                    <FiPlus size={20} />
                    {t('admin.interests.add_btn')}
                </button>
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

            {/* Form (Add/Edit) */}
            {isFormOpen && (
                <div className="mb-6 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6 relative">
                    <button
                        onClick={handleCloseForm}
                        className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text"
                    >
                        <FiX size={20} />
                    </button>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text mb-4">
                        {editingInterest ? t('admin.interests.edit_title') : t('admin.interests.add_title')}
                    </h3>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            placeholder={t('admin.interests.name_placeholder')}
                            value={interestName}
                            onChange={(e) => setInterestName(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={!interestName.trim()}
                                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {editingInterest ? t('admin.interests.save_btn') : t('admin.interests.add_btn')}
                            </button>
                            <button
                                type="button"
                                onClick={handleCloseForm}
                                className="px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </form>
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
                            key={interest.id}
                            className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-4 hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
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
                                        onClick={() => handleOpenEdit(interest)}
                                        className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title={t('admin.interests.edit_title')}
                                    >
                                        <FiEdit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteInterest(interest.id)}
                                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title={t('admin.posts.delete_post')}
                                    >
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

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
        </div>
    );
};

export default InterestManagementPage;
