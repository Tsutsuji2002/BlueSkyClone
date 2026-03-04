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
import ChangeHandleModal from '../modals/ChangeHandleModal';

const VerificationSettingsPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const currentUser = useAppSelector((state: RootState) => state.auth.user);
    const [isVerifying, setIsVerifying] = useState(false);
    const [method, setMethod] = useState<'dns' | 'http'>('dns');
    const [isHandleModalOpen, setIsHandleModalOpen] = useState(false);

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
                    {/* Info Banner */}
                    <div className="bg-white dark:bg-dark-bg border border-blue-500/30 rounded-xl p-4 mb-6 flex gap-4">
                        <FiInfo className="text-blue-500 shrink-0 mt-0.5" size={20} />
                        <p className="text-[15px] text-gray-900 dark:text-dark-text leading-snug">
                            Verifications on Bluesky work differently than on other platforms. <a
                                href="https://bsky.social/about/blog/04-21-2025-verification"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 font-bold hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                Learn more here.
                            </a>
                        </p>
                    </div>

                    {/* Status Section */}
                    <div className="mb-8 p-6 bg-gray-50 dark:bg-dark-surface/30 rounded-2xl border border-gray-100 dark:border-dark-border">
                        <div className="flex items-center gap-4 mb-6">
                            <div className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center",
                                currentUser?.isVerified ? "bg-blue-100 dark:bg-blue-900/30 text-blue-500" : "bg-gray-200 dark:bg-dark-surface text-gray-400"
                            )}>
                                {currentUser?.isVerified ? <BsPatchCheckFill size={28} /> : <FiGlobe size={28} />}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text">
                                    {domain}
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-dark-text-secondary">
                                    {currentUser?.isVerified ? t('profile.verified_account') : t('moderation.verification_info')}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                className="text-blue-500 font-bold hover:bg-blue-50 dark:hover:bg-blue-900/10"
                                onClick={() => setIsHandleModalOpen(true)}
                            >
                                Change
                            </Button>
                        </div>

                        {currentUser?.isVerified && (
                            <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-500/20 rounded-xl p-4 flex gap-3 items-start">
                                <FiCheckCircle className="text-blue-500 mt-1" size={18} />
                                <p className="text-[14px] text-gray-600 dark:text-dark-text-secondary">
                                    Your domain <span className="font-bold text-gray-900 dark:text-dark-text">{domain}</span> is verified. This serves as your identity on the network.
                                </p>
                            </div>
                        )}
                    </div>

                    {!currentUser?.isVerified && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 dark:bg-dark-surface/20 rounded-2xl p-6 border border-gray-100 dark:border-dark-border">
                                <h3 className="text-[17px] font-bold dark:text-dark-text mb-4">How to verify</h3>
                                <p className="text-[15px] text-gray-600 dark:text-dark-text-secondary mb-6 leading-relaxed">
                                    To get verified, you need to use your own domain as your handle. You can either use a domain you already own or buy a new one.
                                </p>
                                <Button
                                    fullWidth
                                    size="lg"
                                    className="rounded-full py-4 text-[17px]"
                                    onClick={() => setIsHandleModalOpen(true)}
                                >
                                    I have my own domain
                                </Button>
                            </div>

                            <p className="text-center text-sm text-gray-500 dark:text-dark-text-secondary">
                                Looking for something else? <button className="text-blue-500 hover:underline font-bold">Contact support</button>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <ChangeHandleModal
                isOpen={isHandleModalOpen}
                onClose={() => setIsHandleModalOpen(false)}
            />
        </MainLayout>
    );
};

export default VerificationSettingsPage;
