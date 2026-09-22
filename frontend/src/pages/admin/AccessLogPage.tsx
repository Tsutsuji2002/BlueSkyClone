import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiSearch, FiRefreshCw, FiChevronLeft, FiChevronRight, FiUserCheck, FiUsers, FiLogOut, FiEye } from 'react-icons/fi';
import { adminService } from '../../services/adminService';
import { AccessLog, AccessLogStats } from '../../types/admin';
import { useAppSelector } from '../../hooks/useAppSelector';
import { RootState } from '../../redux/store';
import AccessLogDetailModal from '../../components/admin/AccessLogDetailModal';

const TAKE = 50;

const actionColors: Record<string, string> = {
    login: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    guest_visit: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    logout: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    session_expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const actionLabels: Record<string, string> = {
    login: 'Login',
    guest_visit: 'Guest Visit',
    logout: 'Logout',
    session_expired: 'Session Expired',
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString();
}

function truncateUA(ua?: string): string {
    if (!ua) return '—';
    if (ua.length <= 55) return ua;
    return ua.slice(0, 52) + '...';
}

const AccessLogPage: React.FC = () => {
    const { mode } = useAppSelector((state: RootState) => state.theme);
    const dark = mode === 'dark';

    const [logs, setLogs] = useState<AccessLog[]>([]);
    const [stats, setStats] = useState<AccessLogStats | null>(null);
    const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
    const [total, setTotal] = useState(0);
    const [skip, setSkip] = useState(0);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [browserFilter, setBrowserFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [statsLoading, setStatsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    const fetchStats = useCallback(async () => {
        setStatsLoading(true);
        try {
            const result = await adminService.getAccessLogStats();
            setStats(result);
        } catch {
            // Non-critical if stats fail
        } finally {
            setStatsLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async (s = skip, q = search, a = actionFilter, b = browserFilter, d = dateFilter) => {
        setLoading(true);
        setError(null);
        try {
            const result = await adminService.getAccessLogs(
                s,
                TAKE,
                q || undefined,
                a !== 'all' ? a : undefined,
                b !== 'all' ? b : undefined,
                d !== 'all' ? d : undefined
            );
            setLogs(result.items);
            setTotal(result.totalCount);
            setLastRefresh(new Date());
        } catch (e) {
            setError('Failed to load access logs.');
        } finally {
            setLoading(false);
        }
    }, [skip, search, actionFilter, browserFilter, dateFilter]);

    const refreshAll = useCallback(() => {
        fetchLogs();
        fetchStats();
    }, [fetchLogs, fetchStats]);

    useEffect(() => {
        fetchLogs(skip, search, actionFilter, browserFilter, dateFilter);
    }, [skip, search, actionFilter, browserFilter, dateFilter]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            fetchLogs(skip, search, actionFilter, browserFilter, dateFilter);
            fetchStats();
        }, 30000);
        return () => clearInterval(timer);
    }, [skip, search, actionFilter, browserFilter, dateFilter, fetchLogs, fetchStats]);

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
                        <p className={`text-sm ${textSub}`}>Monitor user logins, guest visits, and session activity (Click any row for details)</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs ${textSub}`}>
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </span>
                    <button
                        onClick={refreshAll}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors"
                        disabled={loading || statsLoading}
                    >
                        <FiRefreshCw size={14} className={loading || statsLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Access Stats Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Total Accesses */}
                <div className={`border rounded-xl p-4 flex items-center gap-4 ${card}`}>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold">
                        <FiActivity size={22} />
                    </div>
                    <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Total Accesses</span>
                        <p className="text-2xl font-extrabold mt-0.5">
                            {stats ? stats.totalAccesses.toLocaleString() : '—'}
                        </p>
                    </div>
                </div>

                {/* User Logins */}
                <div className={`border rounded-xl p-4 flex items-center gap-4 ${card}`}>
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center font-bold">
                        <FiUserCheck size={22} />
                    </div>
                    <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>User Logins</span>
                        <p className="text-2xl font-extrabold text-green-600 dark:text-green-400 mt-0.5">
                            {stats ? stats.userLogins.toLocaleString() : '—'}
                        </p>
                    </div>
                </div>

                {/* Guest Visits */}
                <div className={`border rounded-xl p-4 flex items-center gap-4 ${card}`}>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                        <FiUsers size={22} />
                    </div>
                    <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Guest Visits</span>
                        <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                            {stats ? stats.guestVisits.toLocaleString() : '—'}
                        </p>
                    </div>
                </div>

                {/* Logouts & Expired */}
                <div className={`border rounded-xl p-4 flex items-center gap-4 ${card}`}>
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                        <FiLogOut size={22} />
                    </div>
                    <div>
                        <span className={`text-xs font-semibold uppercase tracking-wider ${textSub}`}>Logouts & Expired</span>
                        <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                            {stats ? (stats.logouts + stats.expiredSessions).toLocaleString() : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={`border rounded-xl p-4 mb-5 flex flex-col sm:flex-row gap-3 ${card}`}>
                <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                    <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border ${dark ? 'bg-dark-surface border-dark-border' : 'bg-gray-50 border-gray-200'}`}>
                        <FiSearch size={14} className={textSub} />
                        <input
                            type="text"
                            placeholder="Search by handle or IP address..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm"
                        />
                    </div>
                    <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 transition-colors">
                        Search
                    </button>
                </form>

                {/* Date Range Filter */}
                <select
                    value={dateFilter}
                    onChange={e => { setSkip(0); setDateFilter(e.target.value); }}
                    className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="24h">Past 24 Hours</option>
                    <option value="7d">Past 7 Days</option>
                    <option value="30d">Past 30 Days</option>
                </select>

                {/* Browser Filter */}
                <select
                    value={browserFilter}
                    onChange={e => { setSkip(0); setBrowserFilter(e.target.value); }}
                    className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                    <option value="all">All Browsers / Devices</option>
                    <option value="chrome">Google Chrome</option>
                    <option value="safari">Apple Safari</option>
                    <option value="edge">Microsoft Edge</option>
                    <option value="firefox">Mozilla Firefox</option>
                    <option value="bot">Bots & Scanners</option>
                </select>

                {/* Action Filter */}
                <select
                    value={actionFilter}
                    onChange={e => { setSkip(0); setActionFilter(e.target.value); }}
                    className={`px-3 py-2 rounded-lg border text-sm ${dark ? 'bg-dark-surface border-dark-border text-dark-text' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                >
                    <option value="all">All Actions</option>
                    <option value="login">User Login</option>
                    <option value="guest_visit">Guest Visit</option>
                    <option value="logout">Logout</option>
                    <option value="session_expired">Session Expired</option>
                </select>
            </div>

            {/* Stats bar */}
            <div className={`border rounded-xl p-3 mb-5 flex items-center justify-between ${card}`}>
                <span className={`text-sm ${textSub}`}>
                    {loading ? 'Loading...' : `${total.toLocaleString()} matching records (Click row to expand details)`}
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
                                <th className="text-left px-4 py-3 font-semibold">User / Identity</th>
                                <th className="text-left px-4 py-3 font-semibold">IP Address</th>
                                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">User Agent</th>
                                <th className="text-left px-4 py-3 font-semibold">Action</th>
                                <th className="text-left px-4 py-3 font-semibold">Time</th>
                                <th className="text-center px-4 py-3 font-semibold w-16">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="text-center py-12">
                                        <div className="flex items-center justify-center gap-2">
                                            <FiRefreshCw size={16} className="animate-spin text-indigo-500" />
                                            <span className={textSub}>Loading...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.length === 0 && (
                                <tr>
                                    <td colSpan={6} className={`text-center py-12 ${textSub}`}>
                                        No access logs found.
                                    </td>
                                </tr>
                            )}
                            {!loading && logs.map(log => (
                                <tr
                                    key={log.id}
                                    onClick={() => setSelectedLog(log)}
                                    className={`transition-colors cursor-pointer ${rowHover}`}
                                >
                                    <td className="px-4 py-3 font-medium">
                                        {log.handle === 'Guest' ? (
                                            <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-semibold">
                                                Guest
                                            </span>
                                        ) : (
                                            log.handle || <span className={textSub}>—</span>
                                        )}
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
                                            {actionLabels[log.action] ?? log.action}
                                        </span>
                                    </td>
                                    <td className={`px-4 py-3 text-xs ${textSub} whitespace-nowrap`}>
                                        {formatDate(log.createdAt)}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedLog(log); }}
                                            className={`p-1.5 rounded-lg transition-colors text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40`}
                                            title="View Full Details"
                                        >
                                            <FiEye size={16} />
                                        </button>
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

            {/* Log Detail Modal */}
            {selectedLog && (
                <AccessLogDetailModal
                    log={selectedLog}
                    dark={dark}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
};

export default AccessLogPage;
