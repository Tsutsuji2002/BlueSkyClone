import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { useTranslation } from 'react-i18next';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    useDocumentTitle(t('auth.signup.title', 'Sign Up'));

    const handleCreateAccount = () => {
        window.open('https://bsky.app', '_blank', 'noopener,noreferrer');
    };

    const handleLoginRedirect = () => {
        navigate('/login');
    };

    const handleBack = () => {
        navigate('/welcome');
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-500 to-primary-700 p-12 flex-col justify-center">
                <div className="max-w-md">
                    <h1 className="text-5xl font-bold text-white mb-4">
                        Join the Global Network
                    </h1>
                    <p className="text-xl text-primary-100">
                        Connect with millions of users on the official AT Protocol.
                    </p>
                </div>
            </div>

            {/* Right Side - Signup Redirect Message */}
            <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-dark-bg">
                <div className="w-full max-w-md text-center">
                    
                    <div className="mb-8 flex justify-center">
                        <div className="h-20 w-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-primary-500">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-4">
                        Security Notice
                    </h2>
                    
                    <p className="text-gray-600 dark:text-dark-text-secondary mb-8 text-lg leading-relaxed text-left">
                        To protect the network from bots, Bluesky strictly requires all new accounts to complete a CAPTCHA and SMS verification on their official app.
                    </p>

                    <div className="bg-gray-50 dark:bg-dark-surface p-6 rounded-xl border border-gray-200 dark:border-dark-border mb-8 text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-dark-text mb-2">How to join:</h3>
                        <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-dark-text-secondary">
                            <li>Create your account on the official <strong>Bluesky</strong> app.</li>
                            <li>Go to Settings &gt; App Passwords.</li>
                            <li>Generate a new App Password.</li>
                            <li>Return here and log in!</li>
                        </ol>
                    </div>

                    <div className="flex flex-col gap-4">
                        <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            onClick={handleCreateAccount}
                        >
                            Create Account on Bluesky.app
                        </Button>

                        <Button
                            variant="outline"
                            size="lg"
                            fullWidth
                            onClick={handleLoginRedirect}
                        >
                            I already have an account (Log In)
                        </Button>

                        <div className="mt-4">
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                            >
                                Back to Welcome
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
