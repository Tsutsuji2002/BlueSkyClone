import React from 'react';
import ButterflyLoading from './ButterflyLoading';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-dark-bg transition-colors duration-300">
            <div className="relative">
                <ButterflyLoading size="xl" />
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
            </div>
            <p className="mt-8 text-lg font-medium text-gray-500 dark:text-dark-text-secondary animate-pulse">
                BlueSky is loading...
            </p>
        </div>
    );
};

export default LoadingScreen;
