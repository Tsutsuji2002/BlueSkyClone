import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiSlash, FiUserCheck } from 'react-icons/fi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchBlockedAccounts, unblockUserAsync } from '../redux/slices/userSlice';
import LoadingIndicator from '../components/common/LoadingIndicator';
import Avatar from '../components/common/Avatar';
import ConfirmModal from '../components/common/ConfirmModal';
import { User } from '../types';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const BlockedAccountsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { users, isLoading } = useAppSelector(state => state.user);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        user: User | null;
    }>({ isOpen: false, user: null });

    useEffect(() => {
        dispatch(fetchBlockedAccounts());
    }, [dispatch]);

    const handleUnblockClick = (user: User) => {
        setConfirmModal({ isOpen: true, user });
    };

    const confirmUnblock = () => {
        if (!confirmModal.user || !confirmModal.user.blockingReference) return;
        dispatch(unblockUserAsync({ userId: confirmModal.user.id, blockUri: confirmModal.user.blockingReference })).then(() => {
            dispatch(fetchBlockedAccounts());
        });
    };

    useDocumentTitle(t('moderation.blocked_accounts_title'));

    return (
        <>
            <div className="min-h-screen border-r border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border p-4 flex items-center gap-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('moderation.blocked_accounts_title')}
                    </h1>
                </div>

                <div className="p-4">
                    <div className="p-4 bg-gray-50 dark:bg-dark-surface/30 border-b border-gray-200 dark:border-dark-border mb-6 flex items-center justify-center">
                        <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary text-center leading-relaxed max-w-lg">
                            {t('moderation.blocked_accounts_info')}
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : users.length > 0 ? (
                        <div className="flex flex-col border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden shadow-sm max-w-3xl mx-auto">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-4 border-b last:border-b-0 border-gray-100 dark:border-dark-border bg-white dark:bg-dark-surface/10 hover:bg-gray-50 dark:hover:bg-dark-surface/20 transition-colors">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer"
                                        onClick={() => navigate(`/profile/${user.handle}`)}
                                    >
                                        <Avatar src={user.avatarUrl} alt={user.displayName} size="md" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-gray-900 dark:text-dark-text truncate">
                                                {user.displayName || user.username}
                                            </span>
                                            <span className="text-sm text-gray-500 dark:text-dark-text-secondary truncate">
                                                @{user.handle}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnblockClick(user)}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                                    >
                                        <FiUserCheck />
                                        {t('moderation.unblock')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="max-w-md mx-auto mt-8 bg-gray-50/50 dark:bg-dark-surface/20 rounded-xl p-12 text-center border border-gray-100 dark:border-dark-border shadow-inner">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-dark-bg/50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <FiSlash size={32} />
                            </div>
                            <p className="text-gray-600 dark:text-dark-text-secondary text-[15px] leading-relaxed">
                                {t('moderation.no_blocked_accounts')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmUnblock}
                title={t('profile.unblock')}
                message={t('moderation.unblock_confirm', { name: confirmModal.user?.displayName || confirmModal.user?.handle })}
                variant="primary"
            />
        </>
    );
};

export default BlockedAccountsPage;

