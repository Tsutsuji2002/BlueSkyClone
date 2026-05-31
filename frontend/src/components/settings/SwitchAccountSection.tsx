import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiChevronUp, FiUsers, FiUserPlus, FiCheck, FiMoreHorizontal, FiUserMinus } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useSwitchAccountMutation } from '../../redux/api/authApi';
import { setAuth, removeSavedAccount } from '../../redux/slices/authSlice';
import { RootState } from '../../redux/store';
import Avatar from '../common/Avatar';
import { cn } from '../../utils/classNames';
import { toast } from 'react-hot-toast';

const SwitchAccountSection: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isExpanded, setIsExpanded] = useState(false);
    const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    
    const user = useAppSelector((state: RootState) => state.auth.user);
    const savedAccounts = useAppSelector((state: RootState) => state.auth.savedAccounts);
    const [switchAccount, { isLoading }] = useSwitchAccountMutation();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenFor(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSwitch = async (account: any) => {
        if (account.did === user?.did) return;
        if (!account.refreshToken) {
            toast.error(t('auth.session_expired_login_again', 'Session expired. Please log in again.'));
            navigate('/auth/login');
            return;
        }

        try {
            const result = await switchAccount({ refreshToken: account.refreshToken }).unwrap();
            dispatch(setAuth(result));
            toast.success(t('settings.switched_to', 'Switched to @{{handle}}', { handle: account.handle }));
            setIsExpanded(false);
        } catch (err: any) {
            console.error('Failed to switch account:', err);
            toast.error(err.data?.message || t('settings.switch_failed', 'Failed to switch account'));
        }
    };

    const handleRemove = (e: React.MouseEvent, did: string) => {
        e.stopPropagation();
        dispatch(removeSavedAccount(did));
        toast.success(t('settings.account_removed', 'Account removed'));
        setMenuOpenFor(null);
    };

    return (
        <div className="border-b border-gray-100 dark:border-dark-border">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                disabled={isLoading}
            >
                <div className="flex items-center gap-4">
                    <FiUsers size={22} className="text-gray-900 dark:text-dark-text" />
                    <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                        {t('settings.switch_account')}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {isLoading && (
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    )}
                    {isExpanded ? <FiChevronUp size={20} className="text-gray-400" /> : <FiChevronDown size={20} className="text-gray-400" />}
                </div>
            </button>

            {/* Collapsible Account List */}
            {isExpanded && (
                <div className="bg-white dark:bg-dark-bg pb-2 mt-[-1px]">
                    {savedAccounts.filter(acc => acc.did !== user?.did).map((account) => (
                        <div key={account.did} className="relative group">
                            <button
                                onClick={() => handleSwitch(account)}
                                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors text-left"
                                disabled={isLoading}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative">
                                        <Avatar
                                            src={account.avatar}
                                            alt={account.handle}
                                            size="md"
                                        />
                                        <div className="absolute -top-1 -left-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center border-2 border-white dark:border-dark-bg">
                                            <span className="text-[8px] text-white font-bold">@</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text truncate">
                                            {account.handle}
                                        </span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenFor(menuOpenFor === account.did ? null : account.did);
                                    }}
                                    className="p-2 hover:bg-gray-200 dark:hover:bg-dark-surface-hover rounded-full transition-colors text-gray-500"
                                >
                                    <FiMoreHorizontal size={20} />
                                </button>
                            </button>

                            {/* Remove Menu */}
                            {menuOpenFor === account.did && (
                                <div 
                                    ref={menuRef}
                                    className="absolute right-4 top-12 z-50 bg-white dark:bg-dark-surface shadow-lg rounded-xl border border-gray-100 dark:border-dark-border py-1 min-w-[160px]"
                                >
                                    <button
                                        onClick={(e) => handleRemove(e, account.did)}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
                                    >
                                        <FiUserMinus size={18} />
                                        <span className="text-sm font-medium">{t('settings.remove_account', 'Remove account')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Add Another Account */}
                    <button
                        onClick={() => navigate('/auth/login')}
                        className="w-full flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface transition-colors"
                        disabled={isLoading}
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-dark-surface flex items-center justify-center border border-gray-100 dark:border-dark-border">
                            <FiUserPlus size={20} className="text-gray-600 dark:text-dark-text" />
                        </div>
                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">
                            {t('settings.add_another_account', 'Add another account')}
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};

export default SwitchAccountSection;
