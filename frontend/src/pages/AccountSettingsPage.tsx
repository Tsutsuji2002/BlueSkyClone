import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../hooks/useAppSelector';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiChevronRight, FiMail, FiEdit2, FiLock, FiAtSign, FiGift, FiDownload, FiX, FiTrash2, FiAlertCircle, FiCheck, FiCalendar } from 'react-icons/fi';
import Button from '../components/common/Button';
import { updateUserAccount, updateUser, verifyDomain } from '../redux/slices/authSlice';
import { showToast } from '../redux/slices/toastSlice';
import ChangeHandleModal from '../modals/ChangeHandleModal';
import agent, { SERVICE_URL } from '../services/atpAgent';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Functional Modal Components for updating account settings
const UpdateEmailModal: React.FC<{ isOpen: boolean; onClose: () => void; email: string }> = ({ isOpen, onClose, email }) => {
    const { t } = useTranslation();
    const [newEmail, setNewEmail] = useState(email);
    const [token, setToken] = useState('');
    const [isTokenSent, setIsTokenSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleRequestUpdate = async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await (agent.com.atproto.server as any).requestEmailUpdate();
            if (response.data.tokenRequired) {
                setIsTokenSent(true);
            } else {
                // If token not required by PDS, we can try direct update path
                await (agent.com.atproto.server as any).updateEmail({ email: newEmail });
                onClose();
            }
        } catch (err: any) {
            setError(err.message || 'Failed to request email update');
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmUpdate = async () => {
        if (!token && isTokenSent) {
            setError(t('settings.token_required', 'Verification token is required'));
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            await (agent.com.atproto.server as any).updateEmail({ 
                email: newEmail, 
                token: token || undefined 
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update email');
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
                <p className="text-gray-500 dark:text-dark-text-secondary mb-4">
                    {isTokenSent ? t('settings.enter_email_token', 'Enter the token sent to your current email') : t('settings.update_email_desc')}
                </p>
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center gap-2 border border-blue-500 rounded-xl px-4 py-3 bg-blue-50 dark:bg-blue-900/10">
                        <FiMail className="text-blue-500" />
                        <input
                            type="email"
                            value={newEmail}
                            disabled={isTokenSent}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text disabled:opacity-50"
                            placeholder={t('settings.new_email_placeholder')}
                        />
                    </div>
                    {isTokenSent && (
                        <div className="flex items-center gap-2 border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3">
                            <FiLock className="text-gray-400" />
                            <input
                                type="text"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text"
                                placeholder={t('settings.verification_token', 'Verification Token')}
                            />
                        </div>
                    )}
                </div>
                <Button 
                    variant="primary" 
                    fullWidth 
                    onClick={isTokenSent ? handleConfirmUpdate : handleRequestUpdate} 
                    loading={isLoading}
                >
                    {isTokenSent ? t('settings.confirm_update', 'Confirm Update') : t('settings.update_email_btn')}
                </Button>
            </div>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
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
            await (agent.com.atproto.server as any).updatePassword({
                password: newPassword
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
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

const ExportDataModal: React.FC<{ isOpen: boolean; onClose: () => void; did?: string }> = ({ isOpen, onClose, did }) => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleDownload = () => {
        if (!did) return;
        setIsLoading(true);

        try {
            const downloadUrl = `${SERVICE_URL}/xrpc/com.atproto.sync.getRepo?did=${encodeURIComponent(did)}`;
            
            // Use a temporary link to trigger download (cleaner than window.location)
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `${did}.car`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Give browser time to start download
            setTimeout(() => {
                setIsLoading(false);
                onClose();
            }, 1500);
        } catch (error) {
            console.error('Download failed', error);
            setIsLoading(false);
        }
    };

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
                <Button variant="primary" fullWidth size="lg" onClick={handleDownload} loading={isLoading}>
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
    const dispatch = useAppDispatch();
    const user = useAppSelector((state) => state.auth.user);
    const [accountInfo, setAccountInfo] = useState<{ email?: string; handle?: string; did?: string } | null>(null);
    const [isLoadingAccount, setIsLoadingAccount] = useState(true);

    const [activeModal, setActiveModal] = useState<'email' | 'password' | 'handle' | 'birthdate' | 'export' | 'deactivate' | 'delete' | null>(null);

    const closeModal = () => {
        setActiveModal(null);
        // Refresh account info after potential updates
        fetchAccountInfo();
    };

    const fetchAccountInfo = async () => {
        try {
            const response = await (agent.com.atproto.server as any).getAccount();
            if (response.success) {
                setAccountInfo(response.data);
                // Also sync email back to Redux if it's different (optional but helps consistency)
                if (response.data.email !== user?.email) {
                    dispatch(updateUser({ email: response.data.email }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch account info', error);
        } finally {
            setIsLoadingAccount(false);
        }
    };

    React.useEffect(() => {
        fetchAccountInfo();
    }, []);

    const isRemoteUser = React.useMemo(() => {
        if (!user?.did) return false;
        // Basic heuristic: if DID is not did:local and doesn't contain our domain, it's likely remote
        // For BSkyClone, we assume local users have did:local:... or a specific domain.
        // If it's did:plc:... it might be a migrated user or a remote one.
        // However, a stronger check is if the agent service URL matches the PDS of the DID.
        // For now, let's look for 'did:local' as the 'native' indicator.
        return user.did.startsWith('did:plc') && !user.email?.includes('bskyclone');
    }, [user?.did, user?.email]);

    useDocumentTitle(t('settings.account'));

    return (
        <>
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
                    {!isRemoteUser && (
                        <div className="py-2">
                            <button
                                onClick={() => setActiveModal('email')}
                                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                            >
                                <div className="flex items-center gap-4">
                                    <FiMail size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                    <div className="flex flex-col items-start">
                                        <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">{t('settings.email')}</span>
                                        <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                            {isLoadingAccount ? '...' : (accountInfo?.email || user?.email)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {user?.isVerified && <FiCheck className="text-blue-500" />}
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
                                onClick={() => setActiveModal('handle')}
                                className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                            >
                                <div className="flex items-center gap-4">
                                    <FiAtSign size={22} className="text-gray-900 dark:text-dark-text opacity-80" />
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-dark-text">Change Handle</span>
                                </div>
                                <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                            </button>
                        </div>
                    )}

                    <div className="py-2">
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

                        {!isRemoteUser && (
                            <>
                                <button
                                    onClick={() => setActiveModal('deactivate')}
                                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors border-b border-gray-100 dark:border-dark-border/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <FiAlertCircle size={22} className="text-red-500" />
                                        <span className="text-[15px] font-medium text-red-500">{t('settings.deactivate_account')}</span>
                                    </div>
                                    <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                                </button>

                                <button
                                    onClick={() => setActiveModal('delete')}
                                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 dark:hover:bg-dark-surface/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <FiTrash2 size={22} className="text-red-500" />
                                        <span className="text-[15px] font-medium text-red-500">{t('settings.delete_account')}</span>
                                    </div>
                                    <FiChevronRight className="text-gray-300 dark:text-dark-text-secondary" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <UpdateEmailModal isOpen={activeModal === 'email'} onClose={closeModal} email={accountInfo?.email || user?.email || ''} />
            <ChangePasswordModal isOpen={activeModal === 'password'} onClose={closeModal} />
            <ChangeHandleModal isOpen={activeModal === 'handle'} onClose={closeModal} />
            <EditBirthdateModal isOpen={activeModal === 'birthdate'} onClose={closeModal} birthdate={user?.dateOfBirth} />
            <ExportDataModal isOpen={activeModal === 'export'} onClose={closeModal} did={user?.did} />
            <DeactivateAccountModal isOpen={activeModal === 'deactivate'} onClose={closeModal} />
            <DeleteAccountModal isOpen={activeModal === 'delete'} onClose={closeModal} username={user?.username || 'user'} />
        </>
    );
};

export default AccountSettingsPage;
