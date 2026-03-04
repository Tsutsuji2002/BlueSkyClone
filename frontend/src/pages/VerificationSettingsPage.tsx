import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useTranslation } from 'react-i18next';
import { FiArrowLeft, FiInfo, FiCheckCircle, FiCopy, FiFileText, FiGlobe, FiLoader } from 'react-icons/fi';
import { BsPatchCheckFill } from 'react-icons/bs';
import { cn } from '../utils/classNames';
import { useAppDispatch } from '../hooks/useAppDispatch';
import { useAppSelector } from '../hooks/useAppSelector';
import { RootState } from '../redux/store';
import { verifyDomain } from '../redux/slices/authSlice';
import { showToast } from '../redux/slices/toastSlice';
import Button from '../components/common/Button';

const VerificationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [isVerifying, setIsVerifying] = useState(false);
    const [method, setMethod] = useState<'dns' | 'http'>('dns');

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        dispatch(showToast({ message: `${label} copied!`, type: 'success' }));
    };

    const handleVerifySync = async () => {
        setIsVerifying(true);
        try {
            const result = await dispatch(verifyDomain()).unwrap();
            if (result) {
                dispatch(showToast({ message: t('moderation.verification_success'), type: 'success' }));
            } else {
                dispatch(showToast({ message: t('moderation.verification_failed'), type: 'error' }));
            }
        } catch (error: any) {
            dispatch(showToast({ message: error || t('moderation.verification_failed'), type: 'error' }));
        } finally {
            setIsVerifying(false);
        }
    };

    const did = currentUser?.did || 'did:plc:placeholder';
    const domain = currentUser?.handle || '';

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
                        {t('moderation.verification_title')}
                    </h1>
                </div>

                <div className="p-4 max-w-2xl mx-auto">
                    {/* Status Section */}
                    <div className="mb-8 p-6 bg-gray-50 dark:bg-dark-surface/30 rounded-2xl border border-gray-100 dark:border-dark-border">
                        <div className="flex items-center gap-4 mb-4">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                currentUser?.isVerified ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500" : "bg-gray-200 dark:bg-dark-surface text-gray-400"
                            )}>
                                {currentUser?.isVerified ? <BsPatchCheckFill size={28} /> : <FiGlobe size={28} />}
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                                    {domain}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                    {currentUser?.isVerified ? t('profile.verified_account') : t('moderation.verification_info')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {!currentUser?.isVerified && (
                        <>
                            {/* Method Tabs */}
                            <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-dark-surface p-1 rounded-xl">
                                <button
                                    onClick={() => setMethod('dns')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                                        method === 'dns'
                                            ? "bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text shadow-sm"
                                            : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-700"
                                    )}
                                >
                                    <FiGlobe size={18} />
                                    {t('moderation.verification_method_dns')}
                                </button>
                                <button
                                    onClick={() => setMethod('http')}
                                    className={cn(
                                        "flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2",
                                        method === 'http'
                                            ? "bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text shadow-sm"
                                            : "text-gray-500 dark:text-dark-text-secondary hover:text-gray-700"
                                    )}
                                >
                                    <FiFileText size={18} />
                                    {t('moderation.verification_method_http')}
                                </button>
                            </div>

                            {/* Instructions */}
                            <div className="space-y-6 mb-8">
                                {method === 'dns' ? (
                                    <div className="space-y-4">
                                        <p className="text-[15px] dark:text-dark-text">{t('moderation.verification_dns_instruction')}</p>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-gray-50 dark:bg-dark-surface/50 rounded-lg border border-gray-100 dark:border-dark-border">
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                                    {t('moderation.verification_dns_name')}
                                                </label>
                                                <div className="flex items-center justify-between">
                                                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">_atproto.{domain}</code>
                                                    <button onClick={() => handleCopy(`_atproto.${domain}`, 'Name')} className="p-1 hover:bg-gray-200 dark:hover:bg-dark-surface rounded">
                                                        <FiCopy size={16} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-dark-surface/50 rounded-lg border border-gray-100 dark:border-dark-border">
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                                    {t('moderation.verification_dns_value')}
                                                </label>
                                                <div className="flex items-center justify-between">
                                                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">{did}</code>
                                                    <button onClick={() => handleCopy(did, 'Value')} className="p-1 hover:bg-gray-200 dark:hover:bg-dark-surface rounded">
                                                        <FiCopy size={16} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-[15px] dark:text-dark-text">{t('moderation.verification_http_instruction')}</p>
                                        <div className="space-y-3">
                                            <div className="p-3 bg-gray-50 dark:bg-dark-surface/50 rounded-lg border border-gray-100 dark:border-dark-border">
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                                    {t('moderation.verification_http_path')}
                                                </label>
                                                <div className="flex items-center justify-between">
                                                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">https://{domain}/.well-known/atproto-did</code>
                                                    <button onClick={() => handleCopy(`https://${domain}/.well-known/atproto-did`, 'Path')} className="p-1 hover:bg-gray-200 dark:hover:bg-dark-surface rounded">
                                                        <FiCopy size={16} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-dark-surface/50 rounded-lg border border-gray-100 dark:border-dark-border">
                                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">
                                                    {t('moderation.verification_http_content')}
                                                </label>
                                                <div className="flex items-center justify-between">
                                                    <code className="text-sm font-mono text-blue-600 dark:text-blue-400">{did}</code>
                                                    <button onClick={() => handleCopy(did, 'Content')} className="p-1 hover:bg-gray-200 dark:hover:bg-dark-surface rounded">
                                                        <FiCopy size={16} className="text-gray-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleVerifySync}
                                disabled={isVerifying}
                                className="w-full py-4 rounded-2xl text-[17px] font-bold shadow-lg shadow-blue-500/20"
                            >
                                {isVerifying ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <FiLoader className="animate-spin" />
                                        <span>Verifying...</span>
                                    </div>
                                ) : (
                                    t('moderation.verification_verify_btn')
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};

export default VerificationSettingsPage;
