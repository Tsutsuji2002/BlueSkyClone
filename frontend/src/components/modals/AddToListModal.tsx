import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { FiX, FiCheck, FiLock } from 'react-icons/fi';
import { RootState } from '../../redux/store';
import { closeAddToList } from '../../redux/slices/modalsSlice';
import { showToast } from '../../redux/slices/toastSlice';
import api from '../../utils/api';
import { ListDto } from '../../types';
import Button from '../common/Button';
import ListAvatar from '../common/ListAvatar';

const AddToListModal: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const { isOpen, user } = useSelector((state: RootState) => state.modals.addToList);
    
    const [lists, setLists] = useState<ListDto[]>([]);
    const [memberships, setMemberships] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchData();
        }
    }, [isOpen, user]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [listsRes, membershipsRes] = await Promise.all([
                api.get<ListDto[]>('/lists/my'),
                api.get<string[]>(`/lists/memberships/${user?.id}`)
            ]);
            setLists(listsRes.data);
            setMemberships(membershipsRes.data);
        } catch (error) {
            console.error('Failed to fetch lists:', error);
            dispatch(showToast({ message: 'Failed to load lists', type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleMembership = async (listId: string) => {
        if (!user) return;
        const isMember = memberships.includes(listId);
        
        try {
            setUpdating(listId);
            if (isMember) {
                await api.delete(`/lists/${listId}/members/${user.id}`);
                setMemberships(prev => prev.filter(id => id !== listId));
                setLists(prev => prev.map(l => l.id === listId ? { ...l, membersCount: l.membersCount - 1 } : l));
            } else {
                await api.post(`/lists/${listId}/members`, { userId: user.id });
                setMemberships(prev => [...prev, listId]);
                setLists(prev => prev.map(l => l.id === listId ? { ...l, membersCount: l.membersCount + 1 } : l));
            }
        } catch (error) {
            console.error('Failed to update membership:', error);
            dispatch(showToast({ message: 'Failed to update list membership', type: 'error' }));
        } finally {
            setUpdating(null);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface w-full max-w-[500px] rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                    <button 
                        onClick={() => dispatch(closeAddToList())}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-border rounded-full transition-colors"
                    >
                        <FiX size={20} className="text-gray-600 dark:text-dark-text-secondary" />
                    </button>
                    <h2 className="text-[18px] font-bold text-gray-900 dark:text-dark-text">
                        {t('profile.add_to_lists')}
                    </h2>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-gray-500 dark:text-dark-text-secondary">{t('common.loading')}</p>
                        </div>
                    ) : lists.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-4">
                            <p className="text-gray-500 dark:text-dark-text-secondary">
                                {t('lists.no_lists')}
                            </p>
                            <Button 
                                variant="primary" 
                                onClick={() => {
                                    dispatch(closeAddToList());
                                }}
                            >
                                {t('lists.create_new')}
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-dark-border/50">
                            {lists.map(list => (
                                <div 
                                    key={list.id}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-dark-surface/50 rounded-xl transition-colors cursor-pointer"
                                    onClick={() => !updating && handleToggleMembership(list.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <ListAvatar src={list.avatarUrl} alt={list.name} size="md" />
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-gray-900 dark:text-dark-text">{list.name}</span>
                                                {(list.purpose === 'modlist' || list.purpose === 'mod') && (
                                                    <FiLock size={14} className="text-gray-400" title="Moderation List" />
                                                )}
                                            </div>
                                            <span className="text-[13px] text-gray-500 dark:text-dark-text-secondary">
                                                {t('lists.members_count', { count: list.membersCount })}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                                        memberships.includes(list.id) 
                                            ? 'bg-primary border-primary' 
                                            : 'border-gray-300 dark:border-dark-border'
                                    }`}>
                                        {updating === list.id ? (
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : memberships.includes(list.id) && (
                                            <FiCheck size={16} className="text-white" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                    }
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-dark-border">
                    <Button 
                        variant="outline" 
                        fullWidth 
                        className="rounded-full font-bold"
                        onClick={() => dispatch(closeAddToList())}
                    >
                        {t('common.done')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default AddToListModal;
