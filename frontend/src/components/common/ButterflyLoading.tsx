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
            {/* Animated butterfly wings - CSS is in index.css */}
            <div className="butterfly-container">
                <div className="butterfly-wing butterfly-wing-left"></div>
                <div className="butterfly-wing butterfly-wing-right"></div>
                <div className="butterfly-body"></div>
            </div>
        </div>
    );
};

export default ButterflyLoading;
