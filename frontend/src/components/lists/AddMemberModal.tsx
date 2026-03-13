import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { fetchCandidateMembers, addListMember, clearCandidates } from '../../redux/slices/listsSlice';
import { FiX, FiSearch } from 'react-icons/fi';
import Avatar from '../common/Avatar';
import ConfirmModal from '../common/ConfirmModal';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    listId: string;
}

const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose, listId }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [hasFetched, setHasFetched] = useState(false);
    const { candidateMembers, isLoading } = useAppSelector(state => state.lists);
    const [query, setQuery] = useState('');
    const [adding, setAdding] = useState<Record<string, boolean>>({});
    const [confirmingUser, setConfirmingUser] = useState<{ id: string, displayName: string } | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                setHasFetched(false);
                dispatch(clearCandidates());
                try {
                    await dispatch(fetchCandidateMembers({ listId, query: '' })).unwrap();
                } finally {
                    setHasFetched(true);
                }
            };
            loadData();
        }
        return () => {
            dispatch(clearCandidates());
        };
    }, [isOpen, listId, dispatch]);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        // Reset fetch state on new search if you want immediate feedback or just rely on isLoading
        // Typically with search, we might want to keep the old results until new ones arrive or show loading.
        // Let's rely on isLoading for search updates.

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(() => {
            dispatch(fetchCandidateMembers({ listId, query: value }));
        }, 300);
    };

    const handleConfirmAdd = (userId: string, displayName: string) => {
        setConfirmingUser({ id: userId, displayName });
    };

    const handleAdd = async (userId: string) => {
        setAdding(prev => ({ ...prev, [userId]: true }));
        try {
            await dispatch(addListMember({ listId, userId })).unwrap();
        } catch (error) {
            console.error('Failed to add member', error);
        } finally {
            setAdding(prev => ({ ...prev, [userId]: false }));
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white dark:bg-dark-surface w-full max-w-md rounded-xl shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                            {t('lists.add_people')}
                        </h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full">
                            <FiX size={20} className="text-gray-500" />
                        </button>
                    </div>

                    <div className="p-4 border-b border-gray-200 dark:border-dark-border">
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                value={query}
                                onChange={handleSearch}
                                placeholder={t('lists.search_placeholder')}
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-bg rounded-lg border-none focus:ring-2 focus:ring-primary-500 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2">
                        {!hasFetched && !query ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
                                <div className="animate-spin w-6 h-6 border-2 border-primary-500 rounded-full border-t-transparent" />
                                <span>{t('common.loading')}</span>
                            </div>
                        ) : candidateMembers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                                {isLoading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin w-6 h-6 border-2 border-primary-500 rounded-full border-t-transparent" />
                                        <span>{t('common.loading')}</span>
                                    </div>
                                ) : (
                                    query ? t('search.no_results') : t('lists.no_suggestions')
                                )}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {candidateMembers.map(user => (
                                    <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-dark-hover rounded-lg">
                                        <Avatar src={user.avatar || user.avatarUrl} alt={user.displayName} size="md" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                {user.displayName}
                                            </h3>
                                            <p className="text-sm text-gray-500 truncate">@{user.handle}</p>
                                        </div>
                                        {typeof user.listMembershipStatus === 'number' ? (
                                            <button
                                                disabled
                                                className="bg-gray-200 dark:bg-dark-hover text-gray-500 dark:text-gray-400 px-4 py-1.5 rounded-full text-sm font-bold opacity-70 cursor-not-allowed"
                                            >
                                                {user.listMembershipStatus === 0 ? t('lists.invited') : t('lists.member')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleConfirmAdd(user.id, user.displayName)}
                                                disabled={adding[user.id]}
                                                className="bg-gray-900 dark:bg-white text-white dark:text-black px-4 py-1.5 rounded-full text-sm font-bold hover:opacity-90 disabled:opacity-50"
                                            >
                                                {adding[user.id] ? (
                                                    <div className="animate-spin w-3 h-3 border-2 border-current rounded-full border-t-transparent" />
                                                ) : (
                                                    t('lists.add')
                                                )}
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="py-4 flex justify-center">
                                        <div className="animate-spin w-4 h-4 border-2 border-primary-500 rounded-full border-t-transparent" />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={!!confirmingUser}
                onClose={() => setConfirmingUser(null)}
                onConfirm={() => confirmingUser && handleAdd(confirmingUser.id)}
                title={t('lists.invite_title', 'List Invitation')}
                message={t('lists.confirm_add_member', { name: confirmingUser?.displayName }) || `Invite ${confirmingUser?.displayName} to this list?`}
                confirmLabel={t('lists.send_invite', 'Send Invite')}
                variant="primary"
            />
        </>
    );
};

export default AddMemberModal;
