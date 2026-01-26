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
                className="w-full h-full text-primary-500"
                fill="currentColor"
                style={{ perspective: '1000px' }}
            >
                {/* Left Wing */}
                <path
                    className="butterfly-wing-left"
                    d="M13.873 3.805C21.21 9.332 29.103 20.537 32 26.55v15.882c0-.338-.13.044-.41.867-1.512 4.456-7.418 21.847-20.923 7.944-7.111-7.32-3.819-14.64 9.125-16.85-7.405 1.264-15.73-.825-18.014-9.015C1.12 23.022 0 8.51 0 6.55 0-3.268 8.579-.182 13.873 3.805z"
                />
                {/* Right Wing */}
                <path
                    className="butterfly-wing-right"
                    d="M50.127 3.805C42.79 9.332 34.897 20.537 32 26.55v15.882c0-.338.13.044.41.867 1.512 4.456 7.418 21.847 20.923 7.944 7.111-7.32 3.819-14.64-9.125-16.85 7.405 1.264 15.73-.825 18.014-9.015C62.88 23.022 64 8.51 64 6.55c0-9.818-8.579-6.732-13.873-2.745z"
                />
            </svg>
        </div>
    );
};

export default ButterflyLoading;
