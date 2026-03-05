import React from 'react';
import { cn } from '../../utils/classNames';

interface ButterflyLoadingProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const ButterflyLoading: React.FC<ButterflyLoadingProps> = ({ size = 'md', className }) => {
    const sizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-12 h-12',
        lg: 'w-24 h-24',
        xl: 'w-32 h-32'
    };

    return (
        <div className={cn("relative flex items-center justify-center", sizeClasses[size], className)}>
            <svg
                viewBox="0 0 64 64"
                className="w-full h-full text-primary-500 loading-butterfly"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ perspective: '1000px' }}
            >
                <defs>
                    <linearGradient id="loading-gradient" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="currentColor" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.8" />
                    </linearGradient>
                </defs>
                {/* Left Wing */}
                <path
                    className="butterfly-wing-left"
                    d="M16.892 13.717c-4.41 -3.197 -11.559 -5.672 -11.559 2.203c0 1.574 .934 13.208 1.483 15.096c1.9 6.568 8.347 7.333 14.516 6.317c-10.787 1.774 -13.037 8.555 -7.111 14.427c2.746 2.715 5.101 4.24 7.111 4.24c5.333 0 8.357 -7.384 9.333 -9.333l.435 -0.87V32c-2.413 -4.822 -8.991 -13.851 -15.106 -18.283z"
                    fill="url(#loading-gradient)"
                />
                {/* Right Wing */}
                <path
                    className="butterfly-wing-right"
                    d="M47.108 13.717c4.41 -3.197 11.559 -5.672 11.559 2.203c0 1.574 -.934 13.208 -1.483 15.096c-1.9 6.568 -8.347 7.333 -14.516 6.317c10.787 1.774 13.037 8.555 7.111 14.427c-2.746 2.715 -5.101 4.24 -7.111 4.24c-5.333 0 -8.357 -7.384 -9.333 -9.333l-.435 -0.87V32c2.413 -4.822 8.991 -13.851 15.106 -18.283z"
                    fill="url(#loading-gradient)"
                />
            </svg>
        </div>
    );
};

export default ButterflyLoading;
