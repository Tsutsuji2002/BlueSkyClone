import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { initiateOAuth } from '../../services/oauthService';
import { clearError } from '../../redux/slices/authSlice';
import Button from '../../components/common/Button';
import { FiExternalLink, FiChevronLeft, FiCheckCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const { isLoading, error } = useAppSelector((state) => state.auth);
    useDocumentTitle(t('auth.signup.title', 'Sign Up'));

    const [hostingProvider, setHostingProvider] = useState('https://bsky.social');

    const handleOAuthSignUp = async () => {
        try {
            await initiateOAuth(hostingProvider);
        } catch (err: any) {
            toast.error(err.message || 'Failed to start signup flow');
        }
    };

    const renderOptions = () => {
        return (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="text-center mb-2">
                    <h3 className="text-2xl font-black text-gray-900 dark:text-dark-text tracking-tight">Join Bluesky</h3>
                    <p className="text-gray-500 dark:text-dark-text-secondary mt-2 text-sm">
                        Your account lives securely on the Bluesky network.
                    </p>
                </div>

                {/* Option 1: New Users */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">1</div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-dark-text">New to Bluesky?</h4>
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Create your free account first</p>
                        </div>
                    </div>
                    <a
                        href="https://bsky.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                        Create account on Bluesky
                        <FiExternalLink size={14} />
                    </a>
                    <p className="text-xs text-gray-400 dark:text-dark-text-secondary mt-2 text-center">
                        Opens bsky.app — then come back here to sign in
                    </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Then</span>
                    <div className="h-px flex-1 bg-gray-200 dark:bg-dark-border" />
                </div>

                {/* Option 2: Already have account */}
                <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-9 h-9 rounded-xl bg-gray-200 dark:bg-dark-surface flex items-center justify-center text-gray-600 dark:text-dark-text font-black text-sm flex-shrink-0">2</div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-dark-text">Link your account</h4>
                            <p className="text-xs text-gray-500 dark:text-dark-text-secondary">Securely sign in with Bluesky OAuth</p>
                        </div>
                    </div>
                    <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        onClick={handleOAuthSignUp}
                        loading={isLoading}
                        className="h-14 font-black text-lg rounded-2xl shadow-lg shadow-primary-500/20 group overflow-hidden relative"
                    >
                        <div className="relative z-10 flex items-center gap-3">
                            <FiCheckCircle size={18} />
                            <span>Sign In with Bluesky</span>
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Button>
                </div>
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
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiCheckCircle size={18} /></div>
                            <span>Own your own data and identity</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiCheckCircle size={18} /></div>
                            <span>Customizable algorithms and feeds</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><FiCheckCircle size={18} /></div>
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
