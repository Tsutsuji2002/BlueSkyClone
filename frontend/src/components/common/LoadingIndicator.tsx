import React from 'react';
import ButterflyLoading from './ButterflyLoading';
import { cn } from '../../utils/classNames';

interface LoadingIndicatorProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    className?: string;
    center?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
    size = 'md',
    text,
    className,
    center = true
}) => {
    return (
        <div className={cn(
            "flex flex-col items-center gap-3",
            center && "justify-center py-12 w-full h-full",
            className
        )}>
            <ButterflyLoading size={size} />
            {text && (
                <span className="text-sm font-medium text-gray-500 dark:text-dark-text-secondary animate-pulse">
                    {text}
                </span>
            )}
        </div>
    );
};

export default LoadingIndicator;
