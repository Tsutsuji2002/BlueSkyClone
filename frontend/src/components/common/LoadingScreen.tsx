import React from 'react';
import ButterflyLoading from './ButterflyLoading';

interface LoadingScreenProps {
    message?: string;
    error?: boolean;
    sessionExpired?: boolean;
    onRetry?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
    message = 'BlueSky is loading...', 
    error = false,
    sessionExpired = false,
    onRetry 
}) => {
    // Session expired — distinct from a generic network error
    if (sessionExpired) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-dark-bg transition-colors duration-300">
                <div className="text-center max-w-md px-6">
                    <div className="mb-6">
                        <svg className="w-16 h-16 mx-auto text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-3">
                        Session Expired
                    </h2>

                    <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
                        Your session has expired. Please sign in again to continue.
                    </p>

                    <div className="flex flex-col items-center gap-3">
                        <a
                            href="/login"
                            className="w-full max-w-xs px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full transition-colors text-center"
                        >
                            Sign In
                        </a>
                        <a
                            href="/"
                            className="text-sm text-gray-500 dark:text-dark-text-secondary hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                        >
                            Continue as guest
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-dark-bg transition-colors duration-300">
                <div className="text-center max-w-md px-6">
                    {/* Error icon */}
                    <div className="mb-6">
                        <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-3">
                        Connection Timeout
                    </h2>
                    
                    <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                        We're having trouble connecting to the server. This might be due to a slow network connection or server issues.
                    </p>
                    
                    {onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-full transition-colors inline-flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry Connection
                        </button>
                    )}
                    
                    <p className="mt-4 text-sm text-gray-500 dark:text-dark-text-secondary">
                        If the problem persists, try refreshing the page
                    </p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-dark-bg transition-colors duration-300">
            <div className="relative">
                <ButterflyLoading size="xl" />
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
            </div>
            <p className="mt-8 text-lg font-medium text-gray-500 dark:text-dark-text-secondary animate-pulse">
                {message}
            </p>
        </div>
    );
};

export default LoadingScreen;



