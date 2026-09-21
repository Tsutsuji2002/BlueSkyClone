import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import { AccessLog } from '../../types/admin';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';

const TAKE = 50;

const actionColors: Record<string, string> = {
    login: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    logout: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    default: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
}

function truncateUA(ua?: string): string {
    if (!ua) return '—';
    if (ua.length <= 60) return ua;
    return ua.slice(0, 57) + '...';
}

const AccessLogPage: React.FC = () => {
    const { mode } = useAppSelector((state: RootState) => state.theme);
    const dark = mode === 'dark';

    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchLogs = useCallback(async (s = skip, q = search, a = actionFilter) => {
        setLoading(true);
        setError(null);
        try {
            const result = await adminService.getAccessLogs(s, TAKE, q || undefined, a !== 'all' ? a : undefined);
            setLogs(result.items);
            setTotal(result.totalCount);
            setLastRefresh(new Date());
        } catch (e) {
            setError('Failed to load access logs.');
        } finally {
            setLoading(false);
        }
    }, [skip, search, actionFilter]);

    useEffect(() => {
        fetchLogs(skip, search, actionFilter);
    }, [skip, search, actionFilter]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => fetchLogs(skip, search, actionFilter), 30000);
        return () => clearInterval(timer);
    }, [skip, search, actionFilter, fetchLogs]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSkip(0);
        setSearch(searchInput);
    };

    const totalPages = Math.ceil(total / TAKE);
    const currentPage = Math.floor(skip / TAKE) + 1;

    const card = dark ? 'bg-dark-bg border-dark-border' : 'bg-white border-gray-200';
    const textSub = dark ? 'text-dark-text-secondary' : 'text-gray-500';
    const rowHover = dark ? 'hover:bg-dark-surface' : 'hover:bg-gray-50';

    return (
        <div className={`min-h-screen p-6 ${dark ? 'bg-dark-bg text-dark-text' : 'bg-gray-50 text-gray-900'}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <FiActivity size={20} className="text-indigo-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Access Logs</h1>
                        <p className={`text-sm ${textSub}`}>User login activity and IP tracking</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs ${textSub}`}>
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={() => fetchLogs()}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
                        disabled={loading}
                    >
                        <FiRefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className={`border rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-3 ${card}`}>
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                        <FiSearch size={14} className={textSub} />
                        <input
                            type="text"
                            placeholder="Search by handle or IP..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                    </div>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
                        Search
                    </button>
                </form>

                <select
                    value={actionFilter}
                    onChange={e => { setSkip(0); setActionFilter(e.target.value); }}
                    className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                    <option value="all">All Actions</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                </select>
            </div>

            {/* Stats bar */}
            <div className={`border rounded-xl p-3 mb-5 flex items-center justify-between ${card}`}>
                <span className={`text-sm ${textSub}`}>
                    {loading ? 'Loading...' : `${total.toLocaleString()} total records`}
                </span>
                <span className={`text-sm ${textSub}`}>
                    Page {currentPage} of {Math.max(1, totalPages)}
                </span>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className={`border rounded-xl overflow-hidden ${card}`}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className={`border-b ${dark ? 'border-dark-border bg-dark-surface' : 'border-gray-100 bg-gray-50'}`}>
                                <th className="text-left px-4 py-3 font-semibold">Handle</th>
                                <th className="text-left px-4 py-3 font-semibold">IP Address</th>
                                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">User Agent</th>
                                <th className="text-left px-4 py-3 font-semibold">Action</th>
                                <th className="text-left px-4 py-3 font-semibold">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                            {loading && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12">
                                        <div className="flex items-center justify-center gap-2">
                                            <FiRefreshCw size={16} className="animate-spin text-indigo-500" />
                                            <span className={textSub}>Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className={`text-center py-12 ${textSub}`}>
                                        No access logs found.
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.map(log => (
                                <tr key={log.id} className={`transition-colors ${rowHover}`}>
                                    <td className="px-4 py-3 font-medium">
                                        {log.handle || <span className={textSub}>—</span>}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs">
                                        <span className={`px-2 py-0.5 rounded ${dark ? 'bg-dark-surface' : 'bg-gray-100'}`}>
                                            {log.ipAddress}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 hidden md:table-cell max-w-xs truncate ${textSub}`} title={log.userAgent}>
                                        {truncateUA(log.userAgent)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] ?? actionColors.default}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-xs ${textSub} whitespace-nowrap`}>
                                        {formatDate(log.createdAt)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mt-5">
                    <button
                        onClick={() => setSkip(Math.max(0, skip - TAKE))}
                        disabled={skip === 0}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm disabled:opacity-40 transition-colors hover:bg-gray-100 dark:hover:bg-dark-surface"
                    >
                        <FiChevronLeft size={14} /> Prev
                    </button>
                    <span className={`text-sm ${textSub}`}>{currentPage} / {totalPages}</span>
                    <button
                        onClick={() => setSkip(skip + TAKE)}
                        disabled={skip + TAKE >= total}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm disabled:opacity-40 transition-colors hover:bg-gray-100 dark:hover:bg-dark-surface"
                    >
                        Next <FiChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default AccessLogPage;
