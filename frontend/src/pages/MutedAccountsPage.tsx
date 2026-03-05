import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { fetchMutedAccounts, unmuteUserAsync } from '../redux/slices/userSlice';
import LoadingIndicator from '../components/common/LoadingIndicator';
import Avatar from '../components/common/Avatar';
import ConfirmModal from '../components/common/ConfirmModal';
import { User } from '../types';

const MutedAccountsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { users, isLoading } = useAppSelector(state => state.user);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        user: User | null;
    }>({ isOpen: false, user: null });

    useEffect(() => {
        dispatch(fetchMutedAccounts());
    }, [dispatch]);

    const handleUnmuteClick = (user: User) => {
        setConfirmModal({ isOpen: true, user });
    };

    const confirmUnmute = () => {
        if (!confirmModal.user) return;
        dispatch(unmuteUserAsync(confirmModal.user.id)).then(() => {
            dispatch(fetchMutedAccounts());
        });
    };

    return (
        <MainLayout>
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
                        {t('moderation.muted_accounts_title')}
                    </h1>
                </div>

                <div className="p-4">
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary text-center mb-6">
                        {t('moderation.muted_accounts_info')}
                    </p>

                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <LoadingIndicator size="lg" />
                        </div>
                    ) : users.length > 0 ? (
                        <div className="flex flex-col border border-gray-100 dark:border-dark-border rounded-xl overflow-hidden shadow-sm">
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
                                        onClick={() => handleUnmuteClick(user)}
                                        className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 dark:border-dark-border text-sm font-bold text-gray-700 dark:text-dark-text hover:bg-gray-100 dark:hover:bg-dark-surface transition-colors"
                                    >
                                        <FiVolume2 className="text-blue-500" />
                                        {t('moderation.unmute')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-dark-surface/30 rounded-xl p-12 text-center border border-gray-100 dark:border-dark-border shadow-inner">
                            <div className="w-16 h-16 bg-gray-200 dark:bg-dark-bg/50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <FiVolumeX size={32} />
                            </div>
                            <p className="text-gray-500 dark:text-dark-text-secondary max-w-sm mx-auto leading-relaxed">
                                {t('moderation.no_muted_accounts')}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmUnmute}
                title={t('profile.unmute')}
                message={t('moderation.unmute_confirm', { name: confirmModal.user?.displayName || confirmModal.user?.handle })}
                variant="primary"
            />
        </MainLayout>
    );
};

export default MutedAccountsPage;

