import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiSearch, FiCheckCircle } from 'react-icons/fi';
import { AdminUser, PaginatedResult } from '../../types/admin';
import Avatar from '../common/Avatar';
import Button from '../common/Button';

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fetchData: (skip: number, take: number, search: string) => Promise<PaginatedResult<AdminUser>>;
}

const UserListModal: React.FC<UserListModalProps> = ({ isOpen, onClose, title, fetchData }) => {
    const { t } = useTranslation();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const TAKE = 20;

    const loadUsers = useCallback(async (reset = false) => {
        if (loading) return;
        setLoading(true);
        try {
            const currentSkip = reset ? 0 : skip;
            const result = await fetchData(currentSkip, TAKE, searchQuery);

            if (reset) {
                setUsers(result.items);
                setSkip(TAKE);
            } else {
                setUsers(prev => [...prev, ...result.items]);
                setSkip(prev => prev + TAKE);
            }

            setHasMore(result.items.length === TAKE);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchData, searchQuery, skip, loading]);

    useEffect(() => {
        if (isOpen) {
            loadUsers(true);
        } else {
            setUsers([]);
            setSkip(0);
            setSearchQuery('');
        }
    }, [isOpen]);

    // Debounce search
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            loadUsers(true);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-lg transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('admin.users.search_placeholder', 'Search users...')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary-500 dark:text-dark-text"
                        />
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-dark-bg rounded-lg transition-colors">
                            <Avatar
                                src={user.avatarUrl}
                                alt={user.handle}
                                size="sm"
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <span className="font-semibold text-gray-900 dark:text-dark-text truncate">
                                        {user.displayName || user.handle}
                                    </span>
                                    {user.isVerified && <FiCheckCircle className="text-primary-500" size={14} />}
                                    {user.isBanned && (
                                        <span className="text-xs bg-red-100 text-red-800 px-1.5 py-0.5 rounded ml-2">
                                            Banned
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                    @{user.handle}
                                </div>
                            </div>
                            <div className="text-xs text-gray-400">
                                {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="py-4 text-center text-gray-500">
                            Loading...
                        </div>
                    )}

                    {!loading && users.length === 0 && (
                        <div className="py-8 text-center text-gray-500">
                            No users found
                        </div>
                    )}

                    {!loading && hasMore && users.length > 0 && (
                        <div className="pt-2 text-center">
                            <Button variant="ghost" size="sm" onClick={() => loadUsers(false)}>
                                Load More
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserListModal;
