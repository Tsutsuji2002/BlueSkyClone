import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiShield, FiVolumeX } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import { AdminBlock, AdminMute } from '../../types/admin';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const ModerationPage: React.FC = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'blocks' | 'mutes'>('blocks');
    const [blocks, setBlocks] = useState<AdminBlock[]>([]);
    const [mutes, setMutes] = useState<AdminMute[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [take] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'blocks') {
                const data = await adminService.getBlocks(skip, take, searchQuery);
                setBlocks(data.items);
                setTotal(data.totalCount);
            } else {
                const data = await adminService.getMutes(skip, take, searchQuery);
                setMutes(data.items);
                setTotal(data.totalCount);
            }
        } catch (error) {
            console.error('Failed to fetch moderation data:', error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, skip, take, searchQuery]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTabChange = (tab: 'blocks' | 'mutes') => {
        setActiveTab(tab);
        setSkip(0);
        setSearchQuery('');
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">
                    {t('admin.moderation.title')}
                </h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                    {t('admin.moderation.desc')}
                </p>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 mb-6 border-b border-gray-200 dark:border-dark-border">
                <button
                    onClick={() => handleTabChange('blocks')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'blocks'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FiShield size={16} />
                        {t('admin.moderation.blocks_tab')}
                    </div>
                </button>
                <button
                    onClick={() => handleTabChange('mutes')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'mutes'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <FiVolumeX size={16} />
                        {t('admin.moderation.mutes_tab')}
                    </div>
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.moderation.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setSkip(0);
                        }}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.moderation.user_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.moderation.target_header')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">
                                    {t('admin.moderation.date_header')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.dashboard.loading')}
                                    </td>
                                </tr>
                            ) : (activeTab === 'blocks' ? blocks : mutes).length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.common.no_results', 'No results found')}
                                    </td>
                                </tr>
                            ) : (
                                (activeTab === 'blocks' ? blocks : mutes).map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/profile/${item.userHandle}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                @{item.userHandle}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Link to={`/profile/${activeTab === 'blocks' ? item.blockedUserHandle : item.mutedUserHandle}`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                                @{activeTab === 'blocks' ? item.blockedUserHandle : item.mutedUserHandle}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
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

export default ModerationPage;
