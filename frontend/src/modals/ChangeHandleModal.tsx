import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiX, FiCopy, FiInfo, FiGlobe, FiFileText, FiLoader, FiChevronLeft, FiAtSign } from 'react-icons/fi';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { verifyDomain, updateUserAccount } from '../redux/slices/authSlice';
import { showToast } from '../redux/slices/toastSlice';
import Button from '../components/common/Button';
import { cn } from '../utils/classNames';
import agent from '../services/atpAgent';
import { updateUser } from '../redux/slices/authSlice';

interface ChangeHandleModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangeHandleModal: React.FC<ChangeHandleModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const currentUser = useAppSelector((state) => state.auth.user);

    const [mode, setMode] = useState<'selection' | 'custom' | 'default'>('default');
    const [handle, setHandle] = useState('');
    const [verifyMethod, setVerifyMethod] = useState<'dns' | 'http'>('dns');
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState(currentUser?.username || '');

    if (!isOpen) return null;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        dispatch(showToast({ message: `${label} copied!`, type: 'success' }));
    };

    const handleVerify = async () => {
        if (!handle.trim()) {
            dispatch(showToast({ message: 'Please enter a domain', type: 'error' }));
            return;
        }
        setIsLoading(true);
        try {
            await dispatch(verifyDomain(handle.trim())).unwrap();
            dispatch(showToast({ message: t('moderation.verification_success'), type: 'success' }));
            onClose();
        } catch (error: any) {
            dispatch(showToast({ message: error || 'Verification failed', type: 'error' }));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveDefault = async () => {
        if (!username.trim()) return;
        setIsLoading(true);
        try {
            const newHandle = `${username.trim().toLowerCase()}.bsky.social`;
            await (agent.com.atproto.identity as any).updateHandle({ handle: newHandle });
            dispatch(updateUser({ handle: newHandle, username: username.trim().toLowerCase() }));
            dispatch(showToast({ message: t('settings.username_updated_success'), type: 'success' }));
            onClose();
        } catch (error: any) {
            dispatch(showToast({ message: error.message || 'Failed to update handle', type: 'error' }));
        } finally {
            setIsLoading(false);
        }
    };

    const did = currentUser?.did || 'did:plc:placeholder';
    const currentHandle = currentUser?.handle || '';

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-dark-surface rounded-[20px] w-full max-w-[550px] overflow-hidden shadow-2xl border border-gray-100 dark:border-dark-border">
                {/* Header */}
                <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-dark-border">
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg rounded-full transition-colors text-blue-500 font-bold">
                        {t('settings.cancel')}
                    </button>
                    <h2 className="flex-1 text-center text-[19px] font-bold dark:text-dark-text">Change Handle</h2>
                    <div className="w-16" />
                </div>

                <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                    {mode === 'custom' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-2 uppercase tracking-tight">
                                    Enter the domain you want to use
                                </label>
                                <div className="flex items-center bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                                    <span className="text-gray-400 mr-2 text-lg">@</span>
                                    <input
                                        type="text"
                                        value={handle}
                                        onChange={(e) => setHandle(e.target.value)}
                                        placeholder="e.g. alice.com"
                                        className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text text-[17px] font-medium"
                                    />
                                </div>
                            </div>

                            {/* Method Selection Tabs */}
                            <div className="flex bg-gray-100 dark:bg-dark-bg p-1 rounded-xl">
                                <button
                                    onClick={() => setVerifyMethod('dns')}
                                    className={cn(
                                        "flex-1 py-1.5 text-[15px] font-bold rounded-lg transition-all",
                                        verifyMethod === 'dns' ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text shadow-sm" : "text-gray-500 dark:text-dark-text-secondary"
                                    )}
                                >
                                    DNS Panel
                                </button>
                                <button
                                    onClick={() => setVerifyMethod('http')}
                                    className={cn(
                                        "flex-1 py-1.5 text-[15px] font-bold rounded-lg transition-all",
                                        verifyMethod === 'http' ? "bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text shadow-sm" : "text-gray-500 dark:text-dark-text-secondary"
                                    )}
                                >
                                    No DNS Panel
                                </button>
                            </div>

                            {/* Verification Instructions */}
                            <div className="bg-blue-50/30 dark:bg-blue-900/10 border border-blue-500/20 rounded-2xl p-4 space-y-4">
                                {verifyMethod === 'dns' ? (
                                    <div className="space-y-4">
                                        <p className="text-[14px] font-bold text-gray-700 dark:text-dark-text mb-1">Add the following DNS record to your domain:</p>
                                        <div className="space-y-2">
                                            <div className="bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-3 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-[11px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase">Host:</p>
                                                    <p className="text-[15px] font-mono font-medium dark:text-dark-text">_atproto</p>
                                                </div>
                                                <button onClick={() => handleCopy('_atproto', 'Host')} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg">
                                                    <FiCopy className="text-gray-400" />
                                                </button>
                                            </div>
                                            <div className="bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-3 rounded-xl flex items-center justify-between">
                                                <div>
                                                    <p className="text-[11px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase">Type:</p>
                                                    <p className="text-[15px] font-medium dark:text-dark-text">TXT</p>
                                                </div>
                                            </div>
                                            <div className="bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-3 rounded-xl flex items-center justify-between">
                                                <div className="flex-1 min-w-0 mr-2">
                                                    <p className="text-[11px] font-bold text-gray-400 dark:text-dark-text-secondary uppercase">Value:</p>
                                                    <p className="text-[15px] font-mono font-medium dark:text-dark-text truncate">did={did}</p>
                                                </div>
                                                <button onClick={() => handleCopy(`did=${did}`, 'Value')} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg">
                                                    <FiCopy className="text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-gray-700 dark:text-dark-text mb-2">This should create a domain record at:</p>
                                            <div className="bg-gray-100 dark:bg-dark-bg rounded-xl p-3">
                                                <p className="text-[15px] font-mono text-gray-600 dark:text-dark-text-secondary">_atproto.{handle || 'yourdomain.com'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[14px] font-bold text-gray-700 dark:text-dark-text mb-2">Upload a text file to:</p>
                                                <div className="bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-3 rounded-xl flex items-center justify-between">
                                                    <p className="text-[15px] font-mono font-medium dark:text-dark-text flex-1 truncate">https://{handle || 'yourdomain.com'}/.well-known/atproto-did</p>
                                                    <button onClick={() => handleCopy(`https://${handle}/.well-known/atproto-did`, 'Path')} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg">
                                                        <FiCopy className="text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-gray-700 dark:text-dark-text mb-2">That contains the following:</p>
                                                <div className="bg-white dark:bg-dark-bg border border-gray-100 dark:border-dark-border p-3 rounded-xl flex items-center justify-between">
                                                    <p className="text-[15px] font-mono font-medium dark:text-dark-text flex-1 truncate">{did}</p>
                                                    <button onClick={() => handleCopy(did, 'Content')} className="p-2 hover:bg-gray-100 dark:hover:bg-dark-surface rounded-lg">
                                                        <FiCopy className="text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Warning/Info Box */}
                            <div className="bg-gray-50 dark:bg-dark-bg/50 border border-gray-200 dark:border-dark-border p-4 rounded-xl flex gap-3 items-start">
                                <FiInfo className="text-blue-500 mt-0.5" size={20} />
                                <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary leading-snug">
                                    Your current handle <span className="font-bold text-gray-900 dark:text-dark-text">@{currentHandle}</span> will automatically remain reserved for you. You can switch back to it at any time from this account.
                                </p>
                            </div>

                            <Button
                                fullWidth
                                size="lg"
                                onClick={handleVerify}
                                loading={isLoading}
                                className="rounded-full font-bold py-3.5 text-[17px]"
                            >
                                {verifyMethod === 'dns' ? 'Verify DNS Record' : 'Verify Text File'}
                            </Button>

                            <button
                                onClick={() => setMode('default')}
                                className="w-full text-center py-2 text-gray-600 dark:text-dark-text-secondary font-bold text-[15px] flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                            >
                                <FiChevronLeft /> I'll use a .bsky.social handle
                            </button>
                        </div>
                    )}

                    {mode === 'default' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-dark-text-secondary mb-2 uppercase tracking-tight">
                                    {t('settings.new_username_label')}
                                </label>
                                <div className="flex items-center bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                                    <span className="text-gray-400 mr-1 text-lg">@</span>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                        className="bg-transparent border-none focus:outline-none w-full text-gray-900 dark:text-dark-text font-medium text-[17px]"
                                    />
                                    <span className="text-gray-400 ml-1">.bsky.social</span>
                                </div>
                            </div>

                            <p className="text-[15px] text-gray-500 dark:text-dark-text-secondary leading-snug">
                                {t('settings.curr_username_label', { handle: currentHandle })}
                            </p>

                            <Button
                                fullWidth
                                size="lg"
                                onClick={handleSaveDefault}
                                loading={isLoading}
                                className="rounded-full font-bold py-3.5 text-[17px]"
                            >
                                {t('settings.save')}
                            </Button>

                            <button
                                onClick={() => setMode('custom')}
                                className="w-full text-center py-2 text-blue-500 font-bold text-[15px] flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                            >
                                I have my own domain
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChangeHandleModal;
