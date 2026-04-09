import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import Button from '../../components/common/Button';
import { FiChevronLeft, FiExternalLink } from 'react-icons/fi';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    useDocumentTitle(t('auth.signup.title', 'Sign Up'));

    const handleCreateAccount = () => {
        window.open('https://bsky.app', '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="min-h-screen flex bg-gray-50 dark:bg-dark-bg">
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-700 p-12 flex-col justify-center text-white">
                <div className="max-w-md">
                    <h1 className="text-5xl font-extrabold mb-6 leading-tight">
                        Start your journey on the open web.
                    </h1>
                    <p className="text-xl text-primary-100 mb-8 opacity-90">
                        Create your account on Bluesky, then come back here and sign in with the normal login form.
                    </p>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">1</div>
                            <span>Create an account on bsky.app</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">2</div>
                            <span>Return to this app after signup</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm">3</div>
                            <span>Use Sign In with your account credentials</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
                <div className="w-full max-w-md">
                    <div className="mb-10 text-center lg:text-left">
                        <button
                            onClick={() => navigate('/welcome')}
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-primary-500 transition-colors mb-8 group font-bold"
                        >
                            <FiChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                            <span>Go back</span>
                        </button>
                    </div>

                    <div className="space-y-6">
                        <div className="text-center mb-2">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-primary-500 mb-5 shadow-sm border border-blue-100 dark:border-blue-800/30">
                                <svg width="32" height="32" viewBox="0 0 320 286" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M69.364 19.146C89.18 34.226 110.67 64.89 120 80c9.33-15.11 30.82-45.774 50.636-60.854C184.73 8.95 214.372 0 240 0c44.183 0 80 35.817 80 80 0 21.796-8.698 41.556-22.798 56.002C276.002 157.254 227.107 192 160 192S43.998 157.254 22.798 136.002C8.698 121.556 0 101.796 0 80 0 35.817 35.817 0 80 0c25.628 0 55.27 8.95 69.364 19.146Z" />
                                    <path d="M80 192c-17.673 0-32 14.327-32 32 0 35.817 35.817 64 80 64h64c44.183 0 80-28.183 80-64 0-17.673-14.327-32-32-32H80Z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-dark-text tracking-tight">Create your Bluesky account</h3>
                            <p className="text-gray-500 dark:text-dark-text-secondary mt-2 text-sm leading-relaxed">
                                OAuth sign-in has been removed from this app for stability. Create your account on Bluesky first, then sign in here normally.
                            </p>
                        </div>

                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={handleCreateAccount}
                            className="h-14 font-black text-lg rounded-2xl shadow-xl shadow-primary-500/20 group overflow-hidden relative"
                        >
                            <div className="relative z-10 flex items-center gap-3">
                                <span>Create account on bsky.app</span>
                                <FiExternalLink className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-primary-400 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </Button>

                        <div className="rounded-2xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface p-4 text-left">
                            <p className="text-sm text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                                After you finish signup, return here and use the normal <span className="font-bold text-gray-900 dark:text-dark-text">Sign In</span> page.
                            </p>
                        </div>

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
