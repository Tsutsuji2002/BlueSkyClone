import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { initiateOAuth } from '../../services/oauthService';
import { clearError } from '../../redux/slices/authSlice';
import Button from '../../components/common/Button';
import { FiExternalLink, FiChevronLeft } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { isLoading, error } = useAppSelector((state) => state.auth);
    useDocumentTitle(t('auth.signup.title', 'Sign Up'));

    const [hostingProvider, setHostingProvider] = useState('https://bsky.social');
    const [waitingForSignup, setWaitingForSignup] = useState(false);
    const popupRef = useRef<Window | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const handleOAuthSignUp = async () => {
        try {
            await initiateOAuth(hostingProvider);
        } catch (err: any) {
            toast.error(err.message || 'Failed to start signup flow');
        }
    };

    const handleCreateAccount = () => {
        // Open bsky.app signup in a popup — avoids the COEP/hCaptcha issue in OAuth redirect
        const width = 480;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
            'https://bsky.app',
            'bsky_signup',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (!popup) {
            // Popup was blocked by browser
            toast.error('Popup blocked. Please allow popups for this site and try again.');
            return;
        }

        popupRef.current = popup;
        setWaitingForSignup(true);
        toast('Complete your signup in the popup window, then come back here.', { icon: '👋', duration: 6000 });

        // Poll for popup close, then auto-trigger OAuth
        pollRef.current = setInterval(() => {
            if (popup.closed) {
                clearInterval(pollRef.current!);
                setWaitingForSignup(false);
                toast.success('Welcome back! Connecting your account...');
                // Small delay to let the user read the toast
                setTimeout(() => handleOAuthSignUp(), 1500);
            }
        }, 800);
    };

    const renderOptions = () => {
        return (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-primary-500 mb-5 shadow-sm border border-blue-100 dark:border-blue-800/30">
                        <svg width="32" height="32" viewBox="0 0 320 286" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M69.364 19.146C89.18 34.226 110.67 64.89 120 80c9.33-15.11 30.82-45.774 50.636-60.854C184.73 8.95 214.372 0 240 0c44.183 0 80 35.817 80 80 0 21.796-8.698 41.556-22.798 56.002C276.002 157.254 227.107 192 160 192S43.998 157.254 22.798 136.002C8.698 121.556 0 101.796 0 80 0 35.817 35.817 0 80 0c25.628 0 55.27 8.95 69.364 19.146Z" />
                            <path d="M80 192c-17.673 0-32 14.327-32 32 0 35.817 35.817 64 80 64h64c44.183 0 80-28.183 80-64 0-17.673-14.327-32-32-32H80Z" />
                        </svg>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-dark-text tracking-tight">Get started with Bluesky</h3>
                    <p className="text-gray-500 dark:text-dark-text-secondary mt-2 text-sm leading-relaxed">
                        Your identity lives on the open Bluesky network.
                    </p>
                </div>

                {/* New account */}
                <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleCreateAccount}
                    loading={waitingForSignup}
                    className="h-14 font-black text-lg rounded-2xl shadow-xl shadow-primary-500/20 group overflow-hidden relative"
                >
                    <div className="relative z-10 flex items-center gap-3">
                        <span>{waitingForSignup ? 'Waiting for signup...' : 'Create new account'}</span>
                        {!waitingForSignup && <FiExternalLink className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>

                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">or</span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
                </div>

                {/* Existing account */}
                <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    onClick={handleOAuthSignUp}
                    loading={isLoading}
                    className="h-12 font-bold text-base rounded-2xl"
                >
                    Sign in with existing account
                </Button>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-dark-bg">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-700 p-12 flex-col justify-center text-white">
                <div className="max-w-md">
                    <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                        Start your journey on the open web.
                    </h1>
                    <p className="text-xl text-primary-100 mb-8 opacity-90">
                        Join millions of people sharing their ideas in a decentralized, user-first social network.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</div>
                            <span>Own your own data and identity</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</div>
                            <span>Customizable algorithms and feeds</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">✓</div>
                            <span>Connect across different platforms</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Step Form */}
            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="mb-10 text-center lg:text-left">
                        <button
                            onClick={() => navigate('/welcome')}
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-500 transition-colors mb-8 group font-bold"
                        >
                            <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                            <span>Go back</span>
                        </button>
                    </div>

                    <div className="space-y-8">
                        {renderOptions()}

                        <p className="text-center text-sm text-gray-500 dark:text-dark-text-secondary mt-10">
                            Already have an account?{' '}
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="font-black text-primary-500 hover:text-primary-600 transition-colors"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
