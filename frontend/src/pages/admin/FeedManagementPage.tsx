import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FiTrash2, FiRss, FiUsers, FiSearch, FiPlus, FiEdit2, FiX, FiUpload, FiImage } from 'react-icons/fi';
import { API_BASE_URL } from '../../constants';
import FeedAvatar from '../../components/common/FeedAvatar';

interface AdminFeed {
    id: string;
    name: string;
    handle: string;
    description?: string;
    avatarUrl?: string;
    subscribersCount: number;
    createdAt: string;
    isOfficial: boolean;
}

interface PaginatedResult {
    items: AdminFeed[];
    total: number;
    skip: number;
    take: number;
}

interface FeedFormData {
    name: string;
    handle: string;
    description: string;
    avatarUrl: string;
    isOfficial: boolean;
}

const FeedManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [feeds, setFeeds] = useState<AdminFeed[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [take] = useState(20);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'name' | 'subscribers' | 'created'>('created');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showForm, setShowForm] = useState(false);
    const [editingFeed, setEditingFeed] = useState<AdminFeed | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [formData, setFormData] = useState<FeedFormData>({
        name: '',
        handle: '',
        description: '',
        avatarUrl: '',
        isOfficial: false
    });

    const fetchFeeds = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                skip: skip.toString(),
                take: take.toString()
            });

            const response = await fetch(`${API_BASE_URL}/admin/feeds?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data: PaginatedResult = await response.json();
                setFeeds(data.items);
                setTotal(data.total);
            }
        } catch (error) {
            console.error('Failed to fetch feeds:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeeds();
    }, [skip]);

    const handleDelete = async (feedId: string) => {
        if (!window.confirm(t('admin.feeds.delete_confirm'))) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/admin/feeds/${feedId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                fetchFeeds();
            }
        } catch (error) {
            console.error('Failed to delete feed:', error);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            // Create a preview URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, avatarUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const uploadFile = async (file: File): Promise<string | null> => {
        try {
            setUploading(true);
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/media/upload?folder=feeds`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                return data.url;
            }
            return null;
        } catch (error) {
            console.error('File upload failed:', error);
            return null;
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            let finalAvatarUrl = formData.avatarUrl;

            // If a new file was selected, upload it first
            if (selectedFile) {
                const uploadedUrl = await uploadFile(selectedFile);
                if (uploadedUrl) {
                    finalAvatarUrl = uploadedUrl;
                } else {
                    alert('Failed to upload avatar image');
                    return;
                }
            }

            const token = localStorage.getItem('token');
            const url = editingFeed
                ? `${API_BASE_URL}/admin/feeds/${editingFeed.id}`
                : `${API_BASE_URL}/admin/feeds`;

            const method = editingFeed ? 'PUT' : 'POST';
            const body = editingFeed
                ? {
                    name: formData.name,
                    description: formData.description,
                    avatarUrl: finalAvatarUrl,
                    isOfficial: formData.isOfficial
                }
                : { ...formData, avatarUrl: finalAvatarUrl };

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setShowForm(false);
                setEditingFeed(null);
                setSelectedFile(null);
                setFormData({ name: '', handle: '', description: '', avatarUrl: '', isOfficial: false });
                fetchFeeds();
            } else {
                const error = await response.json();
                alert(error.message || 'Operation failed');
            }
        } catch (error) {
            console.error('Failed to save feed:', error);
            alert('Failed to save feed');
        }
    };

    const handleEdit = (feed: AdminFeed) => {
        setEditingFeed(feed);
        setSelectedFile(null);
        setFormData({
            name: feed.name,
            handle: feed.handle,
            description: feed.description || '',
            avatarUrl: feed.avatarUrl || '',
            isOfficial: feed.isOfficial
        });
        setShowForm(true);
    };

    const handleCancelForm = () => {
        setShowForm(false);
        setEditingFeed(null);
        setSelectedFile(null);
        setFormData({ name: '', handle: '', description: '', avatarUrl: '', isOfficial: false });
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // Filter and sort feeds locally
    const filteredAndSortedFeeds = feeds
        .filter(feed => {
            if (!searchQuery) return true;
            const search = searchQuery.toLowerCase();
            return (
                feed.name.toLowerCase().includes(search) ||
                feed.handle.toLowerCase().includes(search) ||
                feed.description?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'subscribers':
                    comparison = a.subscribersCount - b.subscribersCount;
                    break;
                case 'created':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">{t('admin.feeds.title')}</h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">{t('admin.feeds.desc')}</p>
            </div>

            {/* Search, Sort, and Add Controls */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.feeds.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="created">{t('admin.feeds.sort_created')}</option>
                        <option value="name">{t('admin.feeds.sort_name')}</option>
                        <option value="subscribers">{t('admin.feeds.sort_subscribers')}</option>
                    </select>
                    <button
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        className="px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="px-4 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        <FiPlus size={20} />
                        {t('admin.feeds.create_btn')}
                    </button>
                </div>
            </div>

            {/* Create/Edit Form */}
            {showForm && (
                <div className="mb-6 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text">
                            {editingFeed ? t('admin.feeds.edit_title') : t('admin.feeds.create_title')}
                        </h3>
                        <button onClick={handleCancelForm} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg">
                            <FiX size={20} />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                                    {t('admin.feeds.name_label')} *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                                    {t('admin.feeds.handle_label')} * {editingFeed && t('admin.feeds.handle_edit_note')}
                                </label>
                                <input
                                    type="text"
                                    value={formData.handle}
                                    onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    required
                                    disabled={!!editingFeed}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                                {t('admin.feeds.desc_label')}
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={3}
                                className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                                {t('admin.feeds.avatar_label')}
                            </label>
                            <div className="flex items-center gap-4">
                                <FeedAvatar
                                    src={formData.avatarUrl || (formData as any).avatar}
                                    alt="Avatar Preview"
                                    size="lg"
                                    className="flex-shrink-0"
                                />
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="px-4 py-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors flex items-center gap-2"
                                        >
                                            <FiUpload size={16} />
                                            {t('admin.feeds.choose_file')}
                                        </button>
                                        {selectedFile && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedFile(null);
                                                    setFormData({ ...formData, avatarUrl: editingFeed?.avatarUrl || '' });
                                                }}
                                                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                {t('admin.feeds.remove_file')}
                                            </button>
                                        )}
                                    </div>
                                    <input
                                        type="url"
                                        value={formData.avatarUrl.startsWith('data:') ? '' : formData.avatarUrl}
                                        onChange={(e) => {
                                            setSelectedFile(null);
                                            setFormData({ ...formData, avatarUrl: e.target.value });
                                        }}
                                        placeholder={t('admin.feeds.paste_url')}
                                        className="w-full px-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg dark:text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isOfficial"
                                checked={formData.isOfficial}
                                onChange={(e) => setFormData({ ...formData, isOfficial: e.target.checked })}
                                className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <label htmlFor="isOfficial" className="text-sm font-medium text-gray-700 dark:text-dark-text">
                                {t('admin.feeds.mark_official')}
                            </label>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelForm}
                                className="px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={uploading || loading}
                                className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {uploading ? t('admin.feeds.uploading') : (loading ? t('admin.feeds.saving') : (editingFeed ? t('admin.feeds.update_btn') : t('admin.feeds.create_btn')))}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Feeds Table */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.feeds.table_feed')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.feeds.table_desc')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.feeds.table_subscribers')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.feeds.table_created')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.feeds.table_status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.feeds.table_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.dashboard.loading')}
                                    </td>
                                </tr>
                            ) : filteredAndSortedFeeds.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.feeds.no_feeds')}
                                    </td>
                                </tr>
                            ) : (
                                filteredAndSortedFeeds.map((feed) => (
                                    <tr key={feed.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <FeedAvatar
                                                    src={feed.avatarUrl || (feed as any).avatar}
                                                    alt={feed.name}
                                                />
                                                <div>
                                                    <div className="font-medium text-gray-900 dark:text-dark-text">
                                                        {feed.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                                        @{feed.handle}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-md">
                                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2">
                                                {feed.description || t('feeds.no_posts')}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                                                <FiUsers size={16} />
                                                <span>{feed.subscribersCount}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {formatDate(feed.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {feed.isOfficial ? (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {t('admin.feeds.status_official')}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-400">
                                                    {t('admin.feeds.status_community')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(feed)}
                                                    className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                                    title={t('admin.feeds.edit_title')}
                                                >
                                                    <FiEdit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(feed.id)}
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
                        {t('admin.feeds.showing_info', { count: filteredAndSortedFeeds.length, total: total })}
                        {searchQuery && t('admin.feeds.filtered_info', { total: feeds.length })}
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

export default FeedManagementPage;
