import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiInfo, FiX, FiCheckCircle, FiClock, FiArchive, FiMail, FiCalendar, FiCpu, FiTag } from 'react-icons/fi';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import { fetchAllSupportRequests, updateSupportStatus, SupportRequest } from '../../redux/slices/supportSlice';
import { showToast } from '../../redux/slices/toastSlice';

const SupportManagementPage: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { requests, loading } = useAppSelector((state: RootState) => state.support);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

    const fetchRequests = useCallback(() => {
        dispatch(fetchAllSupportRequests());
    }, [dispatch]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleStatusUpdate = async (id: string, status: string) => {
        try {
            await dispatch(updateSupportStatus({ id, status })).unwrap();
            dispatch(showToast({ message: 'Status updated successfully', type: 'success' }));
            if (selectedRequest?.id === id) {
                setSelectedRequest(prev => prev ? { ...prev, status } : null);
            }
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Failed to update status', type: 'error' }));
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const filteredRequests = requests.filter(r =>
        r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.username && r.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <FiClock className="text-yellow-500" />;
            case 'replied': return <FiCheckCircle className="text-blue-500" />;
            case 'closed': return <FiArchive className="text-gray-500" />;
            default: return null;
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'replied': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
            case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
            default: return '';
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">{t('admin.support.title')}</h1>
                <p className="text-gray-600 dark:text-dark-text-secondary">{t('admin.support.desc')}</p>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder={t('admin.support.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border py-3 pl-12 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                    />
                </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-dark-bg border-b border-gray-200 dark:border-dark-border">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.support.table_user')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.support.table_category')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.support.table_device')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.support.table_status')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.support.table_created')}</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-secondary uppercase tracking-wider">{t('admin.support.table_actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-dark-border">
                            {loading && requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.dashboard.loading')}
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-dark-text-secondary">
                                        {t('admin.support.no_requests')}
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900 dark:text-dark-text">{request.email}</div>
                                            {request.username && <div className="text-xs text-gray-500 dark:text-dark-text-secondary">@{request.username}</div>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {t(`support.category_options.${request.category}`)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary uppercase">
                                            {request.deviceType}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full flex items-center gap-1 w-fit ${getStatusClass(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                {t(`admin.support.status_${request.status}`)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-dark-text-secondary">
                                            {formatDate(request.createdAt)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => setSelectedRequest(request)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                                                title={t('admin.support.view_details')}
                                            >
                                                <FiInfo size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Request Details Drawer */}
            {selectedRequest && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedRequest(null)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-dark-surface h-full shadow-2xl flex flex-col animate-slide-in-right">
                        <div className="p-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
                            <h2 className="text-xl font-bold dark:text-dark-text">{t('admin.support.request_details')}</h2>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FiMail size={12} /> {t('admin.support.contact_email')}</div>
                                    <div className="font-medium dark:text-dark-text truncate">{selectedRequest.email}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FiCalendar size={12} /> {t('admin.support.date')}</div>
                                    <div className="font-medium dark:text-dark-text">{formatDate(selectedRequest.createdAt)}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FiTag size={12} /> {t('admin.support.category')}</div>
                                    <div className="font-medium dark:text-dark-text">{t(`support.category_options.${selectedRequest.category}`)}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl">
                                    <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><FiCpu size={12} /> {t('admin.support.device')}</div>
                                    <div className="font-medium dark:text-dark-text uppercase">{selectedRequest.deviceType}</div>
                                </div>
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <h4 className="font-semibold dark:text-dark-text">{t('admin.support.description')}</h4>
                                <div
                                    className="p-4 bg-gray-50 dark:bg-dark-bg rounded-xl prose dark:prose-invert max-w-none text-sm min-h-[200px]"
                                    dangerouslySetInnerHTML={{ __html: selectedRequest.description }}
                                />
                            </div>

                            {/* Status Management */}
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                                <h4 className="font-semibold dark:text-dark-text">{t('admin.support.update_status')}</h4>
                                <div className="grid grid-cols-3 gap-3">
                                    {['pending', 'replied', 'closed'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() => handleStatusUpdate(selectedRequest.id, status)}
                                            className={`px-4 py-3 rounded-xl border-2 font-medium transition-all flex flex-col items-center justify-center gap-2 ${selectedRequest.status === status
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                                                    : 'border-transparent bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-border'
                                                }`}
                                        >
                                            <div className="scale-125">{getStatusIcon(status)}</div>
                                            <span className="text-xs uppercase tracking-wider">{t(`admin.support.status_${status}`)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupportManagementPage;
