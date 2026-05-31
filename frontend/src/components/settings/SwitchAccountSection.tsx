import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiChevronUp, FiUsers, FiUserPlus, FiCheck } from 'react-icons/fi';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useSwitchAccountMutation } from '../../redux/api/authApi';
import { setAuth } from '../../redux/slices/authSlice';
import { RootState } from '../../redux/store';
import Avatar from '../common/Avatar';
import { cn } from '../../utils/classNames';
import { toast } from 'react-hot-toast';

const SwitchAccountSection: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [isExpanded, setIsExpanded] = useState(false);
    
    const user = useAppSelector((state: RootState) => state.auth.user);
    const savedAccounts = useAppSelector((state: RootState) => state.auth.savedAccounts);
    const [switchAccount, { isLoading }] = useSwitchAccountMutation();

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

    return (
        <div className="border-b border-gray-100 dark:border-dark-border">
            {/* Header / Current Account Display */}
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
                    {isExpanded ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
                </div>
            </button>

            {/* Collapsible Account List */}
            {isExpanded && (
                <div className="bg-gray-50/50 dark:bg-dark-surface/20 pb-2">
                    {savedAccounts.map((account) => {
                        const isActive = account.did === user?.did;
                        return (
                            <button
                                key={account.did}
                                onClick={() => handleSwitch(account)}
                                className={cn(
                                    "w-full flex items-center justify-between px-6 py-3 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors text-left",
                                    isActive && "bg-gray-100/50 dark:bg-dark-surface/50"
                                )}
                                disabled={isLoading}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <Avatar
                                        src={account.avatar}
                                        alt={account.displayName || account.handle}
                                        size="md"
                                        className={cn(!isActive && "opacity-80")}
                                    />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-sm font-semibold text-gray-900 dark:text-dark-text truncate">
                                            {account.handle}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-dark-text-secondary truncate">
                                            @{account.handle}
                                        </span>
                                    </div>
                                </div>
                                {isActive && (
                                    <div className="bg-primary-500 rounded-full p-1">
                                        <FiCheck size={12} className="text-white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}

                    {/* Add Another Account */}
                    <button
                        onClick={() => navigate('/auth/login')}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors mt-1 border-t border-gray-100 dark:border-dark-border/50"
                        disabled={isLoading}
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-dark-surface flex items-center justify-center">
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
