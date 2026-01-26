import React from 'react';
import Avatar from '../common/Avatar';
import { User } from '../../types';

interface MentionSuggesterProps {
    users: User[];
    onSelect: (user: User) => void;
    isLoading: boolean;
}

const MentionSuggester: React.FC<MentionSuggesterProps> = ({ users, onSelect, isLoading }) => {
    console.log('MentionSuggester rendered:', { usersCount: users.length, isLoading, users });

    if (isLoading && users.length === 0) {
        return (
            <div className="mt-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-2xl p-3 animate-pulse z-[100]">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-dark-border" />
                    <div className="flex-1">
                        <div className="h-3.5 bg-gray-200 dark:bg-dark-border rounded w-24 mb-1.5" />
                        <div className="h-2.5 bg-gray-200 dark:bg-dark-border rounded w-32" />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-dark-border" />
                    <div className="flex-1">
                        <div className="h-3.5 bg-gray-200 dark:bg-dark-border rounded w-20 mb-1.5" />
                        <div className="h-2.5 bg-gray-200 dark:bg-dark-border rounded w-28" />
                    </div>
                </div>
            </div>
        );
    }

    if (users.length === 0) return null;

    return (
        <div className="mt-2 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl shadow-2xl overflow-hidden z-[100]">
            <div className="max-h-64 overflow-y-auto">
                {users.map((user) => (
                    <button
                        key={user.id}
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect(user);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left group border-b border-gray-100 dark:border-dark-border last:border-0"
                    >
                        <Avatar src={user.avatar || user.avatarUrl} alt={user.displayName || user.username} size="sm" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-[14px] text-gray-900 dark:text-dark-text truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {user.displayName || user.username}
                            </div>
                            <div className="text-[12px] text-gray-500 dark:text-dark-text-secondary truncate">
                                @{user.handle || user.username}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default MentionSuggester;
