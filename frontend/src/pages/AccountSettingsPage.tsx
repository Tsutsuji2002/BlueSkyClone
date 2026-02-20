import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiChevronRight, FiMail, FiEdit2, FiLock, FiAtSign, FiGift, FiDownload, FiX, FiTrash2, FiAlertCircle, FiCheck, FiCalendar } from 'react-icons/fi';
import Button from '../components/common/Button';
import { updateUserAccount } from '../redux/slices/authSlice';
import { showToast } from '../redux/slices/toastSlice';

// Functional Modal Components for updating account settings
const UpdateEmailModal: React.FC<{ isOpen: boolean; onClose: () => void; email: string }> = ({ isOpen, onClose, email }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [newEmail, setNewEmail] = useState(email);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!password) {
            setError(t('settings.password_required'));
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await dispatch(updateUserAccount({ email: newEmail, currentPassword: password })).unwrap();
            onClose();
        } catch (err: any) {
            setError(err || 'Failed to update email');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('settings.update_email_title')}</h2>
                    <button onClick={onClose}><FiX size={24} className="text-gray-500" /></button>
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <p className="text-gray-500 dark:text-dark-text-secondary mb-4">{t('settings.update_email_desc')}</p>
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-2 border border-blue-500 rounded-xl px-4 py-3 bg-blue-50 dark:bg-blue-900/10">
                        <FiMail className="text-blue-500" />
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text"
                            placeholder={t('settings.new_email_placeholder')}
                        />
                    </div>
                    <div className="flex items-center gap-2 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3">
                        <FiLock className="text-gray-400" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text"
                            placeholder={t('settings.current_password_placeholder')}
                        />
                    </div>
                </div>
                <Button variant="primary" fullWidth onClick={handleSave} loading={isLoading}>
                    {t('settings.update_email_btn')}
                </Button>
            </div>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSave = async () => {
        if (newPassword !== confirmPassword) {
            setError(t('settings.passwords_dont_match'));
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await dispatch(updateUserAccount({
                currentPassword,
                newPassword
            })).unwrap();
            onClose();
        } catch (err: any) {
            setError(err || 'Failed to update password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('settings.change_password_title')}</h2>
                    <button onClick={onClose}><FiX size={24} className="text-gray-500" /></button>
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex flex-col gap-4 mb-6">
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder={t('settings.current_password')}
                        className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-gray-900 dark:text-dark-text focus:outline-none focus:border-primary-500"
                    />
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t('settings.new_password')}
                        className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-gray-900 dark:text-dark-text focus:outline-none focus:border-primary-500"
                    />
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder={t('settings.confirm_new_password')}
                        className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 text-gray-900 dark:text-dark-text focus:outline-none focus:border-primary-500"
                    />
                </div>
                <Button variant="primary" fullWidth onClick={handleSave} loading={isLoading}>
                    {t('settings.save')}
                </Button>
            </div>
        </div>
    );
};

const ChangeUsernameModal: React.FC<{ isOpen: boolean; onClose: () => void; username: string }> = ({ isOpen, onClose, username }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [newUsername, setNewUsername] = useState(username);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!newUsername.trim()) {
            setError(t('settings.handle_cannot_be_blank', 'Handle cannot be blank'));
            return;
        }

        if (newUsername.trim() === username.trim()) {
            dispatch(showToast({ message: t('settings.handle_same'), type: 'info' }));
            onClose();
            return;
        }

        setIsLoading(true);
        setError('');
        try {
            await dispatch(updateUserAccount({ username: newUsername })).unwrap();
            dispatch(showToast({ message: t('settings.username_updated_success'), type: 'success' }));
            onClose();
        } catch (err: any) {
            setError(err || 'Failed to update username');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={onClose} className="text-primary-500 font-medium">{t('settings.cancel')}</button>
                    <h2 className="text-lg font-bold dark:text-dark-text">{t('settings.change_username_title')}</h2>
                    <div className="w-8" />
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-2 uppercase text-xs tracking-wider">
                        {t('settings.new_username_label')}
                    </label>
                    <div className="flex items-center bg-gray-100 dark:bg-dark-bg rounded-lg px-4 py-3">
                        <span className="text-gray-500 mr-1">@</span>
                        <input
                            type="text"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text font-medium"
                        />
                        <span className="text-gray-400 ml-1">.bsky.social</span>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-dark-text-secondary mb-6">
                    {t('settings.curr_username_label', { handle: username })}
                </p>
                <Button variant="primary" fullWidth size="lg" onClick={handleSave} loading={isLoading}>{t('settings.save')}</Button>
            </div>
        </div>
    );
};

const EditBirthdateModal: React.FC<{ isOpen: boolean; onClose: () => void; birthdate?: string }> = ({ isOpen, onClose, birthdate }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [date, setDate] = useState(birthdate ? birthdate.split('T')[0] : '');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const today = new Date().toISOString().split('T')[0];

    if (!isOpen) return null;

    const handleSave = async () => {
        if (date && date > today) {
            setError(t('settings.birthdate_future_error', 'Birthday cannot be in the future'));
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await dispatch(updateUserAccount({ dateOfBirth: date || null })).unwrap();
            onClose();
        } catch (err: any) {
            setError(err || 'Failed to update birthdate');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('settings.my_birthdate')}</h2>
                    <button onClick={onClose}><FiX size={24} className="text-gray-500" /></button>
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <p className="text-gray-500 dark:text-dark-text-secondary mb-4">{t('settings.birthdate_private')}</p>
                <div className="flex items-center justify-between border border-blue-500 rounded-xl px-4 py-3 mb-6 bg-blue-50 dark:bg-blue-900/10">
                    <div className="flex items-center gap-3 w-full">
                        <FiCalendar className="text-blue-500" />
                        <input
                            type="date"
                            value={date}
                            max={today}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text font-medium"
                        />
                    </div>
                </div>
                <Button variant="primary" fullWidth onClick={handleSave} loading={isLoading}>{t('settings.done')}</Button>
            </div>
        </div>
    );
};

const ExportDataModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-dark-text">{t('settings.export_data_title')}</h2>
                    <button onClick={onClose}><FiX size={24} className="text-gray-500" /></button>
                </div>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-6 text-[15px] leading-relaxed">
                    {t('settings.export_data_desc')}
                </p>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6 flex items-start gap-3">
                    <FiAlertCircle className="text-blue-500 mt-0.5 shrink-0" size={20} />
                    <p className="text-sm text-blue-700 dark:text-blue-300">{t('settings.car_note')}</p>
                </div>
                <Button variant="primary" fullWidth size="lg" onClick={onClose}>
                    {t('settings.download_car')}
                </Button>
            </div>
        </div>
    );
};

const DeactivateAccountModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6">
                <h2 className="text-2xl font-bold dark:text-dark-text mb-4">{t('settings.deactivate_account_title')}</h2>
                <p className="text-gray-600 dark:text-dark-text-secondary mb-4 text-[15px] leading-relaxed">
                    {t('settings.deactivate_account_desc')}
                </p>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl mb-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.deactivate_info')}</p>
                </div>
                <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={onClose} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        {t('settings.cancel')}
                    </Button>
                    <Button variant="primary" onClick={onClose} className="bg-red-500 hover:bg-red-600 text-white border-none">
                        {t('settings.deactivate_btn')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const DeleteAccountModal: React.FC<{ isOpen: boolean; onClose: () => void; username: string }> = ({ isOpen, onClose, username }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-8 text-center">
                <h2 className="text-2xl font-bold dark:text-dark-text mb-1">{t('settings.delete_account_title')}</h2>
                <p className="text-lg font-bold text-gray-900 dark:text-dark-text mb-4">"{username}.bsky.social"</p>

                <p className="text-gray-600 dark:text-dark-text-secondary mb-8 text-[15px]">
                    {t('settings.delete_account_desc')}
                </p>

                <div className="flex flex-col gap-3">
                    <Button variant="primary" fullWidth size="lg" onClick={onClose} className="bg-blue-500 hover:bg-blue-600 text-white">
                        {t('settings.send_email')}
                    </Button>
                    <button onClick={onClose} className="text-gray-500 dark:text-gray-400 font-medium py-2 hover:underline">
                        {t('settings.cancel')}
                    </button>
                </div>

                <div className="mt-6 flex items-start gap-2 justify-center text-left max-w-xs mx-auto">
                    <FiAlertCircle className="text-blue-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('settings.delete_account_info')}
                    </p>
                </div>
            </div>
        </div>
    );
};

const AccountSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const user = useAppSelector((state) => state.auth.user);

    const [activeModal, setActiveModal] = useState<'email' | 'password' | 'username' | 'birthdate' | 'export' | 'deactivate' | 'delete' | null>(null);

    const closeModal = () => setActiveModal(null);

    return (
        <MainLayout>
            <div className="min-h-screen bg-white dark:bg-dark-bg border-r border-gray-200 dark:border-dark-border">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-white/95 dark:bg-dark-bg/95 backdrop-blur-md border-b border-gray-200 dark:border-dark-border px-4 py-3 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-full transition-colors"
                    >
                        <FiArrowLeft size={20} className="dark:text-dark-text" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text">
                        {t('settings.account')}
                    </h1>
                </div>

                {/* Content */}
                <div className="flex flex-col">
                    {/* Access / Security Group */}
                    <div className="py-2">
                        <button
                            onClick={() => setActiveModal('email')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4">
                                <FiMail size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <div className="flex flex-col items-start">
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('settings.email')}</span>
                                    <span className="text-sm text-gray-500 dark:text-dark-text-secondary">{user?.email}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <FiCheck className="text-blue-500" />
                            </div>
                        </button>

                        <button
                            onClick={() => setActiveModal('email')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4">
                                <FiEdit2 size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('settings.update_email')}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>

                        <button
                            onClick={() => setActiveModal('password')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4">
                                <FiLock size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('settings.password')}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>

                        <button
                            onClick={() => setActiveModal('username')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4">
                                <FiAtSign size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('settings.change_username')}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>

                        <button
                            onClick={() => setActiveModal('birthdate')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                        >
                            <div className="flex items-center gap-4 text-left">
                                <FiGift size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <div className="flex flex-col items-start">
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('settings.birthdate')}</span>
                                    <span className="text-sm text-blue-500 hover:underline">
                                        {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : t('settings.not_set')}
                                    </span>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* Data / Danger Zone */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                        <button
                            onClick={() => setActiveModal('export')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <FiDownload size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('settings.export_data')}</span>
                            </div>
                            <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                        </button>

                        <button
                            onClick={() => setActiveModal('deactivate')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <FiAlertCircle size={22} className="text-red-500 group-hover:text-red-600" />
                                <span className="text-[15px] font-medium text-red-500 group-hover:text-red-600">{t('settings.deactivate_account')}</span>
                            </div>
                            <FiChevronRight className="text-red-200 group-hover:text-red-300" />
                        </button>

                        <button
                            onClick={() => setActiveModal('delete')}
                            className="w-full flex items-center justify-between px-4 py-4 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group"
                        >
                            <div className="flex items-center gap-4">
                                <FiTrash2 size={22} className="text-red-500 group-hover:text-red-600" />
                                <span className="text-[15px] font-medium text-red-500 group-hover:text-red-600">{t('settings.delete_account')}</span>
                            </div>
                            <FiChevronRight className="text-red-200 group-hover:text-red-300" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <UpdateEmailModal isOpen={activeModal === 'email'} onClose={closeModal} email={user?.email || ''} />
            <ChangePasswordModal isOpen={activeModal === 'password'} onClose={closeModal} />
            <ChangeUsernameModal isOpen={activeModal === 'username'} onClose={closeModal} username={user?.username || ''} />
            <EditBirthdateModal isOpen={activeModal === 'birthdate'} onClose={closeModal} birthdate={user?.dateOfBirth} />
            <ExportDataModal isOpen={activeModal === 'export'} onClose={closeModal} />
            <DeactivateAccountModal isOpen={activeModal === 'deactivate'} onClose={closeModal} />
            <DeleteAccountModal isOpen={activeModal === 'delete'} onClose={closeModal} username={user?.username || 'user'} />
        </MainLayout>
    );
};

export default AccountSettingsPage;
